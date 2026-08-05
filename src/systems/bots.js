/* Survivor bots: they hold position, target the closest zombie to the
   barricade, miss on purpose according to their accuracy, and reload forever.

   Survivors are mortal. Taking enough damage puts one on the ground, bleeding
   out; walk into them to revive. Let the timer run out and they are gone from
   state.survivors for the rest of the run, which is what makes dawn's search
   allocation worth anything. */
import { ACTOR_SCALE } from '../config.js';
import { state } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { weapons } from '../data/weapons.js';
import { BOT_ACCURACY, BOT_VITALS as BOT } from '../data/survivors.js';
import { survivorWeapon } from '../game/loadout.js';
import { fireWeapon } from './combat.js';

const FORMATION = { x: 365, columnGap: 84, y: 390, rowGap: 108 };
const AIM_LOW_SPREAD = 150;
const TORSO_OFFSET = 8;

/* Survivors are slower on the trigger than the player, but the handicap has to
   be a MULTIPLE of the weapon's own fire rate. It used to be
   `fire * 1.45 + 0.13 + random`, and that flat tail swamped fast weapons: an SMG
   came out 3.9x slower than in the player's hands while a shotgun lost only 1.7x,
   so automatics felt broken in survivor hands. Scaling instead of adding gives
   every weapon the same ~1.4x penalty and lets an SMG actually rip.

   Safe to be generous here: every non-Pistol weapon is exclusive to one holder,
   so at most one survivor on the team can carry any given automatic. */
const BOT_FIRE = { penalty: 1.3, jitter: 0.25, minGap: 0.06 };

/** Builds the bot line for a night from the current survivor roster. */
export function createBots() {
  return state.survivors.map((survivor, index) => {
    const weaponId = survivorWeapon(survivor);
    return {
      survivor,
      index,
      weaponId,
      x: FORMATION.x + (index % 2) * FORMATION.columnGap,
      y: FORMATION.y + Math.floor(index / 2) * FORMATION.rowGap,
      aimAngle: 0,
      shotCd: 0.35 + index * 0.08,
      accuracy: BOT_ACCURACY.min + Math.random() * BOT_ACCURACY.spread,
      ammo: weapons[weaponId].mag,
      reload: 0,
      hp: BOT.hp,
      maxHp: BOT.hp,
      downed: false,
      bleed: 0,
      revive: 0,
      /** The zombie currently pinning them, if any. */
      pinnedBy: null
    };
  });
}

/** Every survivor still able to shoot — what the Pouncer hunts. */
export function liveBots() {
  return state.bots.filter((bot) => !bot.downed);
}

/**
 * Damages a survivor, putting them on the ground at zero.
 * @returns {boolean} true when this hit downed them.
 */
export function hurtBot(bot, amount) {
  if (bot.downed) return false;
  bot.hp -= amount;
  if (bot.hp > 0) return false;

  bot.hp = 0;
  bot.downed = true;
  bot.bleed = BOT.bleedOut;
  bot.revive = 0;
  // Whatever had hold of them lets go once they are on the ground.
  if (bot.pinnedBy) {
    bot.pinnedBy.pinnedBot = null;
    bot.pinnedBy = null;
  }
  emit(EVENTS.SURVIVOR_DOWN, { name: bot.survivor.name });
  return true;
}

/** Removes a survivor from the run. The roster loss persists past the night. */
function loseSurvivor(bot) {
  state.survivors = state.survivors.filter((survivor) => survivor.id !== bot.survivor.id);
  state.bots = state.bots.filter((other) => other !== bot);
  if (bot.pinnedBy) bot.pinnedBy.pinnedBot = null;
  emit(EVENTS.SURVIVOR_LOST, { name: bot.survivor.name });
}

export function updateBots(dt) {
  // Copied because loseSurvivor() mutates state.bots mid-loop.
  for (const bot of [...state.bots]) {
    if (bot.downed) {
      tendDowned(bot, dt);
      continue;
    }
    // Pinned survivors cannot fight back until the zombie is shot off.
    if (bot.pinnedBy) continue;

    const w = weapons[bot.weaponId];

    if (bot.reload > 0) {
      bot.reload -= dt;
      if (bot.reload <= 0) bot.ammo = w.mag;
      continue;
    }
    if (bot.ammo === 0) {
      bot.reload = w.reload;
      continue;
    }

    bot.shotCd -= dt;
    if (bot.shotCd > 0 || !state.zombies.length) continue;
    bot.shotCd = Math.max(BOT_FIRE.minGap, w.fire * (BOT_FIRE.penalty + Math.random() * BOT_FIRE.jitter));

    const target = state.zombies.reduce((best, z) => (!best || z.x < best.x ? z : best), null);
    const hits = Math.random() < bot.accuracy;
    const aimY = target.y + (hits ? TORSO_OFFSET : (Math.random() - 0.5) * AIM_LOW_SPREAD);
    const angle = Math.atan2(aimY - bot.y, target.x - bot.x);

    bot.aimAngle = angle;
    bot.ammo--;
    fireWeapon(bot.x, bot.y, angle, w, ACTOR_SCALE, true, target.x, target.y);
    if (bot.ammo === 0) bot.reload = w.reload;
  }
}

/** Bleed-out and revive progress for a survivor on the ground. */
function tendDowned(bot, dt) {
  bot.bleed -= dt;

  const reach = Math.hypot(state.player.x - bot.x, state.player.y - bot.y) < BOT.reviveRadius;
  if (reach) {
    bot.revive += dt;
    if (bot.revive >= BOT.reviveTime) {
      bot.downed = false;
      bot.hp = Math.max(1, Math.round(bot.maxHp * BOT.reviveHp));
      bot.revive = 0;
      bot.shotCd = 0.4;
      return;
    }
  } else {
    // Progress decays if you step away, but slower than it builds.
    bot.revive = Math.max(0, bot.revive - dt * 0.5);
  }

  if (bot.bleed <= 0) loseSurvivor(bot);
}
