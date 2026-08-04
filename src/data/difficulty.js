/* Difficulty tiers.

   The design is a ratio shift, not a flat HP ladder: as difficulty rises, more
   headshots are required, while bigger zombies actually take FEWER body shots.
   Precision becomes the answer and spraying stays viable but slow.

   Multipliers rather than absolute HP, so the roster keeps its variety — a
   runner stays faster and frailer than a spitter at every tier.

   Resulting counts with the Pistol (20 damage, 15 through armour):

                        EASY          MEDIUM        HARD
     shambler        5 body / 1 hs  5 body / 1 hs  7 body / 2 hs
     tough          15 body / 2 hs 12 body / 2 hs 10 body / 3 hs
     Foreman head        6 hs           8 hs          10 hs
     Passenger head      8 hs          10 hs          13 hs

   `bossHeadMultiplier` is rounded, and 1 / 1.3 / 1.65 lands exactly on the
   6→8→10 and 8→10→13 targets above. Check the table still holds if you retune. */
export const difficulties = {
  easy: {
    name: 'EASY',
    tagline: 'The original balance.',
    copy: '5 body shots or a single headshot drops a shambler. Tough zombies need 2 headshots.',
    hpMultiplier: 1,
    armorHpMultiplier: 1,
    headHp: { normal: 1, armored: 2 },
    bossHeadMultiplier: 1,
    reward: 1
  },
  medium: {
    name: 'MEDIUM',
    tagline: 'Bosses want precision.',
    copy: 'Shamblers unchanged. Tough zombies soften to 12 body shots, but bosses take far more headshots. +20% cash and Scrap.',
    hpMultiplier: 1,
    armorHpMultiplier: 0.82,
    headHp: { normal: 1, armored: 2 },
    bossHeadMultiplier: 1.3,
    reward: 1.2
  },
  hard: {
    name: 'HARD',
    tagline: 'One shot is never enough.',
    copy: '2 headshots or 7 body shots for a shambler; 3 headshots or 10 body shots for a tough. +50% cash and Scrap.',
    hpMultiplier: 1.4,
    armorHpMultiplier: 0.68,
    headHp: { normal: 2, armored: 3 },
    bossHeadMultiplier: 1.65,
    reward: 1.5
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
