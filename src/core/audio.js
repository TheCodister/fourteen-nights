/* Procedural audio engine.

   Everything is synthesised at runtime — no audio files, so the project keeps
   its no-build-step, no-dependency, no-binary-assets shape and every sound is a
   tunable recipe in data/sounds.js rather than a fixed clip.

   Signal path:  voices ---> sfx bus ----\
                                          >-- compressor -> destination
                 sequencer -> music bus -/

   The compressor matters: a Nightmare night can fire a dozen overlapping shots,
   kills and groans in the same frame, and without it they sum straight into
   clipping. A voice cap and a per-cue throttle keep that load bounded. */
import { W } from '../config.js';

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noiseBuffer = null;

let sfxOn = true;
let musicOn = true;

/** Concurrent one-shot voices. Beyond this, new cues are dropped. */
const MAX_VOICES = 22;
let voices = 0;
/** Last start time per cue key, so a repeated cue cannot machine-gun itself. */
const lastPlayed = new Map();

export function audioAvailable() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

export function isSfxOn() {
  return sfxOn;
}

export function isMusicOn() {
  return musicOn;
}

export function toggleSfx() {
  sfxOn = !sfxOn;
  if (sfxOn) unlock();
  return sfxOn;
}

export function toggleMusic() {
  musicOn = !musicOn;
  if (musicOn) unlock();
  if (musicBus) musicBus.gain.value = musicOn ? 0.5 : 0;
  return musicOn;
}

/* Browsers refuse to start an AudioContext outside a user gesture, so the graph
   is built on the first click and resumed on every later one. */
export function unlock() {
  const context = ensureContext();
  if (context && context.state === 'suspended') context.resume();
  return context;
}

function ensureContext() {
  if (ctx) return ctx;
  if (!audioAvailable()) return null;

  const Ctor = window.AudioContext || window.webkitAudioContext;
  ctx = new Ctor();

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 24;
  compressor.ratio.value = 9;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.2;

  master = ctx.createGain();
  master.gain.value = 0.9;
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.85;
  musicBus = ctx.createGain();
  musicBus.gain.value = musicOn ? 0.5 : 0;

  sfxBus.connect(master);
  musicBus.connect(master);
  master.connect(compressor).connect(ctx.destination);

  // One second of white noise, reused by every noise layer at a random offset.
  const frames = ctx.sampleRate;
  noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  return ctx;
}

/** The music sequencer needs the raw context and its own bus. */
export function musicTarget() {
  const context = ensureContext();
  return context ? { ctx: context, bus: musicBus } : null;
}

/** World x to a gentle stereo position, so the horde spreads across the field. */
export function panFor(x) {
  if (typeof x !== 'number') return 0;
  return Math.max(-1, Math.min(1, (x / W) * 2 - 1)) * 0.7;
}

/**
 * Plays a layered sound recipe. See data/sounds.js for the shape.
 * @param {object} spec
 * @param {{pan?:number, gain?:number, rate?:number, key?:string, throttle?:number}} [opts]
 */
export function playSound(spec, opts = {}) {
  if (!sfxOn || !spec) return;
  const context = ensureContext();
  if (!context || context.state === 'suspended') return;

  // Drop repeats of the same cue inside its throttle window, and hard-cap voices.
  const now = context.currentTime;
  if (opts.key) {
    const throttle = opts.throttle ?? 0.045;
    if (now - (lastPlayed.get(opts.key) || -1) < throttle) return;
    lastPlayed.set(opts.key, now);
  }
  if (voices >= MAX_VOICES) return;

  const rate = opts.rate || 1;
  const out = context.createGain();
  out.gain.value = (spec.gain ?? 1) * (opts.gain ?? 1);

  let tail = out;
  if (context.createStereoPanner) {
    const panner = context.createStereoPanner();
    panner.pan.value = opts.pan ?? 0;
    out.connect(panner);
    tail = panner;
  }
  tail.connect(sfxBus);

  let longest = 0;
  for (const layer of spec.layers) {
    longest = Math.max(longest, buildLayer(context, out, layer, now, rate));
  }

  voices++;
  // One timer per sound rather than per node; the nodes free themselves on stop.
  setTimeout(() => {
    voices--;
    out.disconnect();
  }, (longest + 0.1) * 1000);
}

/** @returns {number} when this layer finishes, in seconds from `start`. */
function buildLayer(context, destination, layer, start, rate) {
  const at = start + (layer.delay || 0);
  const attack = layer.attack ?? 0.002;
  const decay = layer.decay ?? 0.12;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(layer.gain ?? 0.3, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);

  let node = gain;
  if (layer.filter) {
    const filter = context.createBiquadFilter();
    filter.type = layer.filter;
    filter.frequency.setValueAtTime(layer.cutoff ?? 1000, at);
    if (layer.cutoffTo) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, layer.cutoffTo), at + attack + decay);
    }
    filter.Q.value = layer.q ?? 1;
    gain.connect(filter);
    node = filter;
  }
  node.connect(destination);

  let source;
  if (layer.src === 'noise') {
    source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    // A random window into the shared buffer keeps repeats from sounding identical.
    source.start(at, Math.random() * 0.8);
  } else {
    source = context.createOscillator();
    source.type = layer.wave || 'sine';
    const from = (layer.freq || 220) * rate;
    source.frequency.setValueAtTime(from, at);
    if (layer.to) {
      source.frequency.exponentialRampToValueAtTime(Math.max(20, layer.to * rate), at + attack + decay);
    }
    if (layer.detune) source.detune.value = (Math.random() - 0.5) * layer.detune;
    source.start(at);
  }
  source.connect(gain);
  source.stop(at + attack + decay + 0.02);

  return (layer.delay || 0) + attack + decay;
}
