/* Pause overlay, bound to Escape. */
import { state } from '../../core/state.js';
import { releaseMouse } from '../../core/input.js';
import { pauseNight, resumeNight } from '../../game/night.js';
import { showOverlay, clearOverlay, pad } from '../dom.js';

export function togglePause() {
  if (state?.scene === 'playing') pauseScreen();
  else if (state?.scene === 'paused') resume();
}

function pauseScreen() {
  if (!pauseNight()) return;
  releaseMouse();
  showOverlay(`
    <div class="overline">NIGHT ${pad(state.night)} ON HOLD</div>
    <h1>PAUSED</h1>
    <p>The barricade and the horde are frozen. Take a breath.</p>
    <button class="action" id="resumeGame">RESUME <small>ESC</small></button>
  `, { resumeGame: resume });
}

function resume() {
  if (resumeNight()) clearOverlay();
}
