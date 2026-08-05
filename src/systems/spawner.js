/* Spawn director: what shows up, when, and how fast the waves tighten. */
import { ACTOR_SCALE, SPAWN_ZONE, NIGHT_LENGTH } from '../config.js';
import { state } from '../core/state.js';
import { types, bosses } from '../data/zombies.js';
import { scaleZombie, hordeBoostFor } from '../data/difficulty.js';

/** Spawn interval eases from `start` to `end` seconds across the night. */
const CADENCE = {
  startBase: 2.75, startPerNight: 0.17, startFloor: 0.32,
  endBase: 1.45, endPerNight: 0.085, endFloor: 0.2,
  bossSlowdown: 1.25
};
const BATCH = { base: 1, perNights: 3, max: 5 };

export function bossForNight(night) {
  return bosses[night] ?? null;
}

/** Weighted pick across the types unlocked by the current night. */
export function chooseType() {
  const night = state.night;
  const pool = [];
  for (const [id, type] of Object.entries(types)) {
    if (night < type.unlockNight) continue;
    const penalty = type.earlyPenalty && night < type.earlyPenalty.beforeNight ? type.earlyPenalty.divisor : 1;
    const share = Math.max(1, Math.round(type.weight / penalty));
    for (let i = 0; i < share; i++) pool.push(id);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function spawnZombie(typeName) {
  const type = types[typeName] || types.shambler;
  // Difficulty owns hp/headHp; the spread must not leak the unscaled values.
  const { hp, headHp } = scaleZombie(type, state.difficulty);
  state.zombies.push({
    ...type,
    type: typeName,
    r: type.r * ACTOR_SCALE,
    x: SPAWN_ZONE.x + Math.random() * SPAWN_ZONE.xJitter,
    y: SPAWN_ZONE.y + Math.random() * SPAWN_ZONE.yJitter,
    maxHp: hp,
    hp,
    boss: false,
    headHp,
    attackCd: 0,
    bob: Math.random() * 6.28
  });
}

export function spawnBoss(template) {
  const { hp, headHp } = scaleZombie(template, state.difficulty, true);
  state.zombies.push({
    ...template, boss: true, maxHp: hp, hp, headHp,
    x: 1340, y: 410, attackCd: 0, bob: 0
  });
  state.bossSpawned = true;
}

/** Escort wave dropped each time a boss crosses a quarter of its health. */
export function spawnEscort(boss) {
  for (let i = 0; i < boss.escortCount; i++) spawnZombie(boss.escortType);
}

/** Advances the spawn clock; call only while the spawn window is open. */
export function runSpawnDirector(dt) {
  const boss = bossForNight(state.night);
  if (boss && !state.bossSpawned && state.elapsed >= boss.spawnAt) spawnBoss(boss);

  state.spawnClock -= dt;
  if (state.spawnClock > 0) return;

  /* Nightmare adds to every wave and shortens the gap between them. The cap
     lifts by the same bonus, or the boost would vanish on later nights. */
  const boost = hordeBoostFor(state.difficulty, state.night);
  const bonus = boost ? boost.batchBonus : 0;
  const batch = Math.min(BATCH.max + bonus, BATCH.base + bonus + Math.floor((state.night - 1) / BATCH.perNights));
  for (let i = 0; i < batch; i++) spawnZombie(chooseType());

  const start = Math.max(CADENCE.startFloor, CADENCE.startBase - state.night * CADENCE.startPerNight);
  const end = Math.max(CADENCE.endFloor, CADENCE.endBase - state.night * CADENCE.endPerNight);
  const progress = Math.min(1, state.elapsed / NIGHT_LENGTH);
  state.spawnClock = (start + (end - start) * progress)
    * (state.bossSpawned ? CADENCE.bossSlowdown : 1)
    * (boost ? boost.intervalScale : 1);
}
