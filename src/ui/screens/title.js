import { createState, setState, state } from '../../core/state.js';
import { resetRun } from '../../game/run.js';
import { showOverlay, setStatus, showHud } from '../dom.js';
import { cacheScreen } from './cache.js';

export function titleScreen() {
  setState(createState());
  setStatus('THE ROAD TO RESCUE');
  showHud(false);
  showOverlay(`
    <div class="overline">A DARKLY COMIC SURVIVAL SHOOTER</div>
    <h1>FOURTEEN<br>NIGHTS</h1>
    <p>Hold the barricade. Make every headshot count. Rescue arrives in fourteen dawns—assuming you do.</p>
    <button class="action" id="start">START A NEW RUN</button>
    <button class="action secondary" id="upgrades">SPEND SCRAP</button>
    <div class="stat-line">${state.scrap} SCRAP BANKED &nbsp; / &nbsp; PERMANENT UPGRADES ACTIVE</div>
  `, { start: resetRun, upgrades: cacheScreen });
}
