/* Entry point: bind input and UI, then run one loop over update + render.

   Layer rules, in dependency order:
     config/data  — constants and tables, import nothing
     core         — state, storage, events, input, audio, loop
     systems      — per-frame simulation over state
     game         — run/night/dawn orchestration; emits events
     render       — reads state, draws to canvas
     ui           — DOM screens and HUD; listens for events
   Nothing in game/ or systems/ may import from ui/ or render/. */
import { state } from './core/state.js';
import { bindInput } from './core/input.js';
import { startLoop } from './core/loop.js';
import { updateNight } from './game/night.js';
import { shoot, reload, swapWeapon } from './systems/combat.js';
import { canvas } from './render/canvas.js';
import { render } from './render/scene.js';
import { bindUi } from './ui/index.js';
import { elements } from './ui/dom.js';
import { updateHud } from './ui/hud.js';
import { titleScreen } from './ui/screens/title.js';
import { togglePause } from './ui/screens/pause.js';

bindUi();
bindInput(canvas, {
  onFire: () => {
    if (state.scene === 'playing') shoot();
  },
  onTogglePause: togglePause,
  /* A media query alone is not enough: touchscreen laptops report `pointer:
     fine`, so the controls would never appear for them. An actual touch is the
     only reliable signal, and it reveals them for the rest of the session. */
  onFirstTouch: () => document.body.classList.add('touch-active')
});

/* Touch has no R or 1/2 keys and no Escape, so those three actions get on-screen
   buttons. Wired here rather than in ui/, because this is the one place that
   already bridges input to the simulation. */
const bindTouchButton = (element, action) => {
  if (!element) return;
  element.onclick = (event) => {
    event.preventDefault();
    if (state.scene === 'playing' || action === togglePause) action();
  };
};
bindTouchButton(elements.touchReload, reload);
bindTouchButton(elements.touchSwap, swapWeapon);
bindTouchButton(elements.touchPause, togglePause);

titleScreen();
startLoop(updateNight, () => {
  render();
  updateHud();
});
