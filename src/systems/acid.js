/* Spitter projectiles. Only the player can be hit — bots are scenery to acid.

   A spit is aimed at where the player stands when it leaves the spitter, then
   travels a fixed arc to that spot. The renderer draws a shrinking marker on the
   landing point, so a spit is dodgeable information rather than a random tax.
   Whatever a spit hits, it leaves a puddle: standing in one costs health, so the
   usable yard shrinks as spitters work it over. */
import { PLAYER_HIT_RADIUS, PLAYER_BOUNDS } from '../config.js';
import { state } from '../core/state.js';
import { burst, bloodHit } from './particles.js';

export const ACID = {
  damage: 18,
  /** Travel speed, converted to a flight time at spawn. */
  speed: 470,
  minFlight: 0.4,
  /** Height of the lob at its peak, in pixels. */
  arc: 130,
  puddleRadius: 44,
  puddleGrowth: 8,
  puddleMaxRadius: 68,
  puddleLife: 4,
  puddleDps: 14,
  /** Puddles nearer than this to a new splash are refreshed, not stacked. */
  mergeDistance: 30
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
    if (!direct && a.progress < 1) continue;

    list.splice(i, 1);
    splash(direct ? a.x : a.tx, direct ? a.y : a.ty);
    if (direct) {
      state.player.hp -= ACID.damage;
      burst(a.x, a.y, '#c8ff58', 10, 80);
      // The player bleeds too, along the spit's line of travel.
      bloodHit(a.x, a.y, Math.atan2(a.ty - a.y0, a.tx - a.x0), false, state.player.y + 26);
      if (state.player.hp <= 0) return true;
    }
  }
  return updatePuddles(dt);
}

/** Lays down a puddle, merging into a neighbour so overlaps never stack damage. */
function splash(x, y) {
  burst(x, y, '#c8ff58', 8, 70);
  const existing = state.puddles.find((p) => Math.hypot(p.x - x, p.y - y) < ACID.mergeDistance);
  if (existing) {
    existing.life = existing.maxLife;
    existing.r = Math.min(ACID.puddleMaxRadius, existing.r + ACID.puddleGrowth);
    return;
  }
  state.puddles.push({ x, y, r: ACID.puddleRadius, life: ACID.puddleLife, maxLife: ACID.puddleLife });
}

/** @returns {boolean} true when a puddle finished the player off. */
function updatePuddles(dt) {
  const list = state.puddles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) {
      list.splice(i, 1);
      continue;
    }
    if (Math.hypot(p.x - state.player.x, p.y - state.player.y) < p.r + PLAYER_HIT_RADIUS * 0.4) {
      state.player.hp -= ACID.puddleDps * dt;
      if (state.player.hp <= 0) return true;
    }
  }
  return false;
}
