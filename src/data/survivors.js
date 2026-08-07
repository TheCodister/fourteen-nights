/* Recruitable defenders. `id` is what perk checks look for — see PERKS below
   for where each one is read. */
/* `build` and `hair` are read by render/actors.js so the line is made of
   recognisable people rather than six copies of one figure. */
export const survivorPool = [
  { id: 'mechanic', name: 'Mechanic Mae', perk: 'Repairs restore +20 barricade health.', build: 'f', hair: '#5b3a24' },
  { id: 'nurse', name: 'Nurse Nia', perk: 'Restores 20 player health at dawn.', build: 'f', hair: '#241a16' },
  { id: 'officer', name: 'Officer Ortiz', perk: 'Your first reload each night is instant.', build: 'f', hair: '#3b2a1c' },
  { id: 'accountant', name: 'Accountant Al', perk: '+12% cash from kills.', build: 'm', hair: '#6b6b6b' },
  { id: 'inventor', name: 'Inventor Izzy', perk: 'Better odds of Moonbeam-9 parts.', build: 'f', hair: '#7d4a2c' },
  { id: 'cook', name: 'Cook Carl', perk: '+15% movement speed for the first 5 seconds.', build: 'm', hair: '#2b1f18' }
];

/* Perk magnitudes, kept next to the roster so balance passes touch one file. */
export const PERKS = {
  mechanic: { repairMultiplier: 1.25 },
  nurse: { dawnHeal: 20 },
  accountant: { cashMultiplier: 1.12 },
  inventor: { searchBonus: 0.12 },
  cook: { speedMultiplier: 1.15, duration: 5 }
};

export const BOT_ACCURACY = { min: 0.4, spread: 0.2 };

/* Survivor vitality. Lives in data so both systems/bots.js and render/actors.js
   can read it without render importing from systems. */
export const BOT_VITALS = {
  hp: 70,
  /** Seconds on the ground before the survivor is lost from the run for good. */
  bleedOut: 14,
  reviveRadius: 62,
  /** Seconds the player must stand with them to bring them back. */
  reviveTime: 1.8,
  /** Fraction of max hp restored by a revive — they get up hurt. */
  reviveHp: 0.5
};
