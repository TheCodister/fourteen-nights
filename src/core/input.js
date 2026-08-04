/* Raw input capture. Knows about the canvas and nothing about the game rules —
   scene-dependent reactions are passed in as callbacks by src/main.js. */
import { W, H } from '../config.js';

const keys = new Set();
export const mouse = { x: 400, y: 360, down: false };

export function isDown(key) {
  return keys.has(key);
}

/** Reads a key and clears it, for actions that must not repeat per frame. */
export function consumeKey(key) {
  if (!keys.has(key)) return false;
  keys.delete(key);
  return true;
}

export function axis(negative, positive) {
  return (keys.has(positive) ? 1 : 0) - (keys.has(negative) ? 1 : 0);
}

export function releaseMouse() {
  mouse.down = false;
}

export function bindInput(canvas, { onFire, onTogglePause }) {
  const aimAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * W / rect.width;
    mouse.y = (event.clientY - rect.top) * H / rect.height;
  };

  const beginFire = (event) => {
    event.preventDefault();
    aimAt(event);
    mouse.down = true;
    onFire();
  };

  canvas.addEventListener('pointermove', aimAt);
  canvas.addEventListener('pointerdown', (event) => {
    beginFire(event);
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointerup', (event) => {
    mouse.down = false;
    canvas.releasePointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointercancel', releaseMouse);

  // Mouse fallback keeps desktop browsers and automation surfaces responsive;
  // the fire cooldown prevents duplicate pointer/mouse shots.
  canvas.addEventListener('mousemove', aimAt);
  canvas.addEventListener('mousedown', beginFire);
  window.addEventListener('mouseup', releaseMouse);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onTogglePause();
      return;
    }
    keys.add(event.key.toLowerCase());
    if ([' ', 'arrowup', 'arrowdown'].includes(event.key.toLowerCase())) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
}
