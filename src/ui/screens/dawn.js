/* Dawn planning screen and its result card. */
import { DAWN_HOURS, MAX_SURVIVORS } from '../../config.js';
import { state } from '../../core/state.js';
import { previewDawn, resolveDawn } from '../../game/dawn.js';
import { elements, showOverlay, pad } from '../dom.js';
import { shopScreen } from './armory.js';

const DEFAULT_REPAIR_HOURS = 6;

export function dawnScreen() {
  const names = state.survivors.map((survivor) => survivor.name).join(' · ') || 'NONE';
  const initial = previewDawn(DEFAULT_REPAIR_HOURS);

  showOverlay(`
    <div class="overline">DAWN ${pad(state.night)} — ${DAWN_HOURS} HOURS BEFORE DARK</div>
    <h2>PATCH THE LINE.<br>SEARCH THE BLOCK.</h2>
    <p>Allocate all ${DAWN_HOURS} hours. Every repair hour restores <b style="color:#ff4b4b">10 barricade health</b>;
       search time raises the chance of finding one defender.
       Survivors: ${state.survivors.length}/${MAX_SURVIVORS} (${names})</p>
    <div class="time-allocation">
      <div>
        <span>REPAIR <b id="repairHoursValue">${initial.repairHours}</b> HRS</span>
        <input id="repairHours" type="range" min="0" max="${DAWN_HOURS}" value="${DEFAULT_REPAIR_HOURS}" />
      </div>
      <div class="allocation-readout">
        <strong id="repairPreview">+${initial.health}</strong><small>BARRICADE HEALTH</small>
        <strong id="searchPreview">${initial.chance}%</strong><small>FIND CHANCE · ${initial.searchHours} HRS</small>
      </div>
    </div>
    <button class="action" id="commitDawn">CONFIRM DAWN PLAN</button>
  `);

  const slider = elements.overlay.querySelector('#repairHours');
  slider.oninput = () => {
    const preview = previewDawn(Number(slider.value));
    elements.overlay.querySelector('#repairHoursValue').textContent = preview.repairHours;
    elements.overlay.querySelector('#repairPreview').textContent = `+${preview.health}`;
    elements.overlay.querySelector('#searchPreview').textContent = `${preview.chance}%`;
  };
  elements.overlay.querySelector('#commitDawn').onclick = () => dawnResultScreen(Number(slider.value));
}

function dawnResultScreen(repairHours) {
  const outcome = resolveDawn(repairHours);
  let headline = 'No one answered the calls.';
  if (outcome.found) {
    headline = `<b style="color:#c8ff58">${outcome.found.name}</b> made it back to the barricade.`
      + ` They will cover you with roughly ${outcome.accuracy}% accuracy.`;
  } else if (outcome.rosterFull) {
    headline = 'Your six-person team is full. No more room at the line.';
  }

  showOverlay(`
    <div class="overline">DAWN RESULT</div>
    <h2>${headline}</h2>
    <p>${outcome.repairHours} repair hours restored <b style="color:#ff4b4b">${outcome.repairAmount} health</b>.
       ${outcome.searchHours} hours were spent searching.</p>
    <button class="action" id="toShop">OPEN ARMORY</button>
  `, { toShop: shopScreen });
}
