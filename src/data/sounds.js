/* Sound recipes, read by core/audio.js.

   A recipe is `{ gain, layers: [...] }`. Each layer is either a noise burst or an
   oscillator, optionally swept in pitch and shaped by a filter:

     src     'noise' | 'osc'
     wave    oscillator shape
     freq/to start and (optional) end frequency — the sweep is what gives a shot
             its punch, since a pitch drop reads as a transient
     filter  'lowpass' | 'highpass' | 'bandpass', with cutoff / cutoffTo / q
     gain    layer level
     attack  time to peak (keep tiny for impacts)
     decay   time back to silence
     delay   offset from the start of the sound

   Gunfire is built from three ingredients: a low sine sweep for the body thump,
   a filtered noise burst for the crack, and decay length for the size of the
   room it happens in. Changing those three is what makes weapons distinct — a
   shotgun is a slow deep thump under wide noise, an SMG is almost pure click. */

/** Per-weapon fire, keyed by the ids in data/weapons.js. */
export const WEAPON_SOUNDS = {
  pistol: {
    gain: 0.5,
    layers: [
      { src: 'osc', wave: 'sine', freq: 240, to: 62, gain: 0.5, decay: 0.09 },
      { src: 'noise', filter: 'bandpass', cutoff: 1900, q: 1.1, gain: 0.34, decay: 0.07 }
    ]
  },
  revolver: {
    gain: 0.72,
    layers: [
      { src: 'osc', wave: 'sine', freq: 190, to: 44, gain: 0.62, decay: 0.2 },
      { src: 'noise', filter: 'bandpass', cutoff: 1300, q: 0.9, gain: 0.44, decay: 0.24 },
      { src: 'noise', filter: 'highpass', cutoff: 2600, gain: 0.12, decay: 0.4, delay: 0.03 }
    ]
  },
  shotgun: {
    gain: 0.8,
    layers: [
      { src: 'osc', wave: 'sine', freq: 130, to: 34, gain: 0.7, decay: 0.3 },
      { src: 'noise', filter: 'lowpass', cutoff: 2600, cutoffTo: 500, gain: 0.55, decay: 0.34 }
    ]
  },
  smg: {
    gain: 0.4,
    layers: [
      { src: 'osc', wave: 'square', freq: 330, to: 120, gain: 0.26, decay: 0.04 },
      { src: 'noise', filter: 'bandpass', cutoff: 2700, q: 1.6, gain: 0.3, decay: 0.05 }
    ]
  },
  rifle: {
    gain: 0.78,
    layers: [
      { src: 'osc', wave: 'sine', freq: 220, to: 50, gain: 0.6, decay: 0.24 },
      { src: 'noise', filter: 'bandpass', cutoff: 3100, q: 1.3, gain: 0.42, decay: 0.11 },
      // The tail is what makes a rifle read as long-range rather than loud.
      { src: 'noise', filter: 'highpass', cutoff: 1800, gain: 0.11, decay: 0.55, delay: 0.05 }
    ]
  },
  ar: {
    gain: 0.52,
    layers: [
      { src: 'osc', wave: 'sine', freq: 200, to: 58, gain: 0.44, decay: 0.11 },
      { src: 'noise', filter: 'bandpass', cutoff: 2300, q: 1.2, gain: 0.34, decay: 0.08 }
    ]
  },
  lmg: {
    gain: 0.6,
    layers: [
      { src: 'osc', wave: 'sine', freq: 150, to: 40, gain: 0.56, decay: 0.15 },
      { src: 'noise', filter: 'lowpass', cutoff: 1900, gain: 0.36, decay: 0.13 }
    ]
  },
  moonbeam: {
    gain: 0.55,
    layers: [
      { src: 'osc', wave: 'sine', freq: 1400, to: 170, gain: 0.34, decay: 0.26 },
      { src: 'osc', wave: 'triangle', freq: 700, to: 90, gain: 0.26, decay: 0.3, detune: 40 },
      { src: 'noise', filter: 'bandpass', cutoff: 4200, q: 5, gain: 0.1, decay: 0.18 }
    ]
  },
  molotov: {
    gain: 0.45,
    layers: [
      { src: 'noise', filter: 'highpass', cutoff: 800, cutoffTo: 2400, gain: 0.3, attack: 0.02, decay: 0.32 }
    ]
  },
  launcher: {
    gain: 0.7,
    layers: [
      // Hollow "thoomp" — a fast low sweep with almost no high content.
      { src: 'osc', wave: 'sine', freq: 330, to: 68, gain: 0.62, decay: 0.14 },
      { src: 'noise', filter: 'lowpass', cutoff: 900, gain: 0.2, decay: 0.1 }
    ]
  },
  buster: {
    gain: 0.85,
    layers: [
      { src: 'osc', wave: 'sine', freq: 230, to: 46, gain: 0.6, decay: 0.36 },
      { src: 'noise', filter: 'lowpass', cutoff: 1400, cutoffTo: 320, gain: 0.5, attack: 0.01, decay: 0.5 }
    ]
  }
};

