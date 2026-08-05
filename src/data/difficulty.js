/* Difficulty tiers.

   The design is a ratio shift, not a flat HP ladder: as difficulty rises, more
   headshots are required, while bigger zombies actually take FEWER body shots.
   Precision becomes the answer and spraying stays viable but slow.

   Multipliers rather than absolute HP, so the roster keeps its variety — a
   runner stays faster and frailer than a spitter at every tier.

   Resulting counts with the Pistol (20 damage, 15 through armour):

                      EASY           NORMAL         HARD/NIGHTMARE
     shambler      5 body / 1 hs   7 body / 2 hs    9 body / 3 hs
     tough        12 body / 2 hs  10 body / 3 hs    8 body / 4 hs
     Foreman head      8 hs           10 hs            12 hs
     Passenger head   10 hs           13 hs            16 hs

   `bossHeadMultiplier` is rounded; 1.3 / 1.65 / 2 lands exactly on the 8→10→12
   and 10→13→16 targets above. Check the table still holds if you retune.

   Nightmare is Hard's durability with a heavier horde, so it spreads the same
   DURABILITY object rather than restating the numbers — the two cannot drift
   apart by accident. */

/* Payouts deliberately did NOT move when the ladder shifted up: tier one still
   pays x1, tier two x1.2, tier three x1.5. Nightmare shares Hard's payout as
   well as its durability — its extra bodies already mean more kills per night,
   so the horde is its own reward. */
const HARD_REWARD = 1.5;

/** Shared by Hard and Nightmare: identical zombie durability by construction. */
const HARD_DURABILITY = {
  hpMultiplier: 1.8,
  armorHpMultiplier: 0.545,
  headHp: { normal: 3, armored: 4 },
  bossHeadMultiplier: 2
};

export const difficulties = {
  easy: {
    name: 'EASY',
    blurb: 'For amateurs. Learn the barricade before it bites back.',
    hpMultiplier: 1,
    armorHpMultiplier: 0.82,
    headHp: { normal: 1, armored: 2 },
    bossHeadMultiplier: 1.3,
    reward: 1
  },
  normal: {
    name: 'NORMAL',
    blurb: 'The dead are meaner here, but you can hold them.',
    hpMultiplier: 1.4,
    armorHpMultiplier: 0.68,
    headHp: { normal: 2, armored: 3 },
    bossHeadMultiplier: 1.65,
    reward: 1.2
  },
  hard: {
    name: 'HARD',
    blurb: 'The horde is on another level. Only real skill survives this.',
    ...HARD_DURABILITY,
    reward: HARD_REWARD
  },
  nightmare: {
    name: 'NIGHTMARE',
    blurb: 'Are you nuts?',
    ...HARD_DURABILITY,
    reward: HARD_REWARD,
    /* Same bodies as Hard, far more of them. From night two on, every wave
       carries an extra zombie and the spawn clock runs a quarter faster. */
    horde: { fromNight: 2, batchBonus: 1, intervalScale: 0.75 }
  }
};

export const DEFAULT_DIFFICULTY = 'easy';

/** Never throws on an unknown or stale persisted id. */
export function difficultyOf(id) {
  return difficulties[id] || difficulties[DEFAULT_DIFFICULTY];
}

/** Scaled hp/headHp for a horde entry. `template` is a row from data/zombies.js. */
export function scaleZombie(template, id, boss = false) {
  const d = difficultyOf(id);
  const hp = Math.round(template.hp * (template.armor ? d.armorHpMultiplier : d.hpMultiplier));
  const headHp = boss
    ? Math.max(1, Math.round((template.headHp || 1) * d.bossHeadMultiplier))
    : (template.armor ? d.headHp.armored : d.headHp.normal);
  return { hp, headHp };
}

/** The extra-horde rules in force on `night`, or null when the tier has none. */
export function hordeBoostFor(id, night) {
  const { horde } = difficultyOf(id);
  return horde && night >= horde.fromNight ? horde : null;
}
