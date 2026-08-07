/* Short-lived debris, plus the blood decals it leaves behind.

   Particle kinds, each a different physical read:
     spark — drag only, no gravity. Muzzle flash and acid splash.
     drop  — blood droplet. Falls, stretches along its own velocity, and turns
             into a ground decal when it lands instead of blinking out.
     mist  — soft cloud that expands and thins. Headshot spray.
     gib   — tumbling chunk, lands as a decal.

   Blood is emitted along the bullet's line of travel with a smaller
   back-spatter toward the shooter: a symmetrical puff around the impact point
   reads as a sparkle, not as a hit. */
import { state } from '../core/state.js';

const DRAG = 0.92;
const GRAVITY = 640;
/** Nothing lands below the yard floor. */
const FLOOR = 706;
/** Oldest decals are dropped past this, so a long night stays bounded. */
const MAX_DECALS = 150;
const DECAL_LIFE = 16;

const BLOOD = ['#8d1019', '#a8131f', '#6b0a11', '#bd1f2b'];
const bloodColor = () => BLOOD[Math.floor(Math.random() * BLOOD.length)];

/** Muzzle flash and acid splash — the original drag-only puff. */
export function burst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 6.28;
    const magnitude = speed * (0.25 + Math.random() * 0.75);
    state.particles.push({
      x, y, color, kind: 'spark',
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      drag: DRAG,
      life: 0.25 + Math.random() * 0.45,
      maxLife: 0.7,
      r: 1 + Math.random() * 3
    });
  }
}

function droplet(x, y, angle, speed, size, landY) {
  state.particles.push({
    x, y, kind: 'drop', color: bloodColor(),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    gravity: GRAVITY,
    drag: 0.995,
    life: 0.5 + Math.random() * 0.7,
    maxLife: 1.2,
    r: size,
    landY: Math.min(FLOOR, landY)
  });
}

/**
 * Impact spray. `angle` is the bullet's direction of travel, so blood carries on
 * through the wound and a little kicks back the way it came.
 */
export function bloodHit(x, y, angle, headshot, groundY = y + 40) {
  const count = headshot ? 15 : 7;
  const cone = headshot ? 1.5 : 1.1;
  const power = headshot ? 250 : 165;
  for (let i = 0; i < count; i++) {
    droplet(x, y, angle + (Math.random() - 0.5) * cone, power * (0.35 + Math.random()),
      1.4 + Math.random() * (headshot ? 2.6 : 1.8), groundY + Math.random() * 26);
  }
  // Back-spatter, slower and tighter than the exit spray.
  for (let i = 0; i < (headshot ? 5 : 2); i++) {
    droplet(x, y, angle + Math.PI + (Math.random() - 0.5) * 1.3, power * 0.32 * (0.4 + Math.random()),
      1.2 + Math.random() * 1.4, groundY + Math.random() * 26);
  }
  if (headshot) mist(x, y, 6, 22);
}

/** Death gore: a wide arcing spray, tumbling chunks, and a pool under the body. */
export function bloodKill(x, y, r, headshot, boss = false) {
  const drops = boss ? 46 : headshot ? 26 : 18;
  const power = boss ? 300 : 210;
  const groundY = y + r * 0.8;

  for (let i = 0; i < drops; i++) {
    // Biased upward and outward, so the spray arcs before gravity takes it.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 3.4;
    droplet(x + (Math.random() - 0.5) * r * 0.6, y - r * 0.2, angle, power * (0.3 + Math.random()),
      1.6 + Math.random() * 3, groundY + Math.random() * 34);
  }

  for (let i = 0; i < (boss ? 10 : headshot ? 5 : 3); i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
    const speed = power * 0.6 * (0.4 + Math.random());
    state.particles.push({
      x, y: y - r * 0.2, kind: 'gib', color: bloodColor(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: GRAVITY,
      drag: 0.995,
      life: 1.4,
      maxLife: 1.4,
      r: 2.4 + Math.random() * (boss ? 4.5 : 2.6),
      rot: Math.random() * 6.28,
      spin: (Math.random() - 0.5) * 14,
      landY: Math.min(FLOOR, groundY + Math.random() * 30)
    });
  }

  mist(x, y - r * 0.3, boss ? 14 : 7, boss ? 46 : 28);
  addDecal(x, groundY + 4, r * (boss ? 1.15 : 0.85), r * (boss ? 0.42 : 0.3));
}

/** Soft expanding cloud. Reads as atomised blood rather than droplets. */
export function mist(x, y, count, spread) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 6.28;
    const distance = Math.random() * spread;
    state.particles.push({
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      kind: 'mist', color: bloodColor(),
      vx: Math.cos(angle) * 26,
      vy: Math.sin(angle) * 26 - 14,
      drag: 0.9,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      r: 5 + Math.random() * 9,
      grow: 22
    });
  }
}

/** Ground stain. Oldest are evicted when the cap is hit. */
export function addDecal(x, y, rx, ry) {
  state.decals.push({
    x, y,
    rx: Math.max(3, rx),
    ry: Math.max(2, ry),
    color: bloodColor(),
    life: DECAL_LIFE,
    maxLife: DECAL_LIFE
  });
  if (state.decals.length > MAX_DECALS) state.decals.splice(0, state.decals.length - MAX_DECALS);
}

export function updateParticles(dt) {
  const list = state.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.gravity) p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.drag) {
      /* Drag is defined per 60Hz frame, so it has to be raised to the number of
         frames this step represents. Multiplying once per frame instead made
         particles decelerate about 2.4x faster on a 144Hz display than on a
         60Hz one — blood behaved differently depending on the monitor. */
      const damping = Math.pow(p.drag, dt * 60);
      p.vx *= damping;
      p.vy *= damping;
    }
    if (p.spin) p.rot += p.spin * dt;
    if (p.grow) p.r += p.grow * dt;

    // Landing beats expiry: a droplet that reaches the ground leaves a mark.
    if (p.landY !== undefined && p.y >= p.landY) {
      addDecal(p.x, p.landY, p.r * 1.5, p.r * 0.7);
      list.splice(i, 1);
      continue;
    }
    if (p.life <= 0) list.splice(i, 1);
  }

  const decals = state.decals;
  for (let i = decals.length - 1; i >= 0; i--) {
    decals[i].life -= dt;
    if (decals[i].life <= 0) decals.splice(i, 1);
  }
}