/** Everything that is not a gunshot. */
export const SOUNDS = {
  reload: {
    gain: 0.4,
    layers: [
      { src: 'noise', filter: 'bandpass', cutoff: 1500, q: 4, gain: 0.22, decay: 0.05 },
      { src: 'noise', filter: 'bandpass', cutoff: 900, q: 5, gain: 0.24, decay: 0.06, delay: 0.13 }
    ]
  },
  reloadDone: {
    gain: 0.4,
    layers: [{ src: 'noise', filter: 'bandpass', cutoff: 2200, q: 6, gain: 0.26, decay: 0.05 }]
  },

  /* Zombie voices. Two detuned saws under a low-pass read as a throat; the pitch
     is varied per call so a crowd never sounds like one animal. */
  groan: {
    gain: 0.34,
    layers: [
      { src: 'osc', wave: 'sawtooth', freq: 104, to: 78, gain: 0.24, attack: 0.09, decay: 0.7, detune: 60 },
      { src: 'osc', wave: 'sawtooth', freq: 70, to: 56, gain: 0.2, attack: 0.12, decay: 0.8, detune: 90 },
      { src: 'noise', filter: 'bandpass', cutoff: 620, q: 3.5, gain: 0.1, attack: 0.1, decay: 0.6 }
    ]
  },
  death: {
    gain: 0.42,
    layers: [
      { src: 'osc', wave: 'sawtooth', freq: 150, to: 42, gain: 0.28, decay: 0.36, detune: 80 },
      { src: 'noise', filter: 'lowpass', cutoff: 1100, cutoffTo: 260, gain: 0.3, decay: 0.3 }
    ]
  },
  headshot: {
    gain: 0.5,
    layers: [
      { src: 'noise', filter: 'bandpass', cutoff: 2400, q: 1.4, gain: 0.34, decay: 0.1 },
      { src: 'osc', wave: 'sine', freq: 180, to: 40, gain: 0.34, decay: 0.16 }
    ]
  },
  bite: {
    gain: 0.3,
    layers: [
      { src: 'noise', filter: 'lowpass', cutoff: 700, gain: 0.24, decay: 0.11 },
      { src: 'osc', wave: 'sine', freq: 90, to: 45, gain: 0.2, decay: 0.1 }
    ]
  },
  screech: {
    gain: 0.55,
    layers: [
      { src: 'osc', wave: 'sawtooth', freq: 380, to: 1500, gain: 0.26, attack: 0.02, decay: 0.34, detune: 50 },
      { src: 'noise', filter: 'bandpass', cutoff: 2000, cutoffTo: 4200, q: 4, gain: 0.16, decay: 0.3 }
    ]
  },
  burst: {
    gain: 0.75,
    layers: [
      { src: 'osc', wave: 'sine', freq: 170, to: 36, gain: 0.6, decay: 0.4 },
      { src: 'noise', filter: 'lowpass', cutoff: 1500, cutoffTo: 300, gain: 0.5, decay: 0.45 }
    ]
  },

  explosion: {
    gain: 0.9,
    layers: [
      { src: 'osc', wave: 'sine', freq: 200, to: 32, gain: 0.7, decay: 0.55 },
      { src: 'noise', filter: 'lowpass', cutoff: 2200, cutoffTo: 200, gain: 0.6, decay: 0.7 },
      { src: 'noise', filter: 'highpass', cutoff: 1400, gain: 0.14, decay: 0.28 }
    ]
  },
  ignite: {
    gain: 0.5,
    layers: [
      { src: 'noise', filter: 'bandpass', cutoff: 1200, cutoffTo: 3000, q: 0.8, gain: 0.34, attack: 0.03, decay: 0.5 }
    ]
  },
  splash: {
    gain: 0.36,
    layers: [
      { src: 'noise', filter: 'bandpass', cutoff: 1600, cutoffTo: 500, q: 1.2, gain: 0.28, decay: 0.22 }
    ]
  },

  barricadeBreak: {
    gain: 0.8,
    layers: [
      { src: 'noise', filter: 'lowpass', cutoff: 1400, cutoffTo: 260, gain: 0.5, decay: 0.7 },
      { src: 'osc', wave: 'square', freq: 130, to: 48, gain: 0.3, decay: 0.4 }
    ]
  },
  survivorDown: {
    gain: 0.6,
    layers: [
      { src: 'osc', wave: 'sawtooth', freq: 300, to: 120, gain: 0.28, attack: 0.02, decay: 0.5, detune: 30 },
      { src: 'noise', filter: 'bandpass', cutoff: 900, q: 2, gain: 0.14, decay: 0.4 }
    ]
  },
  survivorLost: {
    gain: 0.7,
    layers: [
      { src: 'osc', wave: 'sine', freq: 210, to: 70, gain: 0.34, attack: 0.03, decay: 1.1 },
      { src: 'osc', wave: 'sine', freq: 140, to: 46, gain: 0.28, attack: 0.05, decay: 1.4 }
    ]
  },
  revive: {
    gain: 0.6,
    layers: [
      { src: 'osc', wave: 'triangle', freq: 320, to: 640, gain: 0.28, attack: 0.02, decay: 0.35 },
      { src: 'osc', wave: 'sine', freq: 480, to: 960, gain: 0.18, attack: 0.04, decay: 0.4, delay: 0.06 }
    ]
  },
  hurt: {
    gain: 0.55,
    layers: [
      { src: 'osc', wave: 'sawtooth', freq: 260, to: 90, gain: 0.22, decay: 0.24, detune: 40 },
      { src: 'noise', filter: 'lowpass', cutoff: 900, gain: 0.18, decay: 0.2 }
    ]
  },
  nightStart: {
    gain: 0.7,
    layers: [
      { src: 'osc', wave: 'sine', freq: 60, to: 40, gain: 0.5, attack: 0.06, decay: 1.6 },
      { src: 'osc', wave: 'sawtooth', freq: 120, to: 90, gain: 0.14, attack: 0.4, decay: 1.6, detune: 40 }
    ]
  },
  purchase: {
    gain: 0.45,
    layers: [
      { src: 'osc', wave: 'square', freq: 620, gain: 0.16, decay: 0.06 },
      { src: 'osc', wave: 'square', freq: 930, gain: 0.14, decay: 0.09, delay: 0.07 }
    ]
  }
};
