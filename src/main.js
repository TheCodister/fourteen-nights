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
import { shoot } from './systems/combat.js';
import { canvas } from './render/canvas.js';
import { render } from './render/scene.js';
import { bindUi } from './ui/index.js';
import { updateHud } from './ui/hud.js';
import { titleScreen } from './ui/screens/title.js';
import { togglePause } from './ui/screens/pause.js';

bindUi();
bindInput(canvas, {
  onFire: () => {
    if (state.scene === 'playing') shoot();
  },
  onTogglePause: togglePause
});

titleScreen();
startLoop(updateNight, () => {
  render();
  updateHud();
});
