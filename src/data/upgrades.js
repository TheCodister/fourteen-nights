/* Permanent, scrap-funded upgrades. `step` is the per-rank effect, read by the
   system named in `appliedIn` so a new upgrade has one obvious wiring point. */
export const upgrades = {
  barr: {
    name: 'REINFORCED BARRICADE', max: 5, cost: 75, step: 15,
    copy: '+15 maximum barricade health', appliedIn: 'game/run.js'
  },
  hands: {
    name: 'FAST HANDS', max: 5, cost: 90, step: 0.06,
    copy: '-6% reload duration', appliedIn: 'systems/combat.js'
  },
  legs: {
    name: "RUNNER'S LEGS", max: 4, cost: 100, step: 0.05,
    copy: '+5% movement speed', appliedIn: 'systems/player.js'
  },
  clean: {
    name: 'CLEAN SHOT', max: 5, cost: 110, step: 0.05,
    copy: '+5% headshot cash', appliedIn: 'systems/zombies.js'
  },
  scavenger: {
    name: 'SCAVENGER', max: 4, cost: 120, step: 0.05,
    copy: '+5% search success', appliedIn: 'game/dawn.js'
  },
  bargain: {
    name: 'BARGAIN HUNTER', max: 3, cost: 150, step: 0.05,
    copy: '-5% shop prices', appliedIn: 'game/loadout.js'
  }
};

/** Scrap banked per night survived, and the bonus tiers. */
export const SCRAP = { perNight: 35, tierBonus: 10, tierEvery: 3, perNightOnDeath: 15, victory: 300 };

/* Headshot streak payout. Only the player's own headshots build the streak; a
   body-shot kill of theirs drops it back to zero. Survivor kills never touch it.
   `showAt` is when the HUD badge appears. */
export const STREAK = { step: 0.05, maxBonus: 1, showAt: 3 };

/** Cash multiplier earned by a run of consecutive headshots. */
export function streakMultiplier(streak) {
  return 1 + Math.min(STREAK.maxBonus, Math.max(0, streak) * STREAK.step);
}
