/* Named cues. Systems call these instead of touching recipes or the engine, so
   sound stays a one-line concern at every call site.

   Most cues take a world x for stereo placement, and pass a `key` so the engine
   can throttle repeats — without it, a Nightmare wave of simultaneous kills
   would stack thirty identical death groans into mud. */
import { playSound, panFor } from './audio.js';
import { WEAPON_SOUNDS, SOUNDS } from '../data/sounds.js';

export const SFX = {
  /** Survivor fire is quieter than yours so six of them cannot drown you out. */
  shot(weaponId, x, bot = false) {
    const spec = WEAPON_SOUNDS[weaponId];
    if (!spec) return;
    playSound(spec, {
      pan: panFor(x),
      gain: bot ? 0.4 : 1,
      rate: 0.97 + Math.random() * 0.06,
      key: `shot:${weaponId}:${bot}`,
      throttle: bot ? 0.06 : 0.02
    });
  },

  reload: () => playSound(SOUNDS.reload, { key: 'reload', throttle: 0.2 }),
  reloadDone: () => playSound(SOUNDS.reloadDone, { key: 'reloadDone', throttle: 0.2 }),

  /** Wide pitch spread: a crowd of identical groans reads as one animal. */
  groan: (x) => playSound(SOUNDS.groan, {
    pan: panFor(x), rate: 0.72 + Math.random() * 0.7, key: 'groan', throttle: 0.35
  }),

  kill: (headshot, x) => playSound(headshot ? SOUNDS.headshot : SOUNDS.death, {
    pan: panFor(x), rate: 0.9 + Math.random() * 0.3, key: headshot ? 'headshot' : 'death', throttle: 0.05
  }),

  bite: (x) => playSound(SOUNDS.bite, { pan: panFor(x), rate: 0.85 + Math.random() * 0.35, key: 'bite', throttle: 0.12 }),
  screech: (x) => playSound(SOUNDS.screech, { pan: panFor(x), key: 'screech', throttle: 0.3 }),
  burst: (x) => playSound(SOUNDS.burst, { pan: panFor(x), key: 'burst', throttle: 0.1 }),

  explosion: (x) => playSound(SOUNDS.explosion, { pan: panFor(x), key: 'explosion', throttle: 0.08 }),
  ignite: (x) => playSound(SOUNDS.ignite, { pan: panFor(x), key: 'ignite', throttle: 0.15 }),
  splash: (x) => playSound(SOUNDS.splash, { pan: panFor(x), key: 'splash', throttle: 0.1 }),

  barricadeBreak: () => playSound(SOUNDS.barricadeBreak, { key: 'barricadeBreak', throttle: 2 }),
  survivorDown: (x) => playSound(SOUNDS.survivorDown, { pan: panFor(x), key: 'survivorDown', throttle: 0.5 }),
  survivorLost: (x) => playSound(SOUNDS.survivorLost, { pan: panFor(x), key: 'survivorLost', throttle: 0.5 }),
  revive: (x) => playSound(SOUNDS.revive, { pan: panFor(x), key: 'revive', throttle: 0.5 }),
  hurt: () => playSound(SOUNDS.hurt, { key: 'hurt', throttle: 0.35 }),
  nightStart: () => playSound(SOUNDS.nightStart, { key: 'nightStart', throttle: 1 }),
  purchase: () => playSound(SOUNDS.purchase, { key: 'purchase', throttle: 0.1 })
};
