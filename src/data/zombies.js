/* Horde catalogue.
   hp/speed/cash/r are per-zombie; `barr` is barricade damage per second (scaled
   by 0.45 in the zombie system); `weight` is the spawn share once unlocked;
   `unlockNight` gates the type; `earlyPenalty` thins a type out while it is
   still new. Behaviour flags: armor (damage soak + helmet), spit (ranged acid),
   clown (cosmetic + cash). */
export const types = {
  shambler: { hp: 100, speed: 42, barr: 4, cash: 20, r: 20, color: '#8cab6a', weight: 55, unlockNight: 1 },
  runner: { hp: 75, speed: 92, barr: 3, cash: 25, r: 17, color: '#d3e076', weight: 22, unlockNight: 2 },
  spitter: { hp: 120, speed: 38, barr: 2, cash: 35, r: 21, color: '#93c987', weight: 8, unlockNight: 3, spit: true },
  tough: {
    hp: 220, speed: 30, barr: 12, cash: 45, r: 27, color: '#596873', weight: 12, unlockNight: 4, armor: true,
    earlyPenalty: { beforeNight: 6, divisor: 2 }
  },
  clown: { hp: 90, speed: 58, barr: 5, cash: 60, r: 20, color: '#fd855f', weight: 3, unlockNight: 8, clown: true },

  /* The two survivor-killers, held back until the back half of the run so the
     early nights stay about holding the barricade. Both keep low weights and an
     earlyPenalty on top, so their first appearance is a scare, not a wall. */
  pouncer: {
    hp: 130, speed: 104, barr: 6, cash: 90, r: 19, color: '#b8d16a', weight: 7, unlockNight: 9,
    pounce: true, earlyPenalty: { beforeNight: 11, divisor: 2 }
  },
  bloater: {
    hp: 260, speed: 26, barr: 8, cash: 110, r: 26, color: '#7f9a52', weight: 6, unlockNight: 11,
    bloat: true, earlyPenalty: { beforeNight: 13, divisor: 2 }
  }
};

/** Pouncer leap and pin. */
export const POUNCE = {
  /** Starts looking for a survivor once past this x, barricade or no barricade. */
  triggerX: 700,
  leapTime: 0.45,
  /** Damage per second to the survivor it has pinned. */
  dps: 26
};

/** Bloater death burst. Hurts your side only — killing it at range is the answer. */
export const BLOAT = {
  radius: 150,
  damage: 42,
  /** Player takes less than a survivor, who is caught standing in formation. */
  playerScale: 0.7
};

/* Bosses are keyed by the night they show up on. `r` is already final — bosses
   are not multiplied by ACTOR_SCALE. `spawnAt` is seconds into the night;
   `escortType`/`escortCount` is the wave dropped at each quarter of its health. */
export const bosses = {
  7: {
    type: 'foreman', hp: 1800, maxHp: 1800, speed: 28, barr: 45, cash: 400, r: 66.25, color: '#8e6a58',
    headHp: 6, spawnAt: 45, escortType: 'shambler', escortCount: 6
  },
  14: {
    type: 'passenger', hp: 3600, maxHp: 3600, speed: 34, barr: 38, cash: 400, r: 77.5, color: '#aa687b',
    headHp: 8, spawnAt: 35, escortType: 'runner', escortCount: 4
  }
};
