/* Barricade fortifications: things bolted to the line that hurt whatever comes
   to chew on it.

   A tiered upgrade bought with in-run cash, not Scrap — it gives late-run cash
   somewhere to go once the weapon rack is full. Each tier replaces the last, so
   `state.fortification` is simply how many tiers deep you are (0 = bare boards).

   `dps` is continuous contact damage to any zombie touching the barricade, so it
   works while you are reloading or across the yard. It stops the moment the
   barricade falls: there is nothing left to string wire across. */
export const fortifications = [
  {
    name: 'BARBED WIRE', price: 450, dps: 9,
    copy: 'Coils along the boards. 9 damage per second to anything chewing the line.'
  },
  {
    name: 'SPIKE STRIP', price: 900, dps: 21,
    copy: 'Rebar spikes driven through the planks. 21 damage per second at the line.'
  },
  {
    name: 'ELECTRIC FENCE', price: 1800, dps: 44,
    copy: 'Live wire off the house mains. 44 damage per second, and it lights up the yard.'
  }
];

/** Contact damage per second at the current tier. */
export function fortificationDps(tier) {
  const built = fortifications[tier - 1];
  return built ? built.dps : 0;
}

/** The next tier available to buy, or null when fully upgraded. */
export function nextFortification(tier) {
  return tier < fortifications.length ? { index: tier, ...fortifications[tier] } : null;
}
