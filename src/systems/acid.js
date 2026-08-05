/* Spitter projectiles.

   A spit is aimed at where the player stands when it leaves the spitter, then
   travels a fixed arc to that spot. The renderer draws a shrinking marker on the
   landing point, so a spit is dodgeable information rather than a random tax.
   Whatever a spit hits leaves an acid zone — and acid now burns survivors too,
   not just the player, so a spitter left alive thins the line. */
import { PLAYER_HIT_RADIUS, PLAYER_BOUNDS } from '../config.js';
import { state } from '../core/state.js';
import { burst, bloodHit } from './particles.js';
import { addZone, updateZones } from './zones.js';
import { hurtBot } from './bots.js';

export const ACID = {
  damage: 18,
  /** Travel speed, converted to a flight time at spawn. */
  speed: 470,
  minFlight: 0.4,
  /** Height of the lob at its peak, in pixels. */
  arc: 130
};

/** Launches a spit from `z` at the player's current position. */
export function spitAcid(z) {
  const tx = Math.max(PLAYER_BOUNDS.minX, Math.min(PLAYER_BOUNDS.maxX, state.player.x));
  const ty = Math.max(PLAYER_BOUNDS.minY, Math.min(PLAYER_BOUNDS.maxY, state.player.y));
  state.acid.push({
    x: z.x, y: z.y, x0: z.x, y0: z.y, tx, ty,
    t: 0,
    progress: 0,
    flight: Math.max(ACID.minFlight, Math.hypot(tx - z.x, ty - z.y) / ACID.speed)
  });
}

/** @returns {boolean} true when the acid killed the player. */
export function updateAcid(dt) {
  const list = state.acid;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    a.t += dt;
    a.progress = Math.min(1, a.t / a.flight);
    a.x = a.x0 + (a.tx - a.x0) * a.progress;
    a.y = a.y0 + (a.ty - a.y0) * a.progress - Math.sin(a.progress * Math.PI) * ACID.arc;

    const direct = Math.hypot(a.x - state.player.x, a.y - state.player.y) < PLAYER_HIT_RADIUS;
    const struck = direct ? null : botUnder(a);

    if (!direct && !struck && a.progress < 1) continue;

    list.splice(i, 1);
    const landX = direct ? a.x : struck ? struck.x : a.tx;
    const landY = direct ? a.y : struck ? struck.y : a.ty;
    addZone('acid', landX, landY);
    burst(landX, landY, '#c8ff58', 8, 70);

    if (struck) {
      hurtBot(struck, ACID.damage);
    } else if (direct) {
      state.player.hp -= ACID.damage;
      burst(a.x, a.y, '#c8ff58', 10, 80);
      bloodHit(a.x, a.y, Math.atan2(a.ty - a.y0, a.tx - a.x0), false, state.player.y + 26);
      if (state.player.hp <= 0) return true;
    }
  }

  return updateZones(dt);
}

/** A standing survivor the spit has flown into. */
function botUnder(a) {
  return state.bots.find((bot) => !bot.downed && Math.hypot(a.x - bot.x, a.y - bot.y) < 24) || null;
}
