/* Recruitable defenders. `id` is what perk checks look for — see PERKS below
   for where each one is read. */
export const survivorPool = [
  { id: 'mechanic', name: 'Mechanic Mae', perk: 'Repairs restore +20 barricade health.' },
  { id: 'nurse', name: 'Nurse Nia', perk: 'Restores 20 player health at dawn.' },
  { id: 'officer', name: 'Officer Ortiz', perk: 'Your first reload each night is instant.' },
  { id: 'accountant', name: 'Accountant Al', perk: '+12% cash from kills.' },
  { id: 'inventor', name: 'Inventor Izzy', perk: 'Better odds of Moonbeam-9 parts.' },
  { id: 'cook', name: 'Cook Carl', perk: '+15% movement speed for the first 5 seconds.' }
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
