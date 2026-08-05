/* Night orchestration: starts a night, ticks every system in order, and decides
   how the night ends. Emits events instead of touching the DOM. */
import { NIGHT_LENGTH, FINAL_NIGHT, PLAYER_MAX_HP } from '../config.js';
import { state, saveProgress } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { PERKS } from '../data/survivors.js';
import { SCRAP } from '../data/upgrades.js';
import { difficultyOf } from '../data/difficulty.js';
import { hasSurvivor } from './loadout.js';
import { serviceWeapons } from '../systems/combat.js';
import { updatePlayer } from '../systems/player.js';
import { createBots, updateBots } from '../systems/bots.js';
import { runSpawnDirector } from '../systems/spawner.js';
import { updateBullets } from '../systems/bullets.js';
import { updateThrowables } from '../systems/throwables.js';
import { updateZombies } from '../systems/zombies.js';
import { updateAcid } from '../systems/acid.js';
import { updateParticles } from '../systems/particles.js';

const SPAWN_START_DELAY = 0.7;
const INTRO_SECONDS = 2.5;
const SHAKE_DECAY = 20;
/* Slow enough that one bite's pulse is visible for about a third of a second,
   and a wall of biters keeps the vignette pinned. */
const FLASH_DECAY = 1.4;
const PLAYER_SPAWN = { x: 270, y: 445 };

export function startNight() {
  state.scene = 'playing';
  state.elapsed = 0;
  state.spawnClock = SPAWN_START_DELAY;
  state.zombies = [];
  state.bullets = [];
  state.acid = [];
  state.zones = [];
  state.throwables = [];
  state.particles = [];
  state.decals = [];
  state.barrFlash = 0;
  /* Each night is its own headshot run; the best of the run is kept for the
     ending card. */
  state.streak = 0;

  Object.assign(state.player, PLAYER_SPAWN);
  state.player.hp = Math.min(PLAYER_MAX_HP, state.player.hp + (hasSurvivor('nurse') ? PERKS.nurse.dawnHeal : 0));

  state.bots = createBots();
  state.instantReload = hasSurvivor('officer');
  state.nightIntro = INTRO_SECONDS;
  state.bossSpawned = false;
  state.bossKilled = false;

  emit(EVENTS.NIGHT_START, { night: state.night });
}

export function timeLeft() {
  return NIGHT_LENGTH - state.elapsed;
}

export function pauseNight() {
  if (state.scene !== 'playing') return false;
  state.scene = 'paused';
  return true;
}

export function resumeNight() {
  if (state.scene !== 'paused') return false;
  state.scene = 'playing';
  return true;
}

export function updateNight(dt) {
  if (state.scene !== 'playing') return;
  state.elapsed += dt;
  if (state.nightIntro > 0) state.nightIntro -= dt;

  serviceWeapons(dt);
  updatePlayer(dt);
  updateBots(dt);

  const remaining = timeLeft();
  const spawnWindowOpen = remaining > 0;
  if (spawnWindowOpen) runSpawnDirector(dt);

  updateThrowables(dt);
  updateBullets(dt);
  if (updateZombies(dt, spawnWindowOpen)) return endRun();
  if (updateAcid(dt)) return endRun();

  updateParticles(dt);
  state.shake = Math.max(0, state.shake - dt * SHAKE_DECAY);
  state.barrFlash = Math.max(0, state.barrFlash - dt * FLASH_DECAY);

  if (remaining <= 0 && state.zombies.length === 0) {
    if (state.night === FINAL_NIGHT) winRun();
    else surviveNight();
  }
}

/** Scrap payouts carry the difficulty reward bonus, same as in-run cash. */
function scrapReward(amount) {
  return Math.round(amount * difficultyOf(state.difficulty).reward);
}

function surviveNight() {
  state.scene = 'between';
  const tier = Math.floor((state.night - 1) / SCRAP.tierEvery);
  state.scrap += scrapReward(SCRAP.perNight + tier * SCRAP.tierBonus);
  saveProgress();
  emit(EVENTS.NIGHT_SURVIVED, { night: state.night });
}

function endRun() {
  if (state.scene !== 'playing') return;
  state.scene = 'gameover';
  state.scrap += scrapReward(Math.max(0, (state.night - 1) * SCRAP.perNightOnDeath));
  saveProgress();
  emit(EVENTS.RUN_OVER, { night: state.night });
}

function winRun() {
  state.scene = 'victory';
  state.scrap += scrapReward(SCRAP.victory);
  saveProgress();
  emit(EVENTS.RUN_WON, { killed: state.killed });
}
