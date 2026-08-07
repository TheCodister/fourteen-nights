/* Raw input capture. Knows about the canvas and nothing about the game rules —
   scene-dependent reactions are passed in as callbacks by src/main.js.

   Touch is handled through the same pointer events rather than a separate code
   path. A touch that starts on the left of the canvas becomes a virtual stick
   for movement; anywhere else it aims and fires. Tracking pointer ids keeps the
   two independent, so one thumb can walk while the other shoots.

   Mouse behaviour is unchanged: moving aims, pressing fires, wherever you are. */
import { W, H } from '../config.js';

const keys = new Set();
export const mouse = { x: 400, y: 360, down: false };

/** Virtual movement stick, in -1..1 per axis. */
export const stick = { active: false, dx: 0, dy: 0 };

/** Left fraction of the canvas reserved for the movement thumb. */
const MOVE_ZONE = 0.42;
/** Drag distance in world pixels for full deflection. */
const STICK_RANGE = 90;
const DEADZONE = 0.16;

let stickId = null;
let stickOriginX = 0;
let stickOriginY = 0;
const aiming = new Set();
let touchSeen = false;

/** True once the player has used touch, so the UI can show its controls. */
export function usingTouch() {
  return touchSeen;
}

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

/**
 * Movement request from whichever device is in use. Keys win when pressed; the
 * stick is analog, so its magnitude is meaningful and the caller must not
 * normalise it away.
 */
export function moveAxis() {
  const x = axis('a', 'd');
  const y = axis('w', 's');
  if (x || y) return { x, y };
  if (stick.active && Math.hypot(stick.dx, stick.dy) > DEADZONE) {
    return { x: stick.dx, y: stick.dy };
  }
  return { x: 0, y: 0 };
}

export function releaseMouse() {
  mouse.down = false;
  aiming.clear();
}

/** Drops any in-flight touch, so pausing cannot leave the player walking. */
export function releaseInput() {
  releaseMouse();
  stickId = null;
  stick.active = false;
  stick.dx = 0;
  stick.dy = 0;
}

export function bindInput(canvas, { onFire, onTogglePause, onFirstTouch }) {
  const toWorld = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * W / rect.width,
      y: (event.clientY - rect.top) * H / rect.height
    };
  };

  const aimAt = (event) => {
    const point = toWorld(event);
    mouse.x = point.x;
    mouse.y = point.y;
  };

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const point = toWorld(event);

    if (event.pointerType === 'touch') {
      if (!touchSeen) {
        touchSeen = true;
        onFirstTouch?.();
      }
      // First thumb down on the left half drives movement and never fires.
      if (point.x < W * MOVE_ZONE && stickId === null) {
        stickId = event.pointerId;
        stickOriginX = point.x;
        stickOriginY = point.y;
        stick.active = true;
        stick.dx = 0;
        stick.dy = 0;
        canvas.setPointerCapture?.(event.pointerId);
        return;
      }
    }

    aiming.add(event.pointerId);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.down = true;
    onFire();
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId === stickId) {
      const point = toWorld(event);
      stick.dx = Math.max(-1, Math.min(1, (point.x - stickOriginX) / STICK_RANGE));
      stick.dy = Math.max(-1, Math.min(1, (point.y - stickOriginY) / STICK_RANGE));
      return;
    }
    // A touch only aims while it is held; a mouse aims whenever it moves.
    if (event.pointerType !== 'touch' || aiming.has(event.pointerId)) aimAt(event);
  });

  const endPointer = (event) => {
    canvas.releasePointerCapture?.(event.pointerId);
    if (event.pointerId === stickId) {
      stickId = null;
      stick.active = false;
      stick.dx = 0;
      stick.dy = 0;
      return;
    }
    aiming.delete(event.pointerId);
    if (!aiming.size) mouse.down = false;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  /* Mouse fallback keeps desktop browsers and automation surfaces responsive.
     Skipped once touch has been seen, since touch devices also emit synthetic
     mouse events and would otherwise fire a second shot per tap. */
  canvas.addEventListener('mousemove', (event) => {
    if (!touchSeen) aimAt(event);
  });
  canvas.addEventListener('mousedown', (event) => {
    if (touchSeen) return;
    event.preventDefault();
    aimAt(event);
    mouse.down = true;
    onFire();
  });
  window.addEventListener('mouseup', () => {
    if (!touchSeen) releaseMouse();
  });
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
