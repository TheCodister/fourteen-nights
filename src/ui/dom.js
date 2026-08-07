/* Every DOM lookup in the app lives here. Nothing else queries the document. */
const $ = (selector) => document.querySelector(selector);

export const elements = {
  overlay: $('#overlay'),
  hud: $('#hud'),
  status: $('#topStatus'),
  soundButton: $('#soundButton'),
  musicButton: $('#musicButton'),
  touchReload: $('#touchReload'),
  touchSwap: $('#touchSwap'),
  touchPause: $('#touchPause'),
  night: $('#nightLabel'),
  timer: $('#timerLabel'),
  cash: $('#cashLabel'),
  kills: $('#killsLabel'),
  horde: $('#hordeLabel'),
  streakBadge: $('#streakBadge'),
  barricadeBar: $('#barricadeBar'),
  barricadeText: $('#barricadeText'),
  healthBar: $('#healthBar'),
  healthText: $('#healthText'),
  reloadTrack: $('#reloadTrack'),
  reloadBar: $('#reloadBar'),
  /** One entry per carried weapon slot, in loadout order. */
  slots: [0, 1].map((slot) => ({
    root: $(`#slot${slot}`),
    name: $(`#slot${slot}Name`),
    ammo: $(`#slot${slot}Ammo`)
  }))
};

export function setStatus(text) {
  elements.status.textContent = text;
}

export function showHud(visible) {
  elements.hud.classList.toggle('hidden', !visible);
}

/** Renders an overlay panel and wires `id -> handler` click bindings. */
export function showOverlay(html, handlers = {}) {
  elements.overlay.innerHTML = `<div class="overlay-panel">${html}</div>`;
  for (const [id, handler] of Object.entries(handlers)) {
    const node = elements.overlay.querySelector(`#${id}`);
    if (node) node.onclick = handler;
  }
  return elements.overlay;
}

export function clearOverlay() {
  elements.overlay.innerHTML = '';
}

/** Two-digit night label, used in most screen headings. */
export const pad = (value) => String(value).padStart(2, '0');
