/* Wires simulation events to screens. This is the only bridge between src/game
   and src/ui — the game layer never imports a screen. */
import { on, EVENTS } from '../core/events.js';
import { toggleAudio } from '../core/audio.js';
import { elements, clearOverlay, showHud, setStatus, pad } from './dom.js';
import { dawnScreen } from './screens/dawn.js';
import { gameOverScreen, victoryScreen } from './screens/endings.js';

export function bindUi() {
  on(EVENTS.NIGHT_START, ({ night }) => {
    clearOverlay();
    showHud(true);
    setStatus(`HOLD UNTIL DAWN — NIGHT ${pad(night)}`);
  });

  on(EVENTS.NIGHT_SURVIVED, () => {
    showHud(false);
    dawnScreen();
  });

  on(EVENTS.RUN_OVER, () => {
    showHud(false);
    gameOverScreen();
  });

  on(EVENTS.RUN_WON, () => {
    showHud(false);
    victoryScreen();
  });

  elements.soundButton.onclick = (event) => {
    event.target.textContent = `SOUND: ${toggleAudio() ? 'ON' : 'OFF'}`;
  };
}
