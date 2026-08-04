/* Player movement, clamped to the defended yard. */
import { PLAYER_BOUNDS } from '../config.js';
import { state } from '../core/state.js';
import { axis } from '../core/input.js';
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

  const dx = axis('a', 'd');
  const dy = axis('w', 's');
  state.player.moving = !!(dx || dy);
  if (state.player.moving) {
    const length = Math.hypot(dx, dy);
    state.player.x += dx / length * speed * dt;
    state.player.y += dy / length * speed * dt;
    // Advances only while walking, so the legs settle when the player stops.
    state.player.step += dt * STEP_RATE;
  }
  state.player.x = Math.max(PLAYER_BOUNDS.minX, Math.min(PLAYER_BOUNDS.maxX, state.player.x));
  state.player.y = Math.max(PLAYER_BOUNDS.minY, Math.min(PLAYER_BOUNDS.maxY, state.player.y));
}
