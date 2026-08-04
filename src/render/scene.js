/* Frame composition: screen shake, backdrop, entities, night-intro card. */
import { W, H, FINAL_NIGHT } from '../config.js';
import { state } from '../core/state.js';
import { ctx } from './canvas.js';
import { drawEnvironment } from './environment.js';
import { drawPlayer, drawBot, drawZombie } from './actors.js';

/* Barricade danger frame. Several zombies biting at once keeps `barrFlash`
   saturated, so the pulse term stays deliberately light — a wall under attack is
   a tint, and it is the barricade actually failing that turns the screen red. */
const VIGNETTE = { pulseWeight: 0.24, dangerWeight: 0.4, dangerBelow: 0.4, max: 0.72 };

export function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (state?.shake) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawEnvironment();
  if (!state) {
    ctx.restore();
    return;
  }

  drawDecals();
  drawPuddles();
  drawAcidMarkers();
  drawBullets();
  for (const z of state.zombies) drawZombie(z);
  for (const bot of state.bots) drawBot(bot);
  drawPlayer();
  drawAcid();
  drawParticles();
  if (state.nightIntro > 0 && state.scene === 'playing') drawNightIntro();

  ctx.restore();
  /* Outside the shake transform, so the danger frame stays pinned to the screen. */
  drawThreatVignette();
}

/* Blood on the ground, drawn under everything else. Stains hold full strength
   most of their life and only fade near the end, so a heavy night visibly
   accumulates instead of flickering. */
function drawDecals() {
  ctx.save();
  for (const d of state.decals) {
    const fade = d.life / d.maxLife;
    ctx.globalAlpha = 0.16 + Math.min(0.62, fade * 1.5) * 0.7;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/* Ground-level acid. Fades out with the puddle's remaining life so its danger
   window is legible without a HUD readout. */
function drawPuddles() {
  for (const p of state.puddles) {
    const fade = Math.min(1, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = 0.2 + fade * 0.42;
    ctx.fillStyle = '#c8ff58';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.42, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 0.35 + fade * 0.45;
    ctx.strokeStyle = '#eaffb0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/* Landing markers: a ring that closes on the impact point as the spit falls, so
   a spitter volley can be walked out of. */
function drawAcidMarkers() {
  for (const a of state.acid) {
    const closing = 1 - a.progress;
    ctx.save();
    ctx.globalAlpha = 0.25 + a.progress * 0.55;
    ctx.strokeStyle = '#c8ff58';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(a.tx, a.ty, 16 + closing * 46, (16 + closing * 46) * 0.42, 0, 0, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(a.tx, a.ty, 16, 16 * 0.42, 0, 0, 7);
    ctx.globalAlpha *= 0.6;
    ctx.stroke();
    ctx.restore();
  }
}

function drawAcid() {
  ctx.save();
  ctx.fillStyle = '#c8ff58';
  ctx.shadowColor = '#c8ff58';
  ctx.shadowBlur = 12;
  for (const a of state.acid) {
    ctx.beginPath();
    ctx.arc(a.x, a.y, 6, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/* Red frame that pulses on every barricade bite and stays lit while the line is
   critical or gone — the only warning that is readable without looking at the HUD. */
function drawThreatVignette() {
  const remaining = state.maxBarr ? state.barricade / state.maxBarr : 1;
  const danger = remaining < VIGNETTE.dangerBelow ? (VIGNETTE.dangerBelow - remaining) / VIGNETTE.dangerBelow : 0;
  const strength = Math.min(VIGNETTE.max, state.barrFlash * VIGNETTE.pulseWeight + danger * VIGNETTE.dangerWeight);
  if (strength < 0.01) return;

  const gradient = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
  gradient.addColorStop(0, 'rgba(255,40,44,0)');
  gradient.addColorStop(1, `rgba(255,40,44,${strength.toFixed(3)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function drawBullets() {
  for (const b of state.bullets) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life * 4);
    ctx.strokeStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = b.moon ? 18 : 10;
    ctx.lineWidth = b.moon ? 8 : Math.max(2, b.projectileSize || 2);
    const scale = b.trail / Math.hypot(b.vx, b.vy);
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * scale, b.y - b.vy * scale);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.projectileSize || 2.4, 0, 7);
    ctx.fill();
    ctx.restore();
  }
}

/* One pass, four shapes. Droplets stretch along their own velocity — a falling
   circle reads as a bubble, a streak reads as thrown blood. */
function drawParticles() {
  ctx.save();
  for (const p of state.particles) {
    ctx.fillStyle = p.color;

    if (p.kind === 'drop') {
      const speed = Math.hypot(p.vx, p.vy);
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      // Cap the stretch so fast droplets do not turn into long needles.
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r + Math.min(speed * 0.03, p.r * 2.6), p.r, 0, 0, 7);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (p.kind === 'mist') {
      ctx.globalAlpha = Math.max(0, (p.life / p.maxLife) * 0.32);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fill();
      continue;
    }

    if (p.kind === 'gib') {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
      ctx.restore();
      continue;
    }

    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawNightIntro() {
  ctx.fillStyle = 'rgba(4,8,16,.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#edf3f5';
  ctx.font = '800 68px Barlow Condensed';
  ctx.fillText(`NIGHT ${String(state.night).padStart(2, '0')}`, W / 2, H / 2 - 8);
  ctx.fillStyle = '#ff4b4b';
  ctx.font = '500 15px DM Mono';
  ctx.fillText(state.night === FINAL_NIGHT ? 'THE HELICOPTER IS CLOSE.' : 'HOLD THE LINE.', W / 2, H / 2 + 26);
  ctx.textAlign = 'left';
}
