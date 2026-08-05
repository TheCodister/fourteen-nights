/* Shop and the loadout board.

   The board replaces what used to be two screens — a player loadout with
   SET PRIMARY / SET SECONDARY buttons and a separate survivor page of dropdowns.
   Assigning a gun meant visiting both, because either screen could claim the
   same weapon and you had to re-equip by hand afterwards.

   Now every owned weapon lives in exactly one place: the rack, one of your two
   slots, or a survivor's hands. Drag it where you want it — game/loadout.js
   `moveWeapon` vacates the old spot, so nothing needs reassigning.

   Drag-and-drop never fires on touch, so every drag has a tap equivalent: tap a
   weapon to pick it up, tap a destination to put it down. */
import { state } from '../../core/state.js';
import { weapons, STARTING_WEAPON } from '../../data/weapons.js';
import { fortifications, nextFortification } from '../../data/fortifications.js';
import { startNight } from '../../game/night.js';
import {
  priceFor, buyWeapon, buyFortification, holderOf, moveWeapon, unassignSurvivor, clearPlayerSlot, survivorWeapon
} from '../../game/loadout.js';
import { elements, showOverlay, pad } from '../dom.js';

const beginLabel = () => `BEGIN NIGHT ${pad(state.night)}`;

/** Weapon picked up by tapping, awaiting a destination. Cleared once it lands. */
let picked = null;

