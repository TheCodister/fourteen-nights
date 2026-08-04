/* HUD refresh, driven once per rendered frame. Every node is written by property
   rather than by innerHTML, so the reload bar keeps a stable element to animate
   instead of being rebuilt underneath itself each frame. */
import { PLAYER_MAX_HP } from '../config.js';
import { state } from '../core/state.js';
import { weapons } from '../data/weapons.js';
import { STREAK, streakMultiplier } from '../data/upgrades.js';
import { ammoFor } from '../game/loadout.js';
import { timeLeft } from '../game/night.js';
import { elements, setStatus, pad } from './dom.js';

/** Fraction of a magazine at or below which the ammo readout turns red. */
const LOW_AMMO = 0.25;

export function updateHud() {
  if (state.scene !== 'playing') return;
  const left = Math.max(0, timeLeft());

  elements.night.textContent = pad(state.night);
  elements.timer.textContent = `${pad(Math.ceil(left) / 60 | 0)}:${pad(Math.ceil(left) % 60)}`;
  elements.cash.textContent = `$${state.cash}`;
  elements.kills.textContent = state.killed;
  elements.horde.textContent = state.zombies.length;

  elements.barricadeBar.style.width = `${100 * state.barricade / state.maxBarr}%`;
  elements.barricadeText.textContent = `${Math.ceil(state.barricade)} / ${state.maxBarr}`;
  elements.healthBar.style.width = `${Math.max(0, state.player.hp)}%`;
  elements.healthText.textContent = `${Math.max(0, Math.ceil(state.player.hp))} / ${PLAYER_MAX_HP}`;

  updateWeaponSlots();
  updateReload();
  updateStreak();

  if (left <= 0) setStatus(`DAWN IS BREAKING — CLEAR ${state.zombies.length} REMAINING`);
}

/* Both carried guns stay on screen: the idle slot is dimmed but still shows its
   magazine, so swapping with `2` is an informed decision instead of a gamble. */
function updateWeaponSlots() {
  elements.slots.forEach((slot, index) => {
    const id = state.weapons[index];
    const w = id ? weapons[id] : null;
    const ammo = w ? ammoFor(id) : 0;

    slot.root.classList.toggle('empty', !w);
    slot.root.classList.toggle('active', !!w && state.selected === index);
    slot.root.classList.toggle('low', !!w && ammo / w.mag <= LOW_AMMO);
    slot.name.textContent = w ? w.name : 'EMPTY';
    slot.ammo.textContent = w ? `${ammo} / ${w.mag}` : '—';
  });
}

function updateReload() {
  const reloading = state.reload > 0;
  elements.reloadTrack.classList.toggle('idle', !reloading);
  if (!reloading) return;
  const total = state.reloadTotal || state.reload;
  elements.reloadBar.style.width = `${Math.min(100, Math.max(0, 100 * (1 - state.reload / total)))}%`;
}

function updateStreak() {
  const show = state.streak >= STREAK.showAt;
  elements.streakBadge.classList.toggle('hidden', !show);
  if (!show) return;
  elements.streakBadge.textContent = `×${streakMultiplier(state.streak).toFixed(2)} · ${state.streak} HEADSHOTS`;
}
