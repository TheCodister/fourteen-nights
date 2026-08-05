/* Queries and mutations over the player's guns, ammo and survivor assignments.
   Pure state manipulation — no DOM, no rendering. */
import { state } from '../core/state.js';
import { weapons, STARTING_WEAPON } from '../data/weapons.js';
import { upgrades } from '../data/upgrades.js';
import { nextFortification } from '../data/fortifications.js';

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

/**
 * Where a weapon currently lives.
 * @returns {{kind:'player', slot:number}|{kind:'survivor', id:string}|{kind:'pool'}}
 */
export function holderOf(id) {
  const slot = state.weapons.indexOf(id);
  if (slot >= 0) return { kind: 'player', slot };
  const entry = Object.entries(state.survivorLoadout).find(([, held]) => held === id);
  return entry ? { kind: 'survivor', id: entry[0] } : { kind: 'pool' };
}

/**
 * Moves a weapon to `target`, vacating wherever it was. Every non-Pistol weapon
 * is exclusive, so this is a move and never a copy — which is what lets the UI
 * treat slots as places a gun can be dragged into rather than a set of
 * independent dropdowns that can disagree with each other.
 *
 * The Pistol is standard issue and exempt: any number of hands can hold one.
 *
 * @param {{kind:'player', slot:number}|{kind:'survivor', id:string}|{kind:'pool'}} target
 */
export function moveWeapon(id, target) {
  if (!state.armory.includes(id)) return false;

  if (id !== STARTING_WEAPON) {
    state.weapons = state.weapons.map((held) => (held === id ? null : held));
    for (const [survivorId, held] of Object.entries(state.survivorLoadout)) {
      if (held === id) delete state.survivorLoadout[survivorId];
    }
  }

  if (target.kind === 'player') {
    const other = target.slot === 0 ? 1 : 0;
    if (state.weapons[other] === id) state.weapons[other] = null;
    state.weapons[target.slot] = id;
    state.selected = target.slot;
  } else if (target.kind === 'survivor') {
    state.survivorLoadout[target.id] = id;
  }
  // 'pool' needs no placement — vacating above already freed it.

  normalizeLoadout();
  return true;
}

/** Hands a survivor back to standard-issue Pistol. */
export function unassignSurvivor(survivorId) {
  delete state.survivorLoadout[survivorId];
}

export function clearPlayerSlot(slot) {
  state.weapons[slot] = null;
  normalizeLoadout();
}

/** Slot 0 always holds something, and `selected` always points at a real gun. */
function normalizeLoadout() {
  if (!state.weapons[0]) {
    state.weapons[0] = state.weapons[1] || STARTING_WEAPON;
    if (state.weapons[1] === state.weapons[0]) state.weapons[1] = null;
  }
  if (!state.weapons[state.selected]) state.selected = 0;
}

/** Buys the next barricade fortification tier with in-run cash. */
export function buyFortification() {
  const next = nextFortification(state.fortification);
  if (!next || state.cash < next.price) return false;
  state.cash -= next.price;
  state.fortification++;
  return true;
}