export function shopScreen() {
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
    <h2>BUY ONCE. KEEP FOREVER.</h2>
    <p><b style="color:#c8ff58">$${state.cash}</b> available &nbsp; | &nbsp;
       ${state.armory.length} weapon${state.armory.length === 1 ? '' : 's'} in the rack</p>
    <div class="shop-grid">${cards}</div>
    ${fortificationRow()}
    <button class="action secondary" id="loadout">ARRANGE LOADOUT</button>
    <button class="action" id="continue">${beginLabel()}</button>
  `, { loadout: loadoutScreen, continue: startNight });

  elements.overlay.querySelectorAll('[data-weapon]').forEach((button) => {
    button.onclick = () => {
      if (buyWeapon(button.dataset.weapon)) shopScreen();
    };
  });

  const fortButton = elements.overlay.querySelector('#buyFort');
  if (fortButton) {
    fortButton.onclick = () => {
      if (buyFortification()) shopScreen();
    };
  }
}

/* The barricade upgrade line. This is where late-run cash goes once the rack is
   full — fortification damage keeps working while you reload or revive. */
function fortificationRow() {
  const built = state.fortification
    ? fortifications[state.fortification - 1]
    : null;
  const next = nextFortification(state.fortification);
  const current = built
    ? `<b style="color:#c8ff58">${built.name}</b> — ${built.dps} dmg/sec at the line`
    : '<span style="color:#98a8b5">Bare boards. Nothing hurts them on the way in.</span>';

  if (!next) {
    return `<div class="fort-row"><span class="fort-label">BARRICADE</span>
      <p>${current}<br><small>Fully fortified.</small></p></div>`;
  }

  const afford = state.cash >= next.price;
  return `<div class="fort-row">
    <span class="fort-label">BARRICADE</span>
    <p>${current}</p>
    <button class="fort-buy" id="buyFort" ${afford ? '' : 'disabled'}>
      <strong>${next.name} · $${next.price}</strong>
      <small>${next.copy}</small>
    </button>
  </div>`;
}

export function loadoutScreen() {
  showOverlay(`
    <div class="overline">LOADOUT — DRAG A WEAPON, OR TAP IT THEN TAP A SLOT</div>
    <h2>WHO CARRIES WHAT.</h2>
    <div class="board">
      <div class="rack-side">
        <span class="board-label">THE RACK</span>
        <div class="rack drop-zone" data-drop="pool">${rackCards()}</div>
      </div>
      <div class="slots-side">
        <span class="board-label">YOU</span>
        <div class="slot-row">${playerSlot(0, 'PRIMARY')}${playerSlot(1, 'SECONDARY')}</div>
        <span class="board-label">SURVIVORS</span>
        <div class="survivor-slots">${survivorSlots()}</div>
      </div>
    </div>
    <button class="action secondary" id="backShop">BACK TO SHOP</button>
    <button class="action" id="beginFromLoadout">${beginLabel()}</button>
  `, { backShop: shopScreen, beginFromLoadout: startNight });

  wireBoard();
}

/* Only unheld weapons sit in the rack, so a gun is never shown twice. The Pistol
   is the exception: standard issue, always available to everyone. */
function rackCards() {
  const loose = state.armory.filter((id) => id === STARTING_WEAPON || holderOf(id).kind === 'pool');
  if (!loose.length) return '<p class="board-empty">Every weapon is assigned.</p>';
  return loose.map((id) => weaponCard(id, id === STARTING_WEAPON ? 'STANDARD ISSUE' : '')).join('');
}

function weaponCard(id, note = '') {
  const w = weapons[id];
  return `<div class="weapon-card ${picked === id ? 'picked' : ''}" draggable="true" data-weapon-card="${id}">
    <strong>${w.name}</strong>
    <small>${note || `${w.mag} RDS · ${w.damage} DMG`}</small>
  </div>`;
}

function playerSlot(slot, label) {
  const id = state.weapons[slot];
  return `<div class="drop-slot drop-zone ${id ? 'filled' : ''}" data-drop="player:${slot}">
    <span class="slot-title">${label}</span>
    ${id ? weaponCard(id) : '<p class="slot-hint">empty</p>'}
    ${id && slot === 1 ? '<button class="slot-clear" data-clear="player:1">×</button>' : ''}
  </div>`;
}

function survivorSlots() {
  if (!state.survivors.length) {
    return '<p class="board-empty">No survivors yet. Spend dawn hours searching.</p>';
  }
  return state.survivors.map((survivor) => {
    const id = survivorWeapon(survivor);
    const custom = id !== STARTING_WEAPON;
    return `<div class="drop-slot drop-zone survivor ${custom ? 'filled' : ''}" data-drop="survivor:${survivor.id}">
      <span class="slot-title">${survivor.name}</span>
      ${weaponCard(id, custom ? '' : 'STANDARD ISSUE')}
      ${custom ? `<button class="slot-clear" data-clear="survivor:${survivor.id}">×</button>` : ''}
    </div>`;
  }).join('');
}

/** `player:1` / `survivor:mechanic` / `pool` → a moveWeapon target. */
function parseTarget(token) {
  if (token === 'pool') return { kind: 'pool' };
  const [kind, rest] = token.split(':');
  return kind === 'player' ? { kind: 'player', slot: Number(rest) } : { kind: 'survivor', id: rest };
}

function wireBoard() {
  const overlay = elements.overlay;

  overlay.querySelectorAll('[data-weapon-card]').forEach((card) => {
    const id = card.dataset.weaponCard;
    card.ondragstart = (event) => {
      picked = id;
      event.dataTransfer?.setData('text/plain', id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    };
    card.ondragend = () => card.classList.remove('dragging');
    // Tap path: pick up, or put the same weapon back down.
    card.onclick = (event) => {
      event.stopPropagation();
      picked = picked === id ? null : id;
      loadoutScreen();
    };
  });

  overlay.querySelectorAll('[data-drop]').forEach((zone) => {
    zone.ondragover = (event) => {
      event.preventDefault();
      zone.classList.add('drop-hover');
    };
    zone.ondragleave = () => zone.classList.remove('drop-hover');
    zone.ondrop = (event) => {
      event.preventDefault();
      zone.classList.remove('drop-hover');
      // Fall back to `picked`: some browsers withhold dataTransfer on drop.
      const id = event.dataTransfer?.getData('text/plain') || picked;
      if (id) drop(id, zone.dataset.drop);
    };
    zone.onclick = () => {
      if (picked) drop(picked, zone.dataset.drop);
    };
  });

  overlay.querySelectorAll('[data-clear]').forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      const target = parseTarget(button.dataset.clear);
      if (target.kind === 'survivor') unassignSurvivor(target.id);
      else clearPlayerSlot(target.slot);
      picked = null;
      loadoutScreen();
    };
  });
}

function drop(id, token) {
  moveWeapon(id, parseTarget(token));
  picked = null;
  loadoutScreen();
}
