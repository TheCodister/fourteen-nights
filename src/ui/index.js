/* Wires simulation events to screens. This is the only bridge between src/game
   and src/ui — the game layer never imports a screen. */
import { on, EVENTS } from '../core/events.js';
import { toggleSfx, toggleMusic, isSfxOn, isMusicOn, unlock, audioAvailable } from '../core/audio.js';
import { playMusic, currentMood } from '../core/music.js';
import { state } from '../core/state.js';
import { difficultyOf } from '../data/difficulty.js';
import { elements, clearOverlay, showHud, setStatus, pad } from './dom.js';
import { dawnScreen } from './screens/dawn.js';
import { gameOverScreen, victoryScreen } from './screens/endings.js';

export function bindUi() {
  on(EVENTS.NIGHT_START, ({ night }) => {
    clearOverlay();
    showHud(true);
    setStatus(`HOLD UNTIL DAWN — NIGHT ${pad(night)} · ${difficultyOf(state.difficulty).name}`);
    playMusic('night');
  });

  on(EVENTS.NIGHT_SURVIVED, () => {
    showHud(false);
    playMusic('menu');
    dawnScreen();
  });

  on(EVENTS.SURVIVOR_DOWN, ({ name }) => {
    setStatus(`${name.toUpperCase()} IS DOWN — REACH THEM TO REVIVE`);
  });

  on(EVENTS.SURVIVOR_LOST, ({ name }) => {
    setStatus(`${name.toUpperCase()} DIDN'T MAKE IT`);
  });

  on(EVENTS.RUN_OVER, () => {
    showHud(false);
    playMusic('menu');
    gameOverScreen();
  });

  on(EVENTS.RUN_WON, () => {
    showHud(false);
    playMusic('menu');
    victoryScreen();
  });

  if (!audioAvailable()) {
    elements.soundButton.textContent = 'SOUND: N/A';
    elements.musicButton.textContent = 'MUSIC: N/A';
  }

  elements.soundButton.onclick = () => {
    elements.soundButton.textContent = `SOUND: ${toggleSfx() ? 'ON' : 'OFF'}`;
  };
  elements.musicButton.onclick = () => {
    const on = toggleMusic();
    elements.musicButton.textContent = `MUSIC: ${on ? 'ON' : 'OFF'}`;
    if (on) playMusic(currentMood() || 'menu');
  };

  /* Browsers only allow an AudioContext to start inside a user gesture, so the
     first click anywhere builds the graph and kicks the menu theme off. */
  const wake = () => {
    unlock();
    if (isMusicOn()) playMusic(currentMood() || 'menu');
    if (!isSfxOn()) elements.soundButton.textContent = 'SOUND: OFF';
    window.removeEventListener('pointerdown', wake);
  };
  window.addEventListener('pointerdown', wake);
}
