/* Firing, reloading and weapon selection. Shared by the player and the
   survivor bots — fireWeapon() is the single place bullets are born. */
import { ACTOR_SCALE } from '../config.js';
import { state } from '../core/state.js';
import { SFX } from '../core/audio.js';
import { mouse, consumeKey } from '../core/input.js';
import { upgrades } from '../data/upgrades.js';
import { weapon, weaponAmmo, setAmmo, rank } from '../game/loadout.js';
import { burst } from './particles.js';

const DEFAULT_SPREAD = 0.025;
const INSTANT_RELOAD = 0.05;

export function fireWeapon(x, y, angle, w, actorScale = ACTOR_SCALE, bot = false) {
  const pellets = w.pellets || 1;
  const muzzle = w.muzzle * actorScale;
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
  SFX.shot(w);
  state.fireCd = w.fire;
  state.shake = Math.max(state.shake, w.heavy ? 7 : 2);
  const angle = Math.atan2(mouse.y - state.player.y, mouse.x - state.player.x);
  fireWeapon(state.player.x, state.player.y, angle, w);
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

/** Per-frame weapon timers plus the player's fire/reload/swap inputs. */
export function serviceWeapons(dt) {
  state.fireCd = Math.max(0, state.fireCd - dt);
  if (state.reload > 0) {
    state.reload -= dt;
    if (state.reload <= 0) setAmmo(weapon().mag);
  }
  if (weaponAmmo() === 0 && state.reload <= 0) reload();
  if (mouse.down) shoot();
  if (consumeKey('r')) reload();
  if (consumeKey('1')) state.selected = 0;
  if (consumeKey('2') && state.weapons[1]) state.selected = 1;
}
