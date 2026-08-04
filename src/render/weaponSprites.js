/* Per-weapon silhouettes, drawn in actor-local space: the actor is already
   translated/rotated/scaled, muzzle points along +X. Adding a weapon means
   adding one entry here keyed by the same id used in data/weapons.js. */
import { ctx } from './canvas.js';

const sprites = {
  pistol(w) {
    ctx.fillStyle = '#1b242d'; ctx.fillRect(7, -8, 31, 10);
    ctx.fillStyle = w.accent; ctx.fillRect(31, -6, 15, 4);
    ctx.fillStyle = '#111820'; ctx.fillRect(12, 1, 11, 14);
    ctx.fillStyle = w.color; ctx.fillRect(37, -5, 5, 2);
  },
  revolver(w) {
    ctx.fillStyle = '#283039'; ctx.fillRect(7, -8, 27, 10);
    ctx.fillStyle = w.accent; ctx.beginPath(); ctx.arc(16, -3, 8, 0, 7); ctx.fill();
    ctx.fillStyle = w.color; ctx.fillRect(31, -5, 13, 4);
    ctx.fillStyle = '#20262b'; ctx.fillRect(9, 1, 10, 15);
  },
  shotgun(w) {
    ctx.fillStyle = w.accent; ctx.fillRect(4, -4, 28, 10);
    ctx.fillStyle = '#303940'; ctx.fillRect(27, -8, 35, 5);
    ctx.fillStyle = '#171d22'; ctx.fillRect(58, -7, 10, 3);
    ctx.fillStyle = '#b48352'; ctx.fillRect(12, 5, 18, 5);
  },
  smg(w) {
    ctx.fillStyle = w.accent; ctx.fillRect(6, -9, 35, 12);
    ctx.fillStyle = '#20282c'; ctx.fillRect(34, -6, 16, 5); ctx.fillRect(16, 3, 12, 13);
    ctx.fillStyle = w.color; ctx.fillRect(7, -7, 8, 2);
  },
  rifle(w) {
    ctx.fillStyle = w.accent; ctx.fillRect(4, -4, 35, 9);
    ctx.fillStyle = '#30383e'; ctx.fillRect(29, -8, 43, 5);
    ctx.fillStyle = '#11171c'; ctx.fillRect(43, -13, 15, 4);
    ctx.fillStyle = w.color; ctx.fillRect(68, -7, 8, 2);
  },
  ar(w) {
    ctx.fillStyle = w.accent; ctx.fillRect(5, -8, 39, 12);
    ctx.fillStyle = '#2b3336'; ctx.fillRect(36, -6, 27, 5); ctx.fillRect(18, 3, 12, 14);
    ctx.fillStyle = w.color; ctx.fillRect(8, -6, 10, 2);
  },
  lmg(w) {
    ctx.fillStyle = w.accent; ctx.fillRect(4, -10, 47, 14);
    ctx.fillStyle = '#242b2d'; ctx.fillRect(42, -7, 31, 5);
    ctx.fillStyle = '#101519'; ctx.fillRect(20, 3, 17, 17);
    ctx.fillStyle = w.color; ctx.fillRect(10, -8, 12, 3);
    ctx.fillStyle = '#9b724f'; ctx.fillRect(5, 5, 24, 4);
  },
  moonbeam(w) {
    ctx.shadowColor = w.color; ctx.shadowBlur = 12;
    ctx.fillStyle = w.accent; ctx.fillRect(5, -10, 42, 15);
    ctx.fillStyle = w.color; ctx.fillRect(37, -7, 28, 8);
    ctx.beginPath(); ctx.arc(20, -3, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#e7d8ff'; ctx.fillRect(58, -5, 10, 3);
    ctx.fillStyle = '#32234c'; ctx.fillRect(18, 4, 13, 13);
  }
};

export function drawWeapon(id, weaponData) {
  const sprite = sprites[id];
  if (!sprite) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  sprite(weaponData);
  ctx.restore();
}
