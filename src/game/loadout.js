/* Queries and mutations over the player's guns, ammo and survivor assignments.
   Pure state manipulation — no DOM, no rendering. */
import { state } from '../core/state.js';
import { weapons, STARTING_WEAPON } from '../data/weapons.js';
import { upgrades } from '../data/upgrades.js';

export function weaponId() {
  return state.weapons[state.selected] || state.weapons[0];
}

export function weapon() {
  return weapons[weaponId()];
}

/** Magazine left in any owned weapon — the HUD reads both carried slots. */
export function ammoFor(id) {
  return state.ammo[id] ?? weapons[id].mag;
}

export function weaponAmmo() {
  return ammoFor(weaponId());
}

export function setAmmo(value) {
  state.ammo[weaponId()] = value;
}

export function rank(id) {
  return state.upgrades[id] || 0;
}

export function priceFor(w) {
  return Math.floor(w.price * (1 - rank('bargain') * upgrades.bargain.step));
}

export function hasSurvivor(id) {
  return state.survivors.some((survivor) => survivor.id === id);
}

export function survivorWeapon(survivor) {
  return state.survivorLoadout[survivor.id] || STARTING_WEAPON;
}

/** True when `id` is already in a survivor's hands (ignoring `exceptId`). */
export function isAssignedToSurvivor(id, exceptId = '') {
  return id !== STARTING_WEAPON
    && Object.entries(state.survivorLoadout).some(([survivorId, held]) => survivorId !== exceptId && held === id);
}

export function buyWeapon(id) {
  const price = priceFor(weapons[id]);
  if (state.cash < price || state.armory.includes(id)) return false;
  state.cash -= price;
  state.armory.push(id);
  state.ammo[id] = weapons[id].mag;
  return true;
}

export function equip(id, slot) {
  const other = slot === 0 ? 1 : 0;
  if (state.weapons[other] === id) state.weapons[other] = null;
  state.weapons[slot] = id;
  state.selected = slot;
}

/** Assigning a gun to a survivor takes it out of the player's hands. */
export function assignSurvivorWeapon(survivorId, id) {
  state.survivorLoadout[survivorId] = id;
  if (id === STARTING_WEAPON) return;
  state.weapons = state.weapons.map((held) => (held === id ? null : held));
  if (!state.weapons[0]) {
    state.weapons[0] = STARTING_WEAPON;
    state.selected = 0;
  }
}
