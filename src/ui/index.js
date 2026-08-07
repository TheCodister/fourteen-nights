/* Wires simulation events to screens. This is the only bridge between src/game
   and src/ui — the game layer never imports a screen. */
import { on, EVENTS } from '../core/events.js';
import { toggleSfx, toggleMusic, isMusicOn, unlock, audioAvailable } from '../core/audio.js';
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
    /* No AudioContext at all. Label and disable both, rather than leaving live
       buttons that would flip to "ON" and claim sound the browser cannot make. */
    elements.soundButton.textContent = 'SOUND: N/A';
    elements.musicButton.textContent = 'MUSIC: N/A';
    elements.soundButton.disabled = true;
    elements.musicButton.disabled = true;
    return;
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
     first click builds the graph and kicks the menu theme off.

     The listener stays attached rather than firing once: a context can be
     suspended again later — a backgrounded tab on mobile, an OS audio
     interruption — and every cue silently no-ops while it is. Without a standing
     resume path the only recovery would be toggling sound off and on. */
  const wake = () => {
    unlock();
    if (isMusicOn()) playMusic(currentMood() || 'menu');
  };
  window.addEventListener('pointerdown', wake);
  document.addEventListener?.('visibilitychange', () => {
    if (!document.hidden) unlock();
  });
}
