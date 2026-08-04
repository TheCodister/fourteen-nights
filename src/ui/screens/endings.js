/* Death and rescue screens. */
import { FINAL_NIGHT } from '../../config.js';
import { state } from '../../core/state.js';
import { SCRAP } from '../../data/upgrades.js';
import { resetRun } from '../../game/run.js';
import { showOverlay, pad } from '../dom.js';

export function gameOverScreen() {
  showOverlay(`
    <div class="overline">THE BITE WAS FATAL</div>
    <h1>YOU MADE IT<br>TO NIGHT ${pad(state.night)}</h1>
    <p>The rescue keeps circling. Your permanent Scrap has been banked—make the next stand stronger.</p>
    <div class="stat-line">${state.scrap} TOTAL SCRAP &nbsp; / &nbsp; ${state.killed} KILLS
      &nbsp; / &nbsp; BEST STREAK ${state.streakBest} HEADSHOTS</div>
    <button class="action" id="again">TRY AGAIN</button>
  `, { again: resetRun });
}

export function victoryScreen() {
  showOverlay(`
    <div class="overline">NIGHT ${FINAL_NIGHT} COMPLETE</div>
    <h1>RESCUE<br>ARRIVED.</h1>
    <p>You put down the Passenger, climbed the rope ladder, and left the neighborhood to its bad decisions.</p>
    <div class="stat-line">+${SCRAP.victory} SCRAP &nbsp; / &nbsp; ${state.killed} ZOMBIES PUT TO REST
      &nbsp; / &nbsp; BEST STREAK ${state.streakBest} HEADSHOTS</div>
    <button class="action" id="again">SURVIVE AGAIN</button>
  `, { again: resetRun });
}
