/* Player movement, clamped to the defended yard. */
import { PLAYER_BOUNDS } from '../config.js';
import { state } from '../core/state.js';
import { moveAxis } from '../core/input.js';
import { upgrades } from '../data/upgrades.js';
import { PERKS } from '../data/survivors.js';
import { hasSurvivor, rank } from '../game/loadout.js';

const BASE_SPEED = 230;
/** Strides per second, consumed by the renderer's leg cycle. */
const STEP_RATE = 9;

export function updatePlayer(dt) {
  const cook = PERKS.cook;
  const sprinting = hasSurvivor('cook') && state.elapsed < cook.duration;
  const speed = BASE_SPEED
    * (1 + rank('legs') * upgrades.legs.step)
    * (sprinting ? cook.speedMultiplier : 1);

  const move = moveAxis();
  const length = Math.hypot(move.x, move.y);
  state.player.moving = length > 0;
  if (state.player.moving) {
    /* Normalise the direction but keep the magnitude, capped at 1: a diagonal on
       the keyboard is not faster than a straight line, and a half-pushed thumb
       stick walks at half speed. */
    const scale = Math.min(1, length) / length;
    state.player.x += move.x * scale * speed * dt;
    state.player.y += move.y * scale * speed * dt;
    // Advances only while walking, so the legs settle when the player stops.
    state.player.step += dt * STEP_RATE * Math.min(1, length);
  }
  state.player.x = Math.max(PLAYER_BOUNDS.minX, Math.min(PLAYER_BOUNDS.maxX, state.player.x));
  state.player.y = Math.max(PLAYER_BOUNDS.minY, Math.min(PLAYER_BOUNDS.maxY, state.player.y));
}
