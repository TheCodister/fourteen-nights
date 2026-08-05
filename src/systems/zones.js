/* Damaging patches of ground.

   Acid pools, Bloater bile and Molotov fire are one mechanic with two targets, so
   they share a list rather than each getting their own array and loop. `harms`
   decides who suffers:

     'survivors' — the player and the survivor line (spitter acid, bloater bile)
     'zombies'   — the horde (molotov fire)

   Zones merge with a nearby zone of the same kind instead of stacking, so
   overlapping patches never multiply their damage. */
import { PLAYER_HIT_RADIUS } from '../config.js';
import { state } from '../core/state.js';
import { hurtBot } from './bots.js';
import { killZombie } from './zombies.js';

export const ZONE_KINDS = {
  acid: { harms: 'survivors', color: '#c8ff58', dps: 14, life: 4, radius: 44, maxRadius: 68, growth: 8 },
  bile: { harms: 'survivors', color: '#9ccf4a', dps: 20, life: 5, radius: 74, maxRadius: 104, growth: 10 },
  fire: { harms: 'zombies', color: '#ff8a3c', dps: 60, life: 6.5, radius: 74, maxRadius: 108, growth: 12 }
};

/** Zones nearer than this to a new one of the same kind are refreshed, not stacked. */
const MERGE_DISTANCE = 30;
/** Bots are smaller targets than the player. */
const BOT_HIT_RADIUS = 20;

/** Lays down a zone, merging into a neighbour of the same kind. */
export function addZone(kind, x, y, radiusOverride) {
  const spec = ZONE_KINDS[kind];
  if (!spec) return;

  const existing = state.zones.find((z) => z.kind === kind && Math.hypot(z.x - x, z.y - y) < MERGE_DISTANCE);
  if (existing) {
    existing.life = existing.maxLife;
    existing.r = Math.min(spec.maxRadius, existing.r + spec.growth);
    return;
  }

  state.zones.push({
    kind, x, y,
    r: radiusOverride || spec.radius,
    life: spec.life,
    maxLife: spec.life,
    harms: spec.harms,
    color: spec.color,
    dps: spec.dps
  });
}

/** @returns {boolean} true when a zone finished the player off. */
export function updateZones(dt) {
  let playerDead = false;

  for (let i = state.zones.length - 1; i >= 0; i--) {
    const zone = state.zones[i];
    zone.life -= dt;
    if (zone.life <= 0) {
      state.zones.splice(i, 1);
      continue;
    }

    if (zone.harms === 'survivors') {
      if (inside(zone, state.player.x, state.player.y, PLAYER_HIT_RADIUS * 0.4)) {
        state.player.hp -= zone.dps * dt;
        if (state.player.hp <= 0) playerDead = true;
      }
      for (const bot of [...state.bots]) {
        // A downed survivor lying in acid is already bleeding out; leave them be.
        if (bot.downed) continue;
        if (inside(zone, bot.x, bot.y, BOT_HIT_RADIUS)) hurtBot(bot, zone.dps * dt);
      }
      continue;
    }

    for (const zombie of [...state.zombies]) {
      if (!inside(zone, zombie.x, zombie.y, zombie.r * 0.6)) continue;
      zombie.hp -= zone.dps * dt;
      // Credited like a survivor kill: it should not break the player's streak.
      if (zombie.hp <= 0) killZombie(zombie, false, true);
    }
  }

  return playerDead;
}

function inside(zone, x, y, slack) {
  return Math.hypot(zone.x - x, zone.y - y) < zone.r + slack;
}
