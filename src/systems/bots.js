/* Survivor bots: they hold position, target the closest zombie to the
   barricade, miss on purpose according to their accuracy, and reload forever. */
import { ACTOR_SCALE } from '../config.js';
import { state } from '../core/state.js';
import { weapons } from '../data/weapons.js';
import { BOT_ACCURACY } from '../data/survivors.js';
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
      reload: 0
    };
  });
}

export function updateBots(dt) {
  for (const bot of state.bots) {
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
    fireWeapon(bot.x, bot.y, angle, w, ACTOR_SCALE, true);
    if (bot.ammo === 0) bot.reload = w.reload;
  }
}
