/* Pause overlay, bound to Escape, plus the way out of a run.

   Quitting to the menu is the one action that deliberately discards a run — a
   refresh or a crash resumes from the last checkpoint, but this does not — so it
   asks a second time before doing it. Banked Scrap and permanent upgrades are
   never at risk, and the confirm says so, because "lose your progress" otherwise
   reads as if it wipes everything. */
import { state } from '../../core/state.js';
import { releaseInput } from '../../core/input.js';
import { pauseNight, resumeNight } from '../../game/night.js';
import { abandonRun } from '../../game/run.js';
import { showOverlay, clearOverlay, pad } from '../dom.js';
import { titleScreen } from './title.js';

export function togglePause() {
  if (state?.scene === 'playing') pauseScreen();
  else if (state?.scene === 'paused') resume();
}

function pauseScreen() {
  if (state.scene !== 'paused' && !pauseNight()) return;
  releaseInput();
  showOverlay(`
    <div class="overline">NIGHT ${pad(state.night)} ON HOLD</div>
    <h1>PAUSED</h1>
    <p>The barricade and the horde are frozen. Take a breath.</p>
    <button class="action" id="resumeGame">RESUME <small>ESC</small></button>
    <button class="action secondary" id="quitToMenu">RETURN TO MENU</button>
  `, { resumeGame: resume, quitToMenu: confirmQuitScreen });
}

function confirmQuitScreen() {
  showOverlay(`
    <div class="overline">ABANDON THE RUN?</div>
    <h1>YOU LOSE<br>NIGHT ${pad(state.night)}</h1>
    <p>Returning to the menu throws this run away — the armory, your survivors and
       the nights you have held. It cannot be picked up again.<br>
       <b style="color:#c8ff58">${state.scrap} Scrap</b> already banked, and every permanent
       upgrade, are kept.</p>
    <button class="action" id="reallyQuit">ABANDON RUN</button>
    <button class="action secondary" id="keepPlaying">KEEP PLAYING</button>
  `, { reallyQuit: quit, keepPlaying: pauseScreen });
}

function quit() {
  abandonRun();
  titleScreen();
}

function resume() {
  if (resumeNight()) clearOverlay();
}
