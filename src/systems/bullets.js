/* Bullet travel and hit resolution. Head hits use a smaller circle offset above
   the body centre, so aiming high is what pays. */
import { W, H } from '../config.js';
import { state } from '../core/state.js';
import { bloodHit } from './particles.js';
import { killZombie } from './zombies.js';

const HEAD = { offset: 0.68, radius: 0.62 };
const ARMOR_DAMAGE_SCALE = 0.75;

export function updateBullets(dt) {
  const bullets = state.bullets;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let spent = b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H;

    // Blood follows the bullet's line of travel, so spray direction reads.
    const travel = Math.atan2(b.vy, b.vx);

    for (const z of [...state.zombies]) {
      if (spent) break;
      const headDist = Math.hypot(b.x - z.x, b.y - (z.y - z.r * HEAD.offset));
      if (headDist < z.r * HEAD.radius) {
        z.headHp--;
        bloodHit(b.x, b.y, travel, true, z.y + z.r * 0.8);
        if (z.headHp <= 0) killZombie(z, true, b.bot);
        spent = true;
      } else if (Math.hypot(b.x - z.x, b.y - z.y) < z.r) {
        z.hp -= b.damage * (z.armor ? ARMOR_DAMAGE_SCALE : 1);
        bloodHit(b.x, b.y, travel, false, z.y + z.r * 0.8);
        if (z.hp <= 0) killZombie(z, false, b.bot);
        if (b.pierce > 0) b.pierce--;
        else spent = true;
      }
    }

    if (spent) bullets.splice(i, 1);
  }
}
