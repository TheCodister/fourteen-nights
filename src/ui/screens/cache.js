/* Permanent upgrade store, spent between runs. */
import { state } from '../../core/state.js';
import { upgrades } from '../../data/upgrades.js';
import { buyUpgrade } from '../../game/run.js';
import { elements, showOverlay } from '../dom.js';
import { titleScreen } from './title.js';

export function cacheScreen() {
  const cards = Object.entries(upgrades).map(([id, upgrade]) => {
    const rank = state.upgrades[id] || 0;
    const locked = rank >= upgrade.max || state.scrap < upgrade.cost;
    return `<button class="shop-item" data-upgrade="${id}" ${locked ? 'disabled' : ''}>
      <strong>${upgrade.name}</strong>
      <small>RANK ${rank}/${upgrade.max} · ${upgrade.cost} SCRAP<br>${upgrade.copy}</small>
    </button>`;
  }).join('');

  showOverlay(`
    <div class="overline">SURVIVAL CACHE</div>
    <h2>MAKE THE NEXT RUN COUNT.</h2>
    <p><b style="color:#ffcf54">${state.scrap} SCRAP</b> available. Upgrades persist between runs.</p>
    <div class="shop-grid">${cards}</div>
    <button class="action" id="back">BACK TO THE ROAD</button>
  `, { back: titleScreen });

  elements.overlay.querySelectorAll('[data-upgrade]').forEach((button) => {
    button.onclick = () => {
      if (buyUpgrade(button.dataset.upgrade)) cacheScreen();
    };
  });
}
