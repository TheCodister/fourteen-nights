/* Dawn phase: split the day between repairing the barricade and searching for
   survivors. The UI calls previewDawn() for the slider readout and resolveDawn()
   once, on confirm. */
import { DAWN_HOURS, MAX_SURVIVORS } from '../config.js';
import { state } from '../core/state.js';
import { upgrades } from '../data/upgrades.js';
import { survivorPool, PERKS, BOT_ACCURACY } from '../data/survivors.js';
import { hasSurvivor, rank } from '../game/loadout.js';
import { checkpoint } from './run.js';

const REPAIR_PER_HOUR = 10;
const FIND_CHANCE_PER_HOUR = 0.06;
const MAX_FIND_CHANCE = 0.9;

export function repairAmountFor(repairHours) {
  const multiplier = hasSurvivor('mechanic') ? PERKS.mechanic.repairMultiplier : 1;
  return Math.round(repairHours * REPAIR_PER_HOUR * multiplier);
}

export function findChanceFor(searchHours) {
  const bonus = (hasSurvivor('inventor') ? PERKS.inventor.searchBonus : 0)
    + rank('scavenger') * upgrades.scavenger.step;
  return Math.min(MAX_FIND_CHANCE, searchHours * FIND_CHANCE_PER_HOUR + bonus);
}

export function previewDawn(repairHours) {
  const searchHours = DAWN_HOURS - repairHours;
  return {
    repairHours,
    searchHours,
    health: repairAmountFor(repairHours),
    chance: Math.round(findChanceFor(searchHours) * 100)
  };
}

/**
 * Applies the plan, advances the calendar, and reports what happened.
 * @returns {{repairHours:number, searchHours:number, repairAmount:number,
 *            found:?object, accuracy:number, rosterFull:boolean}}
 */
export function resolveDawn(repairHours) {
  const searchHours = DAWN_HOURS - repairHours;
  const repairAmount = repairAmountFor(repairHours);
  state.barricade = Math.min(state.maxBarr, state.barricade + repairAmount);

  const rosterFull = state.survivors.length >= MAX_SURVIVORS;
  let found = null;
  if (searchHours > 0 && !rosterFull && Math.random() < findChanceFor(searchHours)) {
    const candidates = survivorPool.filter((survivor) => !hasSurvivor(survivor.id));
    const recruit = candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    if (recruit) {
      /* Accuracy is rolled once, here, and copied onto the survivor. It used to
         be re-rolled per night in createBots while the dawn card showed an
         unrelated 70-80% — so the number quoted on recruitment was never the
         number they shot at. Spread onto a new object because survivorPool is a
         module singleton: mutating the entry would leak into later runs. */
      found = { ...recruit, accuracy: BOT_ACCURACY.min + Math.random() * BOT_ACCURACY.spread };
      state.survivors.push(found);
    }
  }

  state.night++;
  checkpoint('shop');
  return {
    repairHours,
    searchHours,
    repairAmount,
    found,
    accuracy: found ? Math.round(found.accuracy * 100) : 0,
    rosterFull
  };
}
