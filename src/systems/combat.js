/* Firing, reloading and weapon selection. Shared by the player and the
   survivor bots — fireWeapon() is the single place bullets are born. */
import { ACTOR_SCALE } from '../config.js';
import { state } from '../core/state.js';
import { SFX } from '../core/sfx.js';
import { mouse, consumeKey } from '../core/input.js';
import { upgrades } from '../data/upgrades.js';
import { weapon, weaponId, weaponAmmo, setAmmo, rank } from '../game/loadout.js';
import { burst } from './particles.js';
import { throwOrdnance } from './throwables.js';

const DEFAULT_SPREAD = 0.025;
const INSTANT_RELOAD = 0.05;

/**
 * Births every projectile in the game. Explosive weapons are lobbed at a point
 * rather than fired along the ray, so `targetX`/`targetY` matter for those — the
 * cursor for the player, the aimed-at zombie for a survivor.
 */
export function fireWeapon(x, y, angle, w, actorScale = ACTOR_SCALE, bot = false, targetX, targetY) {
  const muzzle = w.muzzle * actorScale;

  if (w.throwable) {
    throwOrdnance(
      x + muzzle * Math.cos(angle), y + muzzle * Math.sin(angle),
      targetX ?? x + Math.cos(angle) * 420,
      targetY ?? y + Math.sin(angle) * 420,
      w, bot
    );
    burst(x + (muzzle - 12) * Math.cos(angle), y + (muzzle - 12) * Math.sin(angle), w.color, bot ? 5 : 11, 150);
    return;
  }

  const pellets = w.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const shotAngle = angle + (Math.random() - 0.5) * (w.spread || DEFAULT_SPREAD);
    state.bullets.push({
      x: x + muzzle * Math.cos(shotAngle),
      y: y + muzzle * Math.sin(shotAngle),
      vx: Math.cos(shotAngle) * w.bulletSpeed,
      vy: Math.sin(shotAngle) * w.bulletSpeed,
      damage: w.damage,
      pierce: w.pierce || 0,
      color: w.color,
      life: 1.1,
      moon: !!w.moon,
      trail: w.trail,
      projectileSize: w.projectileSize,
      bot
    });
  }
  burst(x + (muzzle - 12) * Math.cos(angle), y + (muzzle - 12) * Math.sin(angle), w.color, bot ? 4 : 9, bot ? 80 : 130);
}

export function shoot() {
  const w = weapon();
  if (state.reload > 0 || state.fireCd > 0 || weaponAmmo() <= 0) return;
  setAmmo(weaponAmmo() - 1);
  state.fireCd = w.fire;
  state.shake = Math.max(state.shake, w.heavy ? 7 : 2);
  SFX.shot(weaponId(), state.player.x);
  const angle = Math.atan2(mouse.y - state.player.y, mouse.x - state.player.x);
  // Explosives land where the cursor is, so aiming one is aiming at the ground.
  fireWeapon(state.player.x, state.player.y, angle, w, ACTOR_SCALE, false, mouse.x, mouse.y);
  if (weaponAmmo() === 0) reload();
}

export function reload() {
  const w = weapon();
  if (state.reload > 0 || weaponAmmo() >= w.mag) return;
  SFX.reload();
  state.reload = state.instantReload ? INSTANT_RELOAD : w.reload * (1 - rank('hands') * upgrades.hands.step);
  state.reloadTotal = state.reload;
  state.instantReload = false;
}

/** Cycles carried weapons, for the touch button that has no 1/2 keys. */
export function swapWeapon() {
  if (!state.weapons[1]) return;
  state.selected = state.selected === 0 ? 1 : 0;
}

/** Per-frame weapon timers plus the player's fire/reload/swap inputs. */
export function serviceWeapons(dt) {
  state.fireCd = Math.max(0, state.fireCd - dt);
  if (state.reload > 0) {
    state.reload -= dt;
    if (state.reload <= 0) {
      setAmmo(weapon().mag);
      SFX.reloadDone();
    }
  }
  if (weaponAmmo() === 0 && state.reload <= 0) reload();
  if (mouse.down) shoot();
  if (consumeKey('r')) reload();
  if (consumeKey('1')) state.selected = 0;
  if (consumeKey('2') && state.weapons[1]) state.selected = 1;
}
