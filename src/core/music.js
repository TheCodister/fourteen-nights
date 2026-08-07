/* Procedural score.

   A 16-step sequencer in D minor, scheduled ahead of the clock rather than off
   setInterval directly: the timer only decides *when to queue*, while every note
   is stamped with an exact AudioContext time. Timer jitter therefore cannot make
   the groove wobble, which it would if notes were played the moment the interval
   fired.

   Two moods. `menu` is slow and hollow — pad, sparse bass, no drums. `night` adds
   a driving kick, hats and an arpeggio. Patterns are strings, one character per
   sixteenth: a digit indexes the track's note list, `-` is a rest. */
import { musicTarget, isMusicOn } from './audio.js';

/** Semitone offsets from the root, per scale degree used below. */
const ROOT = 146.83; // D3
const semitone = (n) => ROOT * Math.pow(2, n / 12);

/* Dm — Bb — F — C, the standard four chords for something grim that still moves. */
const PROGRESSION = [0, -4, 3, -2];

const SONGS = {
  menu: {
    bpm: 82,
    swing: 0.02,
    tracks: {
      bass: { pattern: '0-------0---0---', gain: 0.3 },
      pad: { pattern: '0---------------', gain: 0.14 },
      arp: { pattern: '--0-2---4---2-0-', gain: 0.09, octave: 2 },
      kick: { pattern: '----------------', gain: 0 },
      hat: { pattern: '----------------', gain: 0 }
    }
  },
  night: {
    bpm: 104,
    swing: 0.01,
    tracks: {
      bass: { pattern: '0-0-0---0-0-0-0-', gain: 0.34 },
      pad: { pattern: '0-------0-------', gain: 0.1 },
      arp: { pattern: '0-2-4-2-0-4-2-4-', gain: 0.07, octave: 2 },
      kick: { pattern: '0---0---0---0-0-', gain: 0.5 },
      hat: { pattern: '--0---0---0---0-', gain: 0.12 }
    }
  }
};

/** Scale degrees the arpeggio walks, in semitones from the chord root. */
const ARP_STEPS = [0, 3, 7, 10, 12];

let timer = null;
let stepIndex = 0;
let nextTime = 0;
let current = null;

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

/** Starts or switches the score. Safe to call when audio is unavailable. */
export function playMusic(mood) {
  const song = SONGS[mood];
  if (!song) return;
  const target = musicTarget();
  if (!target) return;

  if (current === mood && timer) return;
  stopMusic();
  current = mood;
  stepIndex = 0;
  nextTime = target.ctx.currentTime + 0.08;
  timer = setInterval(() => schedule(target, song), TICK_MS);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  current = null;
}

export function currentMood() {
  return current;
}

function schedule(target, song) {
  const { ctx } = target;

  /* Muted or suspended: keep the cursor pinned to now.

     Both cases have to re-anchor, not just return. `nextTime` is the sequencer's
     write cursor, and if it is left behind while nothing is playing, the first
     live tick tries to replay the entire silent gap — one node per missed step,
     measured at 258 nodes and a dropped frame after twenty seconds muted, and
     growing linearly from there. They are inaudible (their envelopes expired in
     the past) but the allocation burst is real. */
  if (!isMusicOn() || ctx.state !== 'running') {
    nextTime = ctx.currentTime + 0.08;
    return;
  }

  /* Same guard for any other stall. A backgrounded tab throttles this timer to
     once a second or worse while the audio clock keeps running, so skip whatever
     gap opened up rather than replaying it. */
  if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.02;

  const stepLength = 60 / song.bpm / 4;

  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const bar = Math.floor(stepIndex / 16) % PROGRESSION.length;
    const chordRoot = PROGRESSION[bar];
    const slot = stepIndex % 16;
    // Offbeat sixteenths land fractionally late, which is what stops a
    // step sequence sounding like a metronome.
    const swing = slot % 2 ? song.swing : 0;
    emitStep(target, song, slot, chordRoot, nextTime + swing, stepLength);

    stepIndex++;
    nextTime += stepLength;
  }
}

function emitStep(target, song, slot, chordRoot, when, stepLength) {
  for (const [name, track] of Object.entries(song.tracks)) {
    const symbol = track.pattern[slot];
    if (symbol === '-' || !track.gain) continue;
    const degree = Number(symbol) || 0;
    voice(target, name, track, degree, chordRoot, when, stepLength);
  }
}

function voice(target, name, track, degree, chordRoot, when, stepLength) {
  const { ctx, bus } = target;

  if (name === 'kick') return drum(ctx, bus, when, track.gain, 'kick');
  if (name === 'hat') return drum(ctx, bus, when, track.gain, 'hat');

  const octave = track.octave || 0;
  const offset = name === 'arp' ? ARP_STEPS[degree % ARP_STEPS.length] : 0;
  const freq = semitone(chordRoot + offset + octave * 12) / (name === 'bass' ? 2 : 1);

  const gain = ctx.createGain();
  const attack = name === 'pad' ? 0.5 : 0.008;
  const hold = name === 'pad' ? stepLength * 14 : stepLength * (name === 'bass' ? 3 : 1.6);

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(track.gain, when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = name === 'bass' ? 420 : name === 'pad' ? 900 : 2200;
  filter.Q.value = name === 'bass' ? 6 : 1;
  gain.connect(filter).connect(bus);

  // Two slightly detuned oscillators give the pad and bass some width.
  const shapes = name === 'pad' ? ['sawtooth', 'sawtooth'] : [name === 'bass' ? 'sawtooth' : 'triangle'];
  shapes.forEach((wave, index) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    if (index) osc.detune.value = 9;
    osc.connect(gain);
    osc.start(when);
    osc.stop(when + attack + hold + 0.05);
  });
}

function drum(ctx, bus, when, level, kind) {
  const gain = ctx.createGain();
  gain.connect(bus);

  if (kind === 'kick') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.12);
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    osc.connect(gain);
    osc.start(when);
    osc.stop(when + 0.18);
    return;
  }

  // Hat: a very short burst of high-passed noise, built inline to stay cheap.
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  gain.gain.setValueAtTime(level, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  source.connect(filter).connect(gain);
  source.start(when);
  source.stop(when + 0.06);
}
