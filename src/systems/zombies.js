/* Zombie movement, barricade chewing, spitter acid and death payouts. */
import { BARRICADE_X, PLAYER_HIT_RADIUS, SPITTER_RANGE_X } from '../config.js';
import { state } from '../core/state.js';
import { SFX } from '../core/audio.js';
import { upgrades, streakMultiplier } from '../data/upgrades.js';
import { difficultyOf } from '../data/difficulty.js';
import { PERKS } from '../data/survivors.js';
import { hasSurvivor, rank } from '../game/loadout.js';
import { bloodKill } from './particles.js';
import { spitAcid } from './acid.js';
import { spawnEscort, bossForNight } from './spawner.js';

const BARRICADE_DPS_SCALE = 0.45;
const SPIT = { cooldown: 4 };
const BOSS_ESCORT_STAGES = 4;
/* Barricade damage lands in discrete bites rather than a silent trickle: the
   average is identical (dps × interval per bite) but each bite can shake the
   screen and flash the vignette, so losing the line is something you feel. */
const BITE = { interval: 0.5, flash: 0.5, bossFlash: 1, shake: 3.5, bossShake: 9, breakShake: 15 };

export function killZombie(z, headshot = false, byBot = false) {
  const index = state.zombies.indexOf(z);
  if (index < 0) return;
  state.zombies.splice(index, 1);

  /* Only the player's own shooting moves the streak — with six survivors firing,
     their body shots would otherwise wipe it out constantly. */
  if (!byBot) {
    if (headshot) state.streakBest = Math.max(state.streakBest, ++state.streak);
    else state.streak = 0;
  }

  SFX.kill(headshot);
  const cashBonus = (hasSurvivor('accountant') ? PERKS.accountant.cashMultiplier : 1)
    * (headshot ? 1 + rank('clean') * upgrades.clean.step : 1)
    * streakMultiplier(state.streak)
    * difficultyOf(state.difficulty).reward;
  state.cash += Math.ceil(z.cash * cashBonus);
  state.killed++;
  bloodKill(z.x, z.y, z.r, headshot, z.boss);

  if (!z.boss) return;
  state.bossKilled = true;
  // A second, wider round of gore so a boss death outweighs a normal kill.
  for (let i = 0; i < 5; i++) {
    bloodKill(z.x + (Math.random() - 0.5) * z.r * 1.4, z.y + (Math.random() - 0.5) * z.r, z.r * 0.5, true);
  }
}

/**
 * @param {boolean} spawnWindowOpen false once dawn is breaking — stops boss escorts.
 * @returns {boolean} true when a zombie reached the player past a broken barricade.
 */
export function updateZombies(dt, spawnWindowOpen) {
  const barricadeStanding = () => state.barricade > 0;

  for (const z of [...state.zombies]) {
    const holdingRange = z.spit && z.x < SPITTER_RANGE_X && barricadeStanding();
    const targetX = barricadeStanding() ? BARRICADE_X : state.player.x;
    const targetY = barricadeStanding() ? z.y : state.player.y;
    const dist = Math.hypot(targetX - z.x, targetY - z.y);

    if (holdingRange) {
      z.attackCd -= dt;
      if (z.attackCd <= 0) {
        spitAcid(z);
        z.attackCd = SPIT.cooldown;
      }
    } else if (dist > z.r + PLAYER_HIT_RADIUS) {
      z.x += (targetX - z.x) / dist * z.speed * dt;
      z.y += (targetY - z.y) / dist * z.speed * dt;
    } else if (barricadeStanding()) {
      biteBarricade(z, dt);
    } else {
      return true;
    }

    if (spawnWindowOpen && z.boss) releaseEscorts(z);
  }
  return false;
}

/* One chunk of barricade per bite, plus the shake and vignette pulse that sell
   it. `attackCd` starts at 0, so the first bite lands the frame contact is made. */
function biteBarricade(z, dt) {
  z.attackCd -= dt;
  if (z.attackCd > 0) return;
  z.attackCd = BITE.interval;

  state.barricade = Math.max(0, state.barricade - z.barr * BARRICADE_DPS_SCALE * BITE.interval);
  state.barrFlash = Math.min(1, state.barrFlash + (z.boss ? BITE.bossFlash : BITE.flash));
  state.shake = Math.max(state.shake, z.boss ? BITE.bossShake : BITE.shake);
  if (state.barricade === 0) {
    state.barrFlash = 1;
    state.shake = Math.max(state.shake, BITE.breakShake);
  }
}

function releaseEscorts(z) {
  const crossed = Math.floor((1 - z.hp / z.maxHp) * BOSS_ESCORT_STAGES);
  if ((z.spawned || 0) >= crossed) return;
  z.spawned = crossed;
  spawnEscort(bossForNight(state.night) ?? z);
}
