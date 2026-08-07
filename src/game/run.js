/* Run lifecycle: build a fresh run from the persisted profile, drop into night
   one, and keep an in-progress run recoverable across a refresh.

   Checkpoints store the between-nights shape only — never live zombies, bullets
   or particles. Resuming therefore restarts the interrupted night from the top
   rather than mid-fight, which is both simpler to keep correct and fairer than
   dropping someone back into a half-chewed barricade.

   Returning to the menu is the one action that deliberately throws a run away,
   which is why the pause screen asks twice before doing it. */
import { createState, setState, state, saveProgress } from '../core/state.js';
import { loadRun, saveRun, clearRun } from '../core/storage.js';
import { upgrades } from '../data/upgrades.js';
import { startNight } from './night.js';

/** Fields worth carrying across a refresh. Anything else is rebuilt. */
const SAVED_FIELDS = [
  'night', 'cash', 'scrap', 'upgrades', 'difficulty',
  'barricade', 'maxBarr', 'fortification',
  'armory', 'weapons', 'selected', 'ammo',
  'survivors', 'survivorLoadout',
  'killed', 'streakBest', 'runPhase'
];

export function applyUpgrades() {
  state.maxBarr += (state.upgrades.barr || 0) * upgrades.barr.step;
  state.barricade = state.maxBarr;
}

export function resetRun() {
  setState(createState());
  applyUpgrades();
  startNight();
}

/**
 * Records where the run is, so a refresh can pick it up.
 * @param {'night'|'dawn'|'shop'} phase where the player would resume.
 */
export function checkpoint(phase) {
  if (phase) state.runPhase = phase;
  const snapshot = { player: { hp: state.player.hp } };
  for (const field of SAVED_FIELDS) snapshot[field] = state[field];
  saveRun(snapshot);
}

/** The saved run, if one is worth offering. */
export function savedRun() {
  return loadRun();
}

/**
 * Restores a saved run into fresh state.
 * @returns {'night'|'dawn'|'shop'|null} where the caller should route.
 */
export function resumeRun() {
  const saved = loadRun();
  if (!saved) return null;

  setState(createState());
  for (const field of SAVED_FIELDS) {
    if (saved[field] !== undefined) state[field] = saved[field];
  }
  if (saved.player) state.player.hp = saved.player.hp;
  // maxBarr is restored directly, so applyUpgrades() must not stack onto it.
  return state.runPhase || 'night';
}

/** Throws the run away. Permanent Scrap and upgrades are untouched. */
export function abandonRun() {
  clearRun();
}

export function buyUpgrade(id) {
  const upgrade = upgrades[id];
  const rank = state.upgrades[id] || 0;
  if (rank >= upgrade.max || state.scrap < upgrade.cost) return false;
  state.scrap -= upgrade.cost;
  state.upgrades[id] = rank + 1;
  saveProgress();
  return true;
}
