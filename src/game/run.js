/* Run lifecycle: build a fresh run from the persisted profile and drop into
   night one. */
import { createState, setState, state, saveProgress } from '../core/state.js';
import { upgrades } from '../data/upgrades.js';
import { startNight } from './night.js';

export function applyUpgrades() {
  state.maxBarr += (state.upgrades.barr || 0) * upgrades.barr.step;
  state.barricade = state.maxBarr;
}

export function resetRun() {
  setState(createState());
  applyUpgrades();
  startNight();
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
