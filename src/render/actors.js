/* Player, survivor bots and zombies.

   The humans stand upright and only the gun arm tracks the cursor. Rotating the
   whole body by the aim angle — which is what this used to do — reads as a person
   lying over, because the legs and head swing with the mouse.

   Zombie proportions are pinned to the hit zones in systems/bullets.js: the head
   is drawn at -0.68r, inside that file's HEAD circle, and the torso stays within
   the body radius r. Move the art here and aiming stops matching the silhouette. */
import { ACTOR_SCALE } from '../config.js';
import { state } from '../core/state.js';
import { mouse } from '../core/input.js';
import { weapons } from '../data/weapons.js';
import { BOT_VITALS as BOT } from '../data/survivors.js';
import { weaponId } from '../game/loadout.js';
import { ctx } from './canvas.js';
import { drawWeapon } from './weaponSprites.js';

/* Human skeleton in local units; multiplied by ACTOR_SCALE when drawn. The
   shoulder sits near chest height so the muzzle stays close to where
   systems/combat.js actually spawns bullets, which is the actor's centre. */
const BODY = {
  footY: 20, hipY: 0, torsoTop: -20, torsoW: 19,
  shoulder: { x: 1, y: -8 },
  headY: -28, headR: 8.5,
  legLen: 20, legW: 7
};

const PLAYER_SKIN = {
  skin: '#d8b088', skinShade: '#b98d68',
  coat: '#2f4a63', coatShade: '#22374a', coatLight: '#3d5f7d',
  trousers: '#26313d', boot: '#171d24', hair: '#3a2a20', pack: '#4a3a2a'
};
const BOT_SKIN = {
  skin: '#d3a97f', skinShade: '#b0865f',
  coat: '#4c6142', coatShade: '#374a30', coatLight: '#5e7551',
  trousers: '#2b3129', boot: '#1a1f18', hair: '#2b1f18', pack: '#3f3527'
};

const ZOMBIE_BOB = 220;

/* Zombie build, in fractions of the hit radius r. Kept lean on purpose: at ~55px
   tall the silhouette is nearly all of the read, and overlapping ellipses of
   similar size collapse into a plump blob. A narrow straight-sided trunk with
   high shoulders, a sunken head and a long forward reach stays gaunt.
   `headY`/`headR` must track the head hit zone in systems/bullets.js. */
const Z = {
  shoulderY: -0.34, shoulderW: 0.8,
  chestW: 0.64, waistW: 0.44, waistY: 0.52,
  legLen: 0.5, legW: 0.16,
  armY: -0.24, armLen: 0.88, armW: 0.13,
  /** headR stays under HEAD.radius in systems/bullets.js, so the visible head is
      always forgiving to aim at rather than larger than its own hitbox. */
  headY: -0.68, headR: 0.44, headX: 0.06
};
export { Z };

function drawShadow(x, y, rx, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#05080a';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx * 0.34, 0, 0, 7);
  ctx.fill();
  ctx.restore();
}

/**
 * One upright human. `aim` is a world angle; the body mirrors to face it and the
 * gun arm rotates to it.
 */
