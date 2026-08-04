/* Shop, player loadout and survivor weapon assignment. These three screens
   navigate into each other, so they share a module. */
import { state } from '../../core/state.js';
import { weapons, STARTING_WEAPON } from '../../data/weapons.js';
import { startNight } from '../../game/night.js';
import {
  priceFor, buyWeapon, equip, isAssignedToSurvivor, survivorWeapon, assignSurvivorWeapon
} from '../../game/loadout.js';
import { elements, showOverlay, pad } from '../dom.js';

const beginLabel = () => `BEGIN NIGHT ${pad(state.night)}`;

export function shopScreen() {
  const equipped = state.weapons.filter(Boolean).map((id) => weapons[id].name).join(' / ');
  const cards = Object.entries(weapons).map(([id, w]) => {
    const price = priceFor(w);
    const owned = state.armory.includes(id);
    const disabled = state.cash < price || owned;
    return `<button class="shop-item ${owned ? 'owned' : ''}" data-weapon="${id}" ${disabled ? 'disabled' : ''}>
      <strong>${w.name}</strong>
      <small>${owned ? 'OWNED' : `$${price}`} · ${w.mag} RDS · ${w.damage} DMG</small>
    </button>`;
  }).join('');

  showOverlay(`
    <div class="overline">NIGHT ${pad(state.night)} ARMORY</div>
    <h2>BUY ONCE. EQUIP ANYTIME.</h2>
    <p><b style="color:#c8ff58">$${state.cash}</b> available &nbsp; | &nbsp; equipped: ${equipped || 'PISTOL'}</p>
    <div class="shop-grid">${cards}</div>
    <button class="action secondary" id="loadout">PLAYER LOADOUT</button>
    <button class="action secondary" id="survivorLoadout">SURVIVOR WEAPONS</button>
    <button class="action" id="continue">${beginLabel()}</button>
  `, { loadout: equipScreen, survivorLoadout: survivorLoadoutScreen, continue: startNight });

  elements.overlay.querySelectorAll('[data-weapon]').forEach((button) => {
    button.onclick = () => {
      if (buyWeapon(button.dataset.weapon)) equipScreen();
    };
  });
}

export function equipScreen() {
  const entries = state.armory.map((id) => {
    const w = weapons[id];
    const primary = state.weapons[0] === id;
    const secondary = state.weapons[1] === id;
    const loaned = isAssignedToSurvivor(id);
    return `<div class="armory-item">
      <strong>${w.name}</strong>
      <small>${loaned ? 'ASSIGNED TO SURVIVOR' : `${w.mag} RDS · ${w.damage} DMG`}</small>
      <div>
        <button data-equip="${id}" data-slot="0" ${primary || loaned ? 'disabled' : ''}>${primary ? 'PRIMARY' : 'SET PRIMARY'}</button>
        <button data-equip="${id}" data-slot="1" ${secondary || primary || loaned ? 'disabled' : ''}>${secondary ? 'SECONDARY' : 'SET SECONDARY'}</button>
      </div>
    </div>`;
  }).join('');

  showOverlay(`
    <div class="overline">PERSISTENT ARMORY — ${state.armory.length} OWNED</div>
    <h2>SET YOUR TWO-GUN LOADOUT.</h2>
    <p>Primary: <b style="color:#ffcf54">${weapons[state.weapons[0]].name}</b>
       &nbsp;|&nbsp; Secondary: <b style="color:#ffcf54">${state.weapons[1] ? weapons[state.weapons[1]].name : 'EMPTY'}</b></p>
    <div class="armory-grid">${entries}</div>
    <button class="action secondary" id="backShop">BACK TO SHOP</button>
    <button class="action" id="beginFromLoadout">${beginLabel()}</button>
  `, { backShop: shopScreen, beginFromLoadout: startNight });

  elements.overlay.querySelectorAll('[data-equip]').forEach((button) => {
    button.onclick = () => {
      equip(button.dataset.equip, Number(button.dataset.slot));
      equipScreen();
    };
  });
}

export function survivorLoadoutScreen() {
  const rows = state.survivors.map((survivor) => {
    const current = survivorWeapon(survivor);
    const options = [STARTING_WEAPON, ...state.armory.filter((id) => id !== STARTING_WEAPON)]
      .filter((id) => id === current || (!state.weapons.includes(id) && !isAssignedToSurvivor(id, survivor.id)))
      .map((id) => `<option value="${id}" ${id === current ? 'selected' : ''}>${weapons[id].name}</option>`)
      .join('');
    return `<label class="survivor-loadout">
      <span><strong>${survivor.name}</strong><small>DEFAULT: PISTOL · 40–60% ACCURACY</small></span>
      <select data-survivor-weapon="${survivor.id}">${options}</select>
    </label>`;
  }).join('') || '<p>No survivors yet. Allocate dawn hours to searching.</p>';

  showOverlay(`
    <div class="overline">SURVIVOR WEAPONS</div>
    <h2>ASSIGN THE SPARE GUNS.</h2>
    <p>Survivors automatically reload. A custom weapon can only be held by one person, while Pistols remain standard issue.</p>
    <div class="survivor-loadout-list">${rows}</div>
    <button class="action secondary" id="backToArmory">BACK TO ARMORY</button>
    <button class="action" id="beginWithTeam">${beginLabel()}</button>
  `, { backToArmory: shopScreen, beginWithTeam: startNight });

  elements.overlay.querySelectorAll('[data-survivor-weapon]').forEach((select) => {
    select.onchange = () => {
      assignSurvivorWeapon(select.dataset.survivorWeapon, select.value);
      survivorLoadoutScreen();
    };
  });
}
