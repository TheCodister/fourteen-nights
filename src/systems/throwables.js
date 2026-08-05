/* Explosive ordnance: grenades, molotovs and rockets.

   These are lobbed at a point rather than fired along a ray, so they reuse the
   spitter's arc: launch, telegraph the landing spot, detonate on arrival. The
   player aims with the cursor, survivors aim at whatever they were shooting at.

   No friendly fire — a blast never touches the player or the survivor line. Only
   the Bloater's own burst hurts your side. */
import { W, H } from '../config.js';
import { state } from '../core/state.js';
import { burst, mist } from './particles.js';
import { addZone } from './zones.js';
import { killZombie } from './zombies.js';

const FLIGHT_SPEED = 640;
const MIN_FLIGHT = 0.28;
const ARC = 120;

/** Lobs `w` from (x,y) toward (tx,ty). Clamped so nothing lands off-screen. */
export function throwOrdnance(x, y, tx, ty, w, bot = false) {
  const targetX = Math.max(8, Math.min(W - 8, tx));
  const targetY = Math.max(180, Math.min(H - 20, ty));
  state.throwables.push({
    x, y, x0: x, y0: y,
    tx: targetX, ty: targetY,
    t: 0,
    progress: 0,
    flight: Math.max(MIN_FLIGHT, Math.hypot(targetX - x, targetY - y) / FLIGHT_SPEED),
    kind: w.throwable.kind,
    radius: w.throwable.radius,
    damage: w.damage,
    color: w.color,
    bot
  });
}

export function updateThrowables(dt) {
  const list = state.throwables;
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i];
    o.t += dt;
    o.progress = Math.min(1, o.t / o.flight);
    o.x = o.x0 + (o.tx - o.x0) * o.progress;
    o.y = o.y0 + (o.ty - o.y0) * o.progress - Math.sin(o.progress * Math.PI) * ARC;
    o.spin = (o.spin || 0) + dt * 12;

    if (o.progress < 1) continue;
    list.splice(i, 1);
    if (o.kind === 'fire') addZone('fire', o.tx, o.ty, o.radius);
    else detonate(o);
  }
}

/* Area damage with linear falloff. Credited as a non-player kill so a grenade
   cannot inflate the headshot streak. */
function detonate(o) {
  burst(o.x, o.y, '#ffd08a', 26, 300);
  burst(o.x, o.y, o.color, 18, 190);
  mist(o.x, o.y, 8, o.radius * 0.5);
  state.shake = Math.max(state.shake, 12);

  for (const z of [...state.zombies]) {
    const distance = Math.hypot(z.x - o.x, z.y - o.y);
    if (distance > o.radius + z.r) continue;
    z.hp -= o.damage * Math.max(0.15, 1 - distance / (o.radius + z.r));
    if (z.hp <= 0) killZombie(z, false, true);
  }
}