function drawHuman({ x, y, aim, skin, step, moving, id, weaponData, build = 'm', hair }) {
  const face = Math.cos(aim) >= 0 ? 1 : -1;
  /* Mirroring x turns a local angle A into world angle PI - A, so invert the
     angle when facing left to keep the gun pointing at the cursor. */
  const armAngle = face > 0 ? aim : Math.PI - aim;
  const swing = moving ? Math.sin(step) * 0.44 : 0;
  const breathe = Math.sin(step * 0.35) * 0.5;
  const female = build === 'f';
  const torsoW = female ? BODY.torsoW - 3 : BODY.torsoW;
  const palette = hair ? { ...skin, hair } : skin;

  drawShadow(x, y + BODY.footY * ACTOR_SCALE, 16 * ACTOR_SCALE);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(ACTOR_SCALE * face, ACTOR_SCALE);

  // The fixed spread is a standing stance: without it both legs overlap exactly
  // when idle and the figure reads as one-legged.
  drawLeg(-swing - 0.15, palette.trousers, palette.boot, 0.82);
  // Pack rides on the back, which is behind the facing direction.
  ctx.fillStyle = palette.pack;
  ctx.fillRect(-torsoW / 2 - 5, BODY.torsoTop + 5 + breathe, 7, 15);
  drawLeg(swing + 0.07, palette.trousers, palette.boot, 1);

  // Torso: dark base, coat, then a lit front edge so it has a facing side.
  const torsoTop = BODY.torsoTop + breathe;
  ctx.fillStyle = palette.coatShade;
  ctx.fillRect(-torsoW / 2 - 1, torsoTop - 1, torsoW + 2, BODY.hipY - torsoTop + 4);
  ctx.fillStyle = palette.coat;
  ctx.fillRect(-torsoW / 2, torsoTop, torsoW, BODY.hipY - torsoTop + 3);
  ctx.fillStyle = palette.coatLight;
  ctx.fillRect(torsoW / 2 - 4, torsoTop, 4, BODY.hipY - torsoTop + 3);
  // Collar.
  ctx.fillStyle = palette.coatShade;
  ctx.fillRect(-torsoW / 2, torsoTop, torsoW, 4);

  // Rear arm braces the weapon; drawn before the head so it sits behind.
  ctx.save();
  ctx.translate(BODY.shoulder.x, BODY.shoulder.y + breathe);
  ctx.rotate(armAngle * 0.72);
  ctx.fillStyle = palette.coatShade;
  ctx.fillRect(0, -2.5, 15, 5);
  ctx.restore();

  drawHead(palette, breathe, female);

  // Front arm plus the gun, rotated onto the cursor.
  ctx.save();
  ctx.translate(BODY.shoulder.x, BODY.shoulder.y + breathe);
  ctx.rotate(armAngle);
  ctx.fillStyle = palette.coat;
  ctx.fillRect(0, -3, 14, 6);
  ctx.fillStyle = palette.skin;
  ctx.fillRect(11, -2.5, 6, 5);
  drawWeapon(id, weaponData);
  ctx.restore();

  ctx.restore();
}

