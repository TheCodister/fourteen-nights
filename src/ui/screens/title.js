import { createState, setState, state } from '../../core/state.js';
import { saveDifficulty } from '../../core/storage.js';
import { difficulties, difficultyOf } from '../../data/difficulty.js';
import { resetRun } from '../../game/run.js';
import { elements, showOverlay, setStatus, showHud } from '../dom.js';
import { cacheScreen } from './cache.js';

export function titleScreen() {
  setState(createState());
  setStatus('THE ROAD TO RESCUE');
  showHud(false);
  render();
}

/** Re-rendered on every pick so the selected card and the start label follow it. */
function render() {
  const chosen = difficultyOf(state.difficulty);
  const cards = Object.entries(difficulties).map(([id, mode]) => `
    <button class="difficulty ${id === state.difficulty ? 'selected' : ''}" data-difficulty="${id}">
      <strong>${mode.name}</strong>
      <em>${mode.tagline}</em>
      <small>${mode.copy}</small>
    </button>`).join('');

  showOverlay(`
    <div class="overline">A DARKLY COMIC SURVIVAL SHOOTER</div>
    <h1>FOURTEEN<br>NIGHTS</h1>
    <p>Hold the barricade. Make every headshot count. Rescue arrives in fourteen dawns—assuming you do.</p>
    <div class="difficulty-row">${cards}</div>
    <button class="action" id="start">START A NEW RUN ON ${chosen.name}</button>
    <button class="action secondary" id="upgrades">SPEND SCRAP</button>
    <div class="stat-line">${state.scrap} SCRAP BANKED &nbsp; / &nbsp; PERMANENT UPGRADES ACTIVE</div>
  `, { start: resetRun, upgrades: cacheScreen });

  elements.overlay.querySelectorAll('[data-difficulty]').forEach((button) => {
    button.onclick = () => {
      /* Persisted, not just held in state: resetRun() builds a fresh state and
         would otherwise discard the pick. */
      saveDifficulty(button.dataset.difficulty);
      state.difficulty = button.dataset.difficulty;
      render();
    };
  });
}