function drawLeg(angle, trousers, boot, shade) {
  ctx.save();
  ctx.translate(0, BODY.hipY);
  ctx.rotate(angle);
  ctx.globalAlpha = shade;
  ctx.fillStyle = trousers;
  ctx.fillRect(-BODY.legW / 2, 0, BODY.legW, BODY.legLen);
  ctx.fillStyle = boot;
  ctx.fillRect(-BODY.legW / 2 - 1, BODY.legLen - 4, BODY.legW + 4, 5);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHead(skin, breathe, female = false) {
  const y = BODY.headY + breathe;
  ctx.fillStyle = skin.skinShade;
  ctx.beginPath();
  ctx.arc(0, y, BODY.headR + 1, 0, 7);
  ctx.fill();
  ctx.fillStyle = skin.skin;
  ctx.beginPath();
  ctx.arc(0.5, y, BODY.headR, 0, 7);
  ctx.fill();
  /* Hair sweeps back from the facing side, which gives the head a profile. The
     female build carries it down past the jaw and gathers it behind, which is
     the only silhouette cue that survives at this size. */
  ctx.fillStyle = skin.hair;
  ctx.beginPath();
  ctx.arc(-1, y - 2.5, BODY.headR, Math.PI * 0.92, Math.PI * 2.08);
  ctx.fill();
  if (female) {
    ctx.beginPath();
    ctx.ellipse(-BODY.headR * 0.55, y + 3, BODY.headR * 0.72, BODY.headR * 1.15, 0.18, 0, 7);
    ctx.fill();
    // Gathered tail behind the shoulder.
    ctx.beginPath();
    ctx.ellipse(-BODY.headR - 1.5, y + 9, 3.4, 6.5, -0.25, 0, 7);
    ctx.fill();
  } else {
    ctx.fillRect(-BODY.headR - 1, y - 4, 5, 7);
  }
  ctx.fillStyle = '#20262b';
  ctx.fillRect(BODY.headR - 4.5, y - 1, 2.5, 2.5);
}

export function drawPlayer() {
  const p = state.player;
  const id = weaponId();
  drawHuman({
    x: p.x, y: p.y,
    aim: Math.atan2(mouse.y - p.y, mouse.x - p.x),
    skin: PLAYER_SKIN,
    step: p.step || 0,
    moving: !!p.moving,
    id,
    weaponData: weapons[id]
  });
}

export function drawBot(bot) {
  const w = weapons[bot.weaponId];
  // The post is terrain: it stays put whether they are up, down or reloading.
  drawFiringPost(bot);

  if (bot.downed) {
    drawDownedBot(bot);
    return;
  }

  // Idle sway, offset per bot so the line does not breathe in unison.
  const sway = performance.now() / 700 + bot.index;
  drawHuman({
    x: bot.x, y: bot.y,
    aim: bot.aimAngle || 0,
    skin: BOT_SKIN,
    step: sway,
    moving: false,
    id: bot.weaponId,
    weaponData: w,
    build: bot.survivor.build,
    hair: bot.survivor.hair
  });

  drawBotHealth(bot);

  ctx.fillStyle = bot.pinnedBy ? '#ff4b4b' : w.color;
  ctx.font = '500 9px DM Mono';
  ctx.textAlign = 'center';
  const label = bot.pinnedBy
    ? 'PINNED — SHOOT IT'
    : `${Math.round(bot.accuracy * 100)}% · ${bot.reload > 0 ? 'RELOAD' : shortWeaponName(w.name)}`;
  ctx.fillText(label, bot.x, bot.y + 43);
  ctx.textAlign = 'left';
}

/* Survivors stand 84px apart, so a full name like LIGHT MACHINE GUN collides with
   the neighbour's label. Multi-word names collapse to initials (LMG, GL). */
function shortWeaponName(name) {
  const words = name.split(' ');
  return words.length > 1 ? words.map((word) => word[0]).join('') : name;
}

/* A dug-in firing position, so a survivor standing in open grass reads as posted
   there rather than parked at random. Sandbags face the road, an ammo crate sits
   behind them, and the grass underfoot is trodden flat. */
function drawFiringPost(bot) {
  const x = bot.x;
  const y = bot.y;

  ctx.save();
  // Trodden ground.
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#3a3526';
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 40, 13, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ammo crate behind the shoulder.
  ctx.fillStyle = '#4a3728';
  ctx.fillRect(x - 40, y + 6, 20, 15);
  ctx.fillStyle = '#5f4733';
  ctx.fillRect(x - 40, y + 6, 20, 4);
  ctx.fillStyle = '#2b2018';
  ctx.fillRect(x - 38, y + 13, 16, 2);

  /* Sandbags stacked into a low wall facing the road: two on the deck, one
     bridging the joint. Laid out as a wall rather than a diagonal pile, or they
     read as three dirt mounds at this size. */
  const bags = [[x + 22, y + 23, 15], [x + 41, y + 23, 15], [x + 32, y + 11, 15]];
  for (const [bx, by, r] of bags) {
    ctx.fillStyle = '#2a2619';
    ctx.beginPath();
    ctx.ellipse(bx, by, r + 2, r * 0.66, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#8a7d55';
    ctx.beginPath();
    ctx.ellipse(bx, by - 1, r, r * 0.58, 0, 0, 7);
    ctx.fill();
    // Lit crown and the seam across the middle of the sack.
    ctx.fillStyle = '#a2946a';
    ctx.beginPath();
    ctx.ellipse(bx - r * 0.15, by - r * 0.26, r * 0.62, r * 0.24, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(42,38,25,.55)';
    ctx.fillRect(bx - r * 0.72, by - 1, r * 1.44, 1.8);
  }
  ctx.restore();
}

/** Only shown once they have actually been hurt, to keep the line uncluttered. */
function drawBotHealth(bot) {
  if (bot.hp >= bot.maxHp) return;
  const width = 34;
  ctx.fillStyle = 'rgba(8,10,14,.75)';
  ctx.fillRect(bot.x - width / 2 - 1, bot.y - 44, width + 2, 5);
  ctx.fillStyle = bot.hp / bot.maxHp < 0.35 ? '#ff4b4b' : '#c8ff58';
  ctx.fillRect(bot.x - width / 2, bot.y - 43, width * (bot.hp / bot.maxHp), 3);
}

/* A downed survivor lies flat with a bleed-out ring. The ring is the timer: when
   it empties they are gone from the run, so it has to be readable at a glance. */
function drawDownedBot(bot) {
  const fade = Math.max(0, bot.bleed / BOT.bleedOut);

  drawShadow(bot.x, bot.y + 8, 22, 0.3);
  ctx.save();
  ctx.translate(bot.x, bot.y + 6);
  ctx.rotate(Math.PI / 2);
  ctx.scale(ACTOR_SCALE * 0.92, ACTOR_SCALE * 0.92);
  ctx.fillStyle = BOT_SKIN.coatShade;
  ctx.fillRect(-BODY.torsoW / 2, -14, BODY.torsoW, 26);
  ctx.fillStyle = BOT_SKIN.trousers;
  ctx.fillRect(-BODY.legW / 2, 12, BODY.legW, BODY.legLen);
  ctx.fillStyle = BOT_SKIN.skin;
  ctx.beginPath();
  ctx.arc(0, -22, BODY.headR, 0, 7);
  ctx.fill();
  ctx.restore();

  // Bleed-out ring.
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(8,10,14,.7)';
  ctx.beginPath();
  ctx.arc(bot.x, bot.y, 26, 0, 7);
  ctx.stroke();
  ctx.strokeStyle = fade < 0.35 ? '#ff4b4b' : '#ffcf54';
  ctx.beginPath();
  ctx.arc(bot.x, bot.y, 26, -Math.PI / 2, -Math.PI / 2 + fade * Math.PI * 2);
  ctx.stroke();

  // Revive progress fills inward as the player stands over them.
  if (bot.revive > 0) {
    ctx.strokeStyle = '#c8ff58';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bot.x, bot.y, 19, -Math.PI / 2, -Math.PI / 2 + Math.min(1, bot.revive / BOT.reviveTime) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#ff8585';
  ctx.font = '600 9px DM Mono';
  ctx.textAlign = 'center';
  ctx.fillText(bot.revive > 0 ? 'REVIVING' : `${bot.survivor.name.split(' ')[0].toUpperCase()} DOWN`, bot.x, bot.y + 44);
  ctx.textAlign = 'left';
}

/* Zombies: hunched, front-heavy, arms hanging forward, head sunk between the
   shoulders. Faster types lean further and shamble quicker. */
export function drawZombie(z) {
  const r = z.r;
  const t = performance.now();
  const gait = t / ZOMBIE_BOB * (0.5 + z.speed / 90) + z.bob;
  const stride = Math.sin(gait);
  const lurch = Math.sin(gait * 0.5) * 0.05;
  const bobY = Math.abs(Math.sin(gait)) * r * 0.045;
  const lean = z.type === 'runner' ? 0.2 : 0.11;

  drawShadow(z.x, z.y + r * 1.02, r * 0.62, 0.34);

  ctx.save();
  /* Zombies come from the right, so mirror x: local +x is the way they walk, and
     everything below reads "forward" as +x. */
  ctx.translate(z.x, z.y + bobY);
  ctx.scale(-1, 1);
  // Positive tilts the spine into the direction of travel in this mirrored frame.
  ctx.rotate(lean + lurch);

  drawZombieLegs(z, r, stride);
  // Far arm is pushed back and down so the two reaches do not stack into one.
  drawZombieArm(z, r, -stride, 0.78, -r * 0.12, r * 0.1);
  drawZombieTorso(z, r);
  drawZombieHead(z, r, gait);
  drawZombieArm(z, r, stride, 1, 0, 0);

  if (z.boss) drawBossGear(z, r);
  ctx.restore();

  if (z.boss) drawBossHealth(z, r);
}

/* Thin bent legs, knee-jointed so the shamble has a hitch in it. Drawn long
   enough to clear the trunk, or the whole figure reads as a torso on feet. */
function drawZombieLegs(z, r, stride) {
  const thigh = r * Z.legLen * 0.55;
  const shin = r * Z.legLen * 0.62;
  for (const [phase, shade] of [[-stride, 0.8], [stride, 1]]) {
    ctx.save();
    ctx.translate(0, r * Z.waistY - r * 0.04);
    ctx.rotate(phase * 0.42);
    ctx.globalAlpha = shade;

    // Trousers stay light enough that the rear leg still reads at reduced alpha.
    ctx.fillStyle = '#332c24';
    ctx.fillRect(-r * Z.legW / 2, 0, r * Z.legW, thigh);
    ctx.translate(0, thigh);
    // Knee kicks the shin back on the forward swing.
    ctx.rotate(0.32 - phase * 0.34);
    ctx.fillStyle = '#8fa26d';
    ctx.fillRect(-r * Z.legW * 0.42, 0, r * Z.legW * 0.84, shin);
    ctx.fillStyle = '#6f8054';
    ctx.fillRect(-r * Z.legW * 0.42, 0, r * Z.legW * 0.3, shin);
    ctx.fillStyle = '#191512';
    ctx.fillRect(-r * Z.legW * 0.55, shin - r * 0.05, r * Z.legW * 1.5, r * 0.12);

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/* A straight-sided trunk that tapers to the waist, with the spine humped behind
   the shoulders. The taper and the hump are what sell the hunch. */
function drawZombieTorso(z, r) {
  ctx.beginPath();
  ctx.moveTo(-r * Z.chestW * 0.46, r * Z.shoulderY);
  ctx.lineTo(r * Z.chestW * 0.54, r * Z.shoulderY + r * 0.04);
  ctx.lineTo(r * Z.waistW * 0.5, r * Z.waistY);
  ctx.lineTo(-r * Z.waistW * 0.56, r * Z.waistY);
  ctx.closePath();

  // Stroke then fill the same path; the dark stroke doubles as the outline that
  // keeps a zombie readable against dark asphalt.
  ctx.strokeStyle = '#12160f';
  ctx.lineWidth = r * 0.14;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = z.color;
  ctx.fill();

  // Shoulders as a bar, plus the spine hump behind them.
  ctx.fillStyle = '#12160f';
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, r * Z.shoulderY - r * 0.04, r * Z.shoulderW * 0.54, r * 0.16, -0.18, 0, 7);
  ctx.fill();
  ctx.fillStyle = z.color;
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, r * Z.shoulderY - r * 0.05, r * Z.shoulderW * 0.48, r * 0.13, -0.18, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.09)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.24, r * Z.shoulderY - r * 0.1, r * 0.2, r * 0.11, -0.3, 0, 7);
  ctx.fill();

  // Rotting shirt across the chest only, so the gaunt waist stays exposed.
  ctx.fillStyle = 'rgba(26,32,22,.62)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, r * Z.shoulderY + r * 0.04);
  ctx.lineTo(r * 0.28, r * Z.shoulderY + r * 0.08);
  ctx.lineTo(r * 0.2, r * 0.22);
  ctx.lineTo(-r * 0.24, r * 0.16);
  ctx.closePath();
  ctx.fill();

  // Two ribs, thick enough to survive at this size, and a slash at the flank.
  ctx.strokeStyle = 'rgba(230,224,200,.42)';
  ctx.lineWidth = Math.max(1.2, r * 0.055);
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(r * 0.06, r * (0.24 + i * 0.14), r * 0.17, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.strokeStyle = '#6b0e16';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(-r * 0.16, r * 0.06);
  ctx.lineTo(-r * 0.05, r * 0.3);
  ctx.stroke();

  if (z.bloat) {
    // Distended gut with bile showing through — the thing that will burst.
    ctx.fillStyle = '#6d8a44';
    ctx.beginPath();
    ctx.ellipse(r * 0.04, r * 0.3, r * 0.52, r * 0.46, 0, 0, 7);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = '#c6e86a';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#b6dd5c';
    for (const [bx, by, br] of [[-r * 0.1, r * 0.22, 0.17], [r * 0.2, r * 0.38, 0.13], [-r * 0.24, r * 0.44, 0.1]]) {
      ctx.beginPath();
      ctx.ellipse(bx, by, r * br, r * br * 0.86, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  if (z.pounce) {
    // Overgrown shoulders and hind legs: coiled to jump.
    ctx.fillStyle = '#12160f';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, r * Z.shoulderY - r * 0.08, r * 0.34, r * 0.2, -0.3, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#c9dd7c';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, r * Z.shoulderY - r * 0.09, r * 0.29, r * 0.16, -0.3, 0, 7);
    ctx.fill();
  }

  if (z.spit) {
    // Swollen acid sac at the throat, lit from inside.
    ctx.save();
    ctx.shadowColor = '#c8ff58';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#9fd15c';
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, -r * 0.14, r * 0.3, r * 0.24, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  if (z.armor) {
    // Riot vest over the chest, cut to the trunk rather than a slab across it.
    ctx.fillStyle = '#3f4a52';
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, r * Z.shoulderY + r * 0.02);
    ctx.lineTo(r * 0.3, r * Z.shoulderY + r * 0.06);
    ctx.lineTo(r * 0.22, r * 0.34);
    ctx.lineTo(-r * 0.24, r * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a6872';
    ctx.fillRect(-r * 0.26, r * 0.02, r * 0.55, r * 0.07);
    ctx.fillStyle = '#2b333a';
    ctx.fillRect(-r * 0.26, r * 0.16, r * 0.5, r * 0.05);
    // Shoulder plates sit on the shoulder bar.
    ctx.fillStyle = '#4b5760';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, r * Z.shoulderY - r * 0.02, r * 0.2, r * 0.13, -0.3, 0, 7);
    ctx.ellipse(r * 0.3, r * Z.shoulderY, r * 0.2, r * 0.13, 0.3, 0, 7);
    ctx.fill();
  }
}

/* Arms reach forward, roughly level, clear of the trunk outline, and swing out of
   phase with the legs. The splayed claw at the end is most of what turns the
   reach into a threat — an arm angled up across the chest read as a scarf. */
function drawZombieArm(z, r, phase, shade, offsetX, offsetY) {
  const upper = r * Z.armLen * 0.52;
  const fore = r * Z.armLen * 0.5;
  ctx.save();
  ctx.translate(r * 0.14 + offsetX, r * Z.armY + offsetY);
  ctx.rotate(0.1 + phase * 0.2);
  ctx.globalAlpha = shade;

  // Upper arm.
  ctx.fillStyle = '#12160f';
  ctx.fillRect(-r * 0.04, -r * Z.armW * 0.7, upper + r * 0.06, r * Z.armW * 1.4);
  ctx.fillStyle = z.color;
  ctx.fillRect(-r * 0.02, -r * Z.armW * 0.5, upper, r * Z.armW);
  ctx.fillStyle = 'rgba(24,30,20,.55)';
  ctx.fillRect(-r * 0.02, -r * Z.armW * 0.5, upper * 0.5, r * Z.armW);

  // Elbow drops the forearm slightly, so the reach has a joint in it.
  ctx.translate(upper, 0);
  ctx.rotate(0.22 - phase * 0.26);
  ctx.fillStyle = '#12160f';
  ctx.fillRect(-r * 0.03, -r * Z.armW * 0.62, fore + r * 0.05, r * Z.armW * 1.24);
  ctx.fillStyle = '#9db478';
  ctx.fillRect(-r * 0.02, -r * Z.armW * 0.44, fore, r * Z.armW * 0.88);

  // Claw: three splayed fingers.
  ctx.translate(fore, 0);
  ctx.fillStyle = '#adc186';
  for (const spread of [-0.5, 0, 0.5]) {
    ctx.save();
    ctx.rotate(spread);
    ctx.fillRect(0, -r * 0.03, r * 0.22, r * 0.06);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawZombieHead(z, r, gait) {
  // Head sits at the hit-zone offset, tilted and sunk toward the shoulders.
  ctx.save();
  ctx.translate(r * Z.headX, r * Z.headY);
  // Head lolls forward off the shoulders.
  ctx.rotate(0.2 + Math.sin(gait * 0.5) * 0.06);

  ctx.fillStyle = '#12160f';
  ctx.beginPath();
  ctx.arc(0, 0, r * (Z.headR + 0.04), 0, 7);
  ctx.fill();
  ctx.fillStyle = z.clown ? '#e8e2d4' : '#b3cf8c';
  ctx.beginPath();
  ctx.arc(0, 0, r * Z.headR, 0, 7);
  ctx.fill();
  // Hollow the cheek on the trailing side; a flat disc reads as a ball.
  ctx.fillStyle = 'rgba(24,32,20,.28)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, r * 0.06, r * 0.24, r * 0.3, 0.2, 0, 7);
  ctx.fill();

  // Jaw hanging wide open, teeth, and blood down the chin.
  ctx.fillStyle = '#140f0c';
  ctx.beginPath();
  ctx.ellipse(r * 0.2, r * 0.22, r * 0.2, r * 0.19, -0.15, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#e4e0cd';
  ctx.fillRect(r * 0.08, r * 0.1, r * 0.07, r * 0.09);
  ctx.fillRect(r * 0.24, r * 0.09, r * 0.06, r * 0.08);
  ctx.fillRect(r * 0.16, r * 0.34, r * 0.06, r * 0.07);
  ctx.fillStyle = 'rgba(120,12,20,.8)';
  ctx.fillRect(r * 0.12, r * 0.38, r * 0.09, r * 0.3);

  // Deep sockets, then eyes that catch the light.
  ctx.fillStyle = '#12170f';
  ctx.beginPath();
  ctx.ellipse(r * 0.24, -r * 0.12, r * 0.17, r * 0.14, 0.1, 0, 7);
  ctx.ellipse(-r * 0.06, -r * 0.16, r * 0.16, r * 0.13, 0.1, 0, 7);
  ctx.fill();

  if (!z.armor) drawEyes(z, r);

  if (z.clown) {
    ctx.fillStyle = '#ff3348';
    ctx.beginPath();
    ctx.arc(r * 0.36, r * 0.04, r * 0.13, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#c2263a';
    ctx.fillRect(-r * 0.52, -r * 0.3, r * 0.24, r * 0.15);
    ctx.fillRect(r * 0.3, -r * 0.36, r * 0.22, r * 0.15);
    ctx.strokeStyle = '#a3102a';
    ctx.lineWidth = Math.max(1.2, r * 0.055);
    ctx.beginPath();
    ctx.arc(r * 0.12, r * 0.06, r * 0.3, 0.5, 2.4);
    ctx.stroke();
  } else {
    // Lank hair on the crown and trailing side only, so the face stays visible.
    ctx.fillStyle = 'rgba(28,24,17,.8)';
    ctx.beginPath();
    ctx.arc(-r * 0.04, -r * 0.06, r * Z.headR, Math.PI * 1.02, Math.PI * 1.95);
    ctx.fill();
    ctx.fillRect(-r * 0.48, -r * 0.16, r * 0.16, r * 0.3);
  }

  if (z.armor) {
    // Riot helmet with a visor slit; the eyes glow through it.
    ctx.fillStyle = '#414c55';
    ctx.beginPath();
    ctx.arc(0, -r * 0.06, r * 0.55, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-r * 0.55, -r * 0.08, r * 1.1, r * 0.2);
    ctx.fillStyle = '#0d1114';
    ctx.fillRect(-r * 0.5, -r * 0.02, r * 0.95, r * 0.14);
    drawEyes(z, r);
    ctx.fillStyle = '#54626c';
    ctx.fillRect(-r * 0.58, -r * 0.12, r * 1.16, r * 0.06);
  }

  ctx.restore();
}

/* Sized to survive at ~50px tall — the previous 0.07r dots vanished. Two passes:
   a wide dim halo, then a hot core, which is what makes them look lit rather
   than painted. */
function drawEyes(z, r) {
  const hot = z.boss ? '#ffb0a0' : '#fff4cf';
  const glow = z.boss ? '#ff3b2a' : '#ffc63a';
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(r * 0.24, -r * 0.12, r * 0.11, 0, 7);
  ctx.arc(-r * 0.06, -r * 0.16, r * 0.1, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 8;
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.12, r * 0.055, 0, 7);
  ctx.arc(-r * 0.05, -r * 0.16, r * 0.05, 0, 7);
  ctx.fill();
  ctx.restore();
}

/** Hard hat for the Foreman, a wide brim for the Passenger. */
function drawBossGear(z, r) {
  ctx.save();
  ctx.translate(-r * 0.06, -r * 0.68);
  if (z.type === 'foreman') {
    ctx.fillStyle = '#e0a02c';
    ctx.beginPath();
    ctx.arc(0, -r * 0.16, r * 0.5, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-r * 0.62, -r * 0.2, r * 1.24, r * 0.1);
    ctx.fillStyle = '#b87d1c';
    ctx.fillRect(-r * 0.06, -r * 0.66, r * 0.12, r * 0.5);
  } else {
    ctx.fillStyle = '#2a2130';
    ctx.fillRect(-r * 0.72, -r * 0.24, r * 1.44, r * 0.1);
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.42, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#5c3a49';
    ctx.fillRect(-r * 0.42, -r * 0.3, r * 0.84, r * 0.07);
  }
  ctx.restore();
}

/* Sits just clear of the hat rather than floating a third of a body above it. */
function drawBossHealth(z, r) {
  const y = -r * 1.32;
  const width = r * 1.7;
  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.fillStyle = 'rgba(8,10,14,.7)';
  ctx.fillRect(-width / 2 - 1, y - 1, width + 2, 7);
  ctx.fillStyle = '#ffcf54';
  ctx.fillRect(-width / 2, y, (z.hp / z.maxHp) * width, 5);
  ctx.restore();
}
