/* Static backdrop: sky, skyline, street, the defended house, and the barricade.
   Every colour is run through mixColor() against a `dawn` factor so the whole
   scene lightens as the night burns down.

   Two rules hold the composition together:

   1. Everything stands on a surface. The street is built as real bands — back
      sidewalk, curb, asphalt, near curb, verge — and the skyline's bases sit on
      the back sidewalk rather than floating over the road. The house has a
      foundation and a cast shadow.
   2. Depth reads through contrast, not scale. Far layers are mixed toward the
      sky colour, near layers keep their saturation, because the actors are drawn
      at one size and any real perspective would fight them.

   Layout constants are grouped per subject; the scatter (stars, windows, grass)
   is laid out once at module load with a seeded generator so nothing shimmers
   between frames. */
import { W, H } from '../config.js';
import { state } from '../core/state.js';
import { ctx } from './canvas.js';
import { mixColor } from './colors.js';

/** Where the sky stops and the world starts. */
const HORIZON = 330;
/** Dawn light starts creeping in at 25s and is complete at 90s. */
const DAWN_WINDOW = { start: 25, length: 65 };

/* The street, back to front. Zombies walk y 355–630, which keeps them on the
   asphalt band; the sidewalk behind and the verge in front stay clear. */
const STREET = {
  x: 566,
  walkTop: HORIZON,
  curbTop: 350,
  asphaltTop: 358,
  asphaltBottom: 656,
  nearCurbBottom: 674,
  laneY: 496,
  /** Skyline bases, a touch above the curb so buildings stand on the walk. */
  baseY: 334
};

const YARD = { edge: STREET.x };

const HOUSE = {
  /** x leaves room for the eave overhang so the roof never clips the frame. */
  x: 56, w: 316, wallTop: 238, base: 436,
  apexY: 132, eaveY: 248, eaveOut: 24,
  porchTop: 436, porchBottom: 452,
  fenceTop: 452, fenceBottom: 490
};
/** Apex and door are derived, so the roof can never drift off centre again. */
HOUSE.centerX = HOUSE.x + HOUSE.w / 2;

const BARRICADE = { x: 558, w: 74, top: 328, bottom: 664, plankH: 18, plankGap: 42 };

/* Deterministic pseudo-random. Used at module load only — the scatter is baked
   into arrays so the frame loop never re-rolls it. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const STARS = (() => {
  const rand = seeded(20240614);
  return Array.from({ length: 90 }, () => ({
    x: rand() * W,
    y: 14 + rand() * (HORIZON - 90),
    size: rand() < 0.22 ? 3 : 2,
    /** Dim stars keep the field from looking like a uniform dot grid. */
    alpha: 0.35 + rand() * 0.65
  }));
})();

/* Far layer: hazy blocks with no detail, only there to give the near layer
   something to overlap. */
const FAR_BUILDINGS = [
  { x: 560, w: 116, top: 240 }, { x: 664, w: 94, top: 212 }, { x: 748, w: 132, top: 246 },
  { x: 868, w: 104, top: 200 }, { x: 962, w: 120, top: 232 }, { x: 1072, w: 98, top: 190 },
  { x: 1160, w: 130, top: 226 }
];

/* Near layer: silhouettes with lit windows and a roof feature each, so the
   skyline has a readable rhythm instead of six identical slabs. */
const NEAR_BUILDINGS = [
  { x: 590, w: 98, top: 198, roof: 'parapet' },
  { x: 698, w: 126, top: 152, roof: 'tank' },
  { x: 832, w: 86, top: 216, roof: 'flat' },
  { x: 926, w: 118, top: 170, roof: 'vents' },
  { x: 1052, w: 94, top: 204, roof: 'antenna' },
  { x: 1154, w: 126, top: 140, roof: 'parapet' }
];

/* Window grids, clipped to their own building so nothing lands in open sky —
   which is what the old full-width grid did. */
const WINDOWS = (() => {
  const rand = seeded(981);
  const cell = { w: 13, h: 17, gapX: 11, gapY: 15, inset: 12 };
  const panes = [];
  for (const b of NEAR_BUILDINGS) {
    const left = b.x + cell.inset;
    const right = b.x + b.w - cell.inset;
    for (let y = b.top + cell.inset + 6; y + cell.h < STREET.baseY - 8; y += cell.h + cell.gapY) {
      for (let x = left; x + cell.w <= right; x += cell.w + cell.gapX) {
        const roll = rand();
        panes.push({ x, y, w: cell.w, h: cell.h, lit: roll < 0.3, warm: roll < 0.12 });
      }
    }
  }
  return panes;
})();

/* Grass tufts thin out and shorten toward the horizon — the only perspective
   cue the yard gets, and enough to stop it reading as flat paint. */
const GRASS = (() => {
  const rand = seeded(7321);
  return Array.from({ length: 120 }, () => {
    const depth = rand();
    return {
      x: rand() * (YARD.edge - 12),
      y: HORIZON + 16 + depth * (H - HORIZON - 30),
      w: 8 + depth * 14,
      h: 2 + Math.round(depth * 2),
      dark: rand() < 0.45
    };
  }).sort((a, b) => a.y - b.y);
})();

/** Cracks in the asphalt, laid out once so the road is not a plain rectangle. */
const CRACKS = (() => {
  const rand = seeded(4410);
  return Array.from({ length: 26 }, () => ({
    x: STREET.x + rand() * (W - STREET.x),
    y: STREET.asphaltTop + 12 + rand() * (STREET.asphaltBottom - STREET.asphaltTop - 24),
    w: 18 + rand() * 46,
    h: rand() < 0.3 ? 3 : 2
  }));
})();

function dawnFactor() {
  if (state?.scene !== 'playing') return 0;
  return Math.max(0, Math.min(1, (state.elapsed - DAWN_WINDOW.start) / DAWN_WINDOW.length));
}

export function drawEnvironment() {
  const dawn = dawnFactor();
  drawSky(dawn);
  drawCelestials(dawn);
  drawFarSkyline(dawn);
  drawNearSkyline(dawn);
  drawStreet(dawn);
  drawStreetProps(dawn);
  drawYard(dawn);
  drawHouse(dawn);
  drawBarricade(dawn);
}

function drawSky(dawn) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, mixColor('#070f20', '#7cb4dd', dawn));
  sky.addColorStop(0.55, mixColor('#152241', '#c9a2b4', dawn));
  sky.addColorStop(0.85, mixColor('#2b3a54', '#f2ae83', dawn));
  sky.addColorStop(1, mixColor('#46516a', '#ffdca0', dawn));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON);
}

/* The sun climbs from below the horizon, so at night it is genuinely hidden
   behind the ground and the skyline instead of hanging there at low opacity. */
function drawCelestials(dawn) {
  ctx.save();
  ctx.globalAlpha = 1 - dawn * 0.95;
  for (const star of STARS) {
    ctx.globalAlpha = (1 - dawn * 0.95) * star.alpha;
    ctx.fillStyle = '#dceaff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  // Fades to nothing, or the crescent's cut-out reads as a pale disc at dawn.
  ctx.globalAlpha = Math.max(0, 1 - dawn * 1.35);
  ctx.fillStyle = '#e6efff';
  ctx.shadowColor = '#9fb6e8';
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.arc(1044, 92, 26, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Bite the crescent out with the sky colour behind it.
  ctx.fillStyle = mixColor('#101c37', '#7cb4dd', dawn);
  ctx.beginPath();
  ctx.arc(1056, 81, 25, 0, 7);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#ffdc92';
  ctx.shadowColor = '#ff9d4d';
  ctx.shadowBlur = 46;
  ctx.beginPath();
  ctx.arc(986, HORIZON + 54 - 196 * dawn, 34, 0, 7);
  ctx.fill();
  ctx.restore();
}

function drawFarSkyline(dawn) {
  ctx.fillStyle = mixColor('#131c30', '#8ea6b6', dawn);
  for (const b of FAR_BUILDINGS) ctx.fillRect(b.x, b.top, b.w, STREET.baseY - b.top);
}

function drawNearSkyline(dawn) {
  const body = mixColor('#0d1522', '#5c6f7e', dawn);
  const edge = mixColor('#161f2e', '#6d8090', dawn);

  for (const b of NEAR_BUILDINGS) {
    ctx.fillStyle = body;
    ctx.fillRect(b.x, b.top, b.w, STREET.baseY - b.top);
    // Lit left edge gives each block a face instead of a flat silhouette.
    ctx.fillStyle = edge;
    ctx.fillRect(b.x, b.top, 4, STREET.baseY - b.top);
    drawRoofFeature(b, body, edge);
  }

  for (const pane of WINDOWS) {
    if (!pane.lit) {
      ctx.fillStyle = mixColor('#080d17', '#4b5c6a', dawn);
      ctx.fillRect(pane.x, pane.y, pane.w, pane.h);
      continue;
    }
    ctx.fillStyle = mixColor(pane.warm ? '#ffcf7a' : '#9fd0e8', '#fdf0cf', dawn);
    ctx.globalAlpha = 1 - dawn * 0.75;
    ctx.fillRect(pane.x, pane.y, pane.w, pane.h);
    ctx.globalAlpha = 1;
  }
}

function drawRoofFeature({ x, w, top, roof }, body, edge) {
  ctx.fillStyle = body;
  if (roof === 'parapet') {
    ctx.fillRect(x - 4, top - 9, w + 8, 9);
    ctx.fillStyle = edge;
    ctx.fillRect(x - 4, top - 9, w + 8, 3);
  } else if (roof === 'tank') {
    ctx.fillRect(x + w * 0.52, top - 30, 30, 30);
    ctx.fillRect(x + w * 0.5 + 4, top - 36, 34, 7);
  } else if (roof === 'vents') {
    ctx.fillRect(x + 16, top - 14, 26, 14);
    ctx.fillRect(x + w - 40, top - 9, 22, 9);
  } else if (roof === 'antenna') {
    ctx.fillRect(x + w * 0.46, top - 46, 4, 46);
    ctx.fillRect(x + w * 0.46 - 9, top - 40, 22, 3);
    ctx.fillRect(x + w * 0.46 - 6, top - 31, 16, 3);
  }
}

/* Bands from back to front. The curbs are what make the skyline stand on
   something and give the asphalt a real far edge. */
function drawStreet(dawn) {
  const x = STREET.x;
  const width = W - x;

  ctx.fillStyle = mixColor('#1b2027', '#8b8d8a', dawn);
  ctx.fillRect(x, STREET.walkTop, width, STREET.curbTop - STREET.walkTop);
  ctx.fillStyle = mixColor('#252b33', '#a3a49f', dawn);
  ctx.fillRect(x, STREET.curbTop, width, STREET.asphaltTop - STREET.curbTop);
  ctx.fillStyle = mixColor('#0e1116', '#3e4249', dawn);
  ctx.fillRect(x, STREET.asphaltTop, width, 5);

  ctx.fillStyle = mixColor('#15181e', '#585c62', dawn);
  ctx.fillRect(x, STREET.asphaltTop, width, STREET.asphaltBottom - STREET.asphaltTop);

  ctx.fillStyle = mixColor('#1b1f26', '#63676c', dawn);
  for (const crack of CRACKS) ctx.fillRect(crack.x, crack.y, crack.w, crack.h);

  // Centre line, then the near curb and the dirt verge the barricade sits in.
  ctx.fillStyle = mixColor('#3a4048', '#c9bf8d', dawn);
  for (let dash = x + 24; dash < W; dash += 118) ctx.fillRect(dash, STREET.laneY, 66, 7);

  ctx.fillStyle = mixColor('#252b33', '#a3a49f', dawn);
  ctx.fillRect(x, STREET.asphaltBottom, width, STREET.nearCurbBottom - STREET.asphaltBottom);
  ctx.fillStyle = mixColor('#0d1014', '#4a4d51', dawn);
  ctx.fillRect(x, STREET.asphaltBottom, width, 4);
  ctx.fillStyle = mixColor('#171d1a', '#5d5b47', dawn);
  ctx.fillRect(x, STREET.nearCurbBottom, width, H - STREET.nearCurbBottom);
}

/* A leaning pole with slack wires, and a stripped car on the back sidewalk.
   Both sit above the walking band, so they add depth without hiding zombies. */
function drawStreetProps(dawn) {
  const poleX = 1108;
  ctx.strokeStyle = mixColor('#0b0f14', '#3f434a', dawn);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(STREET.x, 176);
  ctx.quadraticCurveTo((STREET.x + poleX) / 2, 214, poleX, 168);
  ctx.moveTo(poleX, 176);
  ctx.quadraticCurveTo((poleX + W) / 2, 210, W, 182);
  ctx.stroke();

  ctx.fillStyle = mixColor('#171b21', '#4c4a44', dawn);
  ctx.fillRect(poleX, 160, 9, STREET.baseY - 160);
  ctx.fillRect(poleX - 17, 172, 43, 6);

  drawWreck(722, STREET.baseY, dawn);
}

function drawWreck(x, groundY, dawn) {
  const body = mixColor('#2a2320', '#6d5f56', dawn);
  const glass = mixColor('#111820', '#48555f', dawn);
  ctx.fillStyle = body;
  ctx.fillRect(x, groundY - 26, 108, 18);
  ctx.beginPath();
  ctx.moveTo(x + 24, groundY - 26);
  ctx.lineTo(x + 40, groundY - 44);
  ctx.lineTo(x + 80, groundY - 44);
  ctx.lineTo(x + 90, groundY - 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = glass;
  ctx.fillRect(x + 42, groundY - 41, 34, 14);
  ctx.fillStyle = mixColor('#0c0f13', '#2f3338', dawn);
  ctx.beginPath();
  ctx.arc(x + 24, groundY - 7, 9, 0, 7);
  ctx.arc(x + 84, groundY - 7, 9, 0, 7);
  ctx.fill();
}

function drawYard(dawn) {
  ctx.fillStyle = mixColor('#16241b', '#5d7548', dawn);
  ctx.fillRect(0, HORIZON, YARD.edge, H - HORIZON);

  // Ground haze at the far edge keeps the yard from ending in a hard seam.
  const haze = ctx.createLinearGradient(0, HORIZON, 0, HORIZON + 70);
  haze.addColorStop(0, mixColor('#2b3a4a', '#9fb0b4', dawn));
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = haze;
  ctx.fillRect(0, HORIZON, YARD.edge, 70);
  ctx.globalAlpha = 1;

  for (const tuft of GRASS) {
    ctx.fillStyle = tuft.dark ? mixColor('#1d2f20', '#4d6339', dawn) : mixColor('#2b4a2e', '#6f8c53', dawn);
    ctx.fillRect(tuft.x, tuft.y, tuft.w, tuft.h);
  }

  // Worn path from the porch steps out to the barricade.
  ctx.fillStyle = mixColor('#2c2a20', '#7c7355', dawn);
  ctx.beginPath();
  ctx.moveTo(150, HOUSE.fenceBottom);
  ctx.lineTo(232, HOUSE.fenceBottom);
  ctx.lineTo(YARD.edge, 604);
  ctx.lineTo(YARD.edge, 668);
  ctx.lineTo(196, 700);
  ctx.closePath();
  ctx.fill();
}

function drawHouse(dawn) {
  const { x, w, wallTop, base, apexY, eaveY, eaveOut, centerX } = HOUSE;

  /* Cast shadow first, so the house lands on the grass instead of floating. A
     soft gradient rather than a flat ellipse — at full dawn a hard oval on lit
     grass reads as a hole in the ground. */
  ctx.save();
  const shadowY = HOUSE.fenceBottom + 8;
  const shade = ctx.createRadialGradient(centerX, shadowY, 8, centerX, shadowY, w * 0.66);
  shade.addColorStop(0, 'rgba(8,13,10,.34)');
  shade.addColorStop(0.6, 'rgba(8,13,10,.16)');
  shade.addColorStop(1, 'rgba(8,13,10,0)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(centerX, shadowY, w * 0.66, 22, 0, 0, 7);
  ctx.fill();
  ctx.restore();

  // Wall, with lap siding and a darker gable end under the roof.
  ctx.fillStyle = '#3c2622';
  ctx.fillRect(x - 4, wallTop - 4, w + 8, base - wallTop + 8);
  ctx.fillStyle = '#5d372c';
  ctx.fillRect(x, wallTop, w, base - wallTop);
  ctx.fillStyle = '#4c2c24';
  for (let y = wallTop + 12; y < base; y += 15) ctx.fillRect(x, y, w, 3);

  drawChimney(eaveY, apexY, centerX);
  drawRoof(x, w, apexY, eaveY, eaveOut, centerX);
  drawWallDetail();
  drawWindow(HOUSE.x + 26, 302, true);
  drawWindow(HOUSE.x + 190, 302, false, dawn);
  drawDoor(dawn);
  drawPorch();

  // Warm spill from the lit window onto the yard.
  ctx.save();
  const glowX = HOUSE.x + 215;
  const spill = ctx.createRadialGradient(glowX, 360, 10, glowX, 360, 210);
  spill.addColorStop(0, `rgba(255,196,104,${0.26 * (1 - dawn)})`);
  spill.addColorStop(1, 'rgba(255,196,104,0)');
  ctx.fillStyle = spill;
  ctx.fillRect(glowX - 210, 250, 420, 300);
  ctx.restore();
}

/* The right third of the wall was an empty slab next to a busy left side. A
   gable vent and a downpipe balance it without adding another window. */
function drawWallDetail() {
  const ventX = HOUSE.x + HOUSE.w - 74;
  ctx.fillStyle = '#2a1a15';
  ctx.fillRect(ventX, 292, 44, 34);
  ctx.fillStyle = '#3d2a20';
  ctx.fillRect(ventX + 3, 295, 38, 28);
  ctx.fillStyle = '#241812';
  for (let i = 0; i < 4; i++) ctx.fillRect(ventX + 5, 298 + i * 7, 34, 3);

  // Downpipe running to the ground.
  const pipeX = HOUSE.x + HOUSE.w - 14;
  ctx.fillStyle = '#3a2b22';
  ctx.fillRect(pipeX, HOUSE.eaveY + 10, 7, HOUSE.base - HOUSE.eaveY - 10);
  ctx.fillStyle = '#4d3a2d';
  ctx.fillRect(pipeX, HOUSE.eaveY + 10, 2, HOUSE.base - HOUSE.eaveY - 10);
  ctx.fillStyle = '#2a1e18';
  for (const braceY of [HOUSE.eaveY + 40, HOUSE.eaveY + 110]) ctx.fillRect(pipeX - 2, braceY, 11, 4);
}

function drawRoof(x, w, apexY, eaveY, eaveOut, centerX) {
  const left = x - eaveOut;
  const right = x + w + eaveOut;

  ctx.fillStyle = '#20140f';
  ctx.beginPath();
  ctx.moveTo(left - 6, eaveY + 10);
  ctx.lineTo(centerX, apexY - 8);
  ctx.lineTo(right + 6, eaveY + 10);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, eaveY);
  ctx.lineTo(centerX, apexY);
  ctx.lineTo(right, eaveY);
  ctx.closePath();
  ctx.fillStyle = '#6d382e';
  ctx.fill();
  // Shingle courses, clipped to the gable so they follow the roof shape.
  ctx.clip();
  ctx.fillStyle = '#5b2e26';
  for (let y = apexY + 10; y < eaveY; y += 13) ctx.fillRect(left, y, right - left, 4);
  /* Shade across the gable with a gradient rather than a triangle. The triangle
     put a hard vertical edge down the centre of the roof, which read as a seam
     splitting it in two instead of as light falling across one face. */
  const roofShade = ctx.createLinearGradient(left, 0, right, 0);
  roofShade.addColorStop(0, 'rgba(255,220,190,.07)');
  roofShade.addColorStop(0.45, 'rgba(20,10,8,0)');
  roofShade.addColorStop(1, 'rgba(20,10,8,.26)');
  ctx.fillStyle = roofShade;
  ctx.fillRect(left, apexY, right - left, eaveY - apexY);
  ctx.restore();

  // Ridge cap, so the apex is a built edge rather than a bare point.
  ctx.fillStyle = '#4a251f';
  ctx.beginPath();
  ctx.moveTo(centerX - 7, apexY + 13);
  ctx.lineTo(centerX, apexY - 1);
  ctx.lineTo(centerX + 7, apexY + 13);
  ctx.closePath();
  ctx.fill();

  // Fascia board along the eaves.
  ctx.fillStyle = '#83503c';
  ctx.fillRect(left, eaveY, right - left, 9);
  ctx.fillStyle = '#2a1a15';
  ctx.fillRect(left, eaveY + 9, right - left, 3);
}

/* The stack is drawn BEFORE the roof, so the gable paints over its base and the
   roof's own edge cuts it on the diagonal. That is what makes it read as coming
   through the roof in flat, front-on art.

   Painting it on top of the roof instead needs the base to land exactly on the
   slope, and the earlier attempts at that both failed: the roof falls away to
   the right, so a stack sized to the slope under its left edge hung half in the
   sky, and at x=272 the roof's right edge is at x=272 — the entire column was
   outside the triangle with one corner touching. Sitting behind, position only
   has to satisfy "base is inside the roof", which the constant below does with
   room to spare. */
function drawChimney(eaveY, apexY, centerX) {
  const roofRight = HOUSE.x + HOUSE.w + HOUSE.eaveOut;
  const width = 34;
  // Near the ridge, where the triangle is wide enough to hide the whole base.
  const chimneyX = centerX + 20;
  const slopeAt = (px) => apexY + ((px - centerX) / (roofRight - centerX)) * (eaveY - apexY);
  // Extend well past the slope; everything below it is covered by the roof.
  const buried = slopeAt(chimneyX + width) + 26;
  const top = slopeAt(chimneyX) - 58;

  ctx.fillStyle = '#241614';
  ctx.fillRect(chimneyX - 2, top - 2, width + 4, buried - top + 2);
  ctx.fillStyle = '#6f4032';
  ctx.fillRect(chimneyX + 2, top + 2, width - 4, buried - top - 4);

  // Brick courses and a shaded right face.
  ctx.fillStyle = 'rgba(40,22,16,.4)';
  for (let by = top + 12; by < buried; by += 13) ctx.fillRect(chimneyX + 2, by, width - 4, 2);
  ctx.fillStyle = 'rgba(20,10,8,.25)';
  ctx.fillRect(chimneyX + width - 11, top + 2, 9, buried - top - 4);

  // Cap.
  ctx.fillStyle = '#2a1a15';
  ctx.fillRect(chimneyX - 7, top - 10, width + 14, 10);
  ctx.fillStyle = '#8d5642';
  ctx.fillRect(chimneyX - 5, top - 9, width + 10, 8);
  ctx.fillStyle = '#a26a52';
  ctx.fillRect(chimneyX - 5, top - 9, width + 10, 2);
}

/** `boarded` planks over the glass; the other window stays lit and warm. */
function drawWindow(x, y, boarded, dawn = 0) {
  ctx.fillStyle = '#1d1614';
  ctx.fillRect(x - 6, y - 6, 62, 60);
  ctx.fillStyle = boarded ? '#241d1a' : mixColor('#e8bd66', '#fff0c4', dawn);
  ctx.fillRect(x, y, 50, 48);

  if (boarded) {
    /* Crossed planks overhanging the frame, so it reads as boards nailed over
       glass rather than as siding. Horizontal bars looked like wall slats. */
    // Broken glass still in the frame, so the boards cover something.
    ctx.fillStyle = '#39322c';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + 22, y + 18);
    ctx.lineTo(x + 6, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 46, y + 6);
    ctx.lineTo(x + 30, y + 22);
    ctx.lineTo(x + 46, y + 34);
    ctx.closePath();
    ctx.fill();

    /* Boards kept just inside the sill. They used to run 84px wide against a
       50px frame, so they hung into open siding and read as loose planks stuck
       on the wall rather than as a window boarded shut. */
    ctx.save();
    ctx.translate(x + 25, y + 24);
    for (const angle of [0.36, -0.36]) {
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = '#7b5439';
      ctx.fillRect(-33, -7, 66, 14);
      ctx.fillStyle = '#966844';
      ctx.fillRect(-33, -5, 66, 3);
      ctx.fillStyle = '#40291c';
      ctx.fillRect(-33, 4, 66, 3);
      ctx.fillStyle = '#2b1c13';
      ctx.fillRect(-26, -2, 3, 3);
      ctx.fillRect(23, -2, 3, 3);
      ctx.restore();
    }
    ctx.restore();
  } else {
    ctx.strokeStyle = '#33211d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 25, y);
    ctx.lineTo(x + 25, y + 48);
    ctx.moveTo(x, y + 24);
    ctx.lineTo(x + 50, y + 24);
    ctx.stroke();
  }

  // Sill, which is what actually seats the window into the wall.
  ctx.fillStyle = '#8d5c44';
  ctx.fillRect(x - 10, y + 48, 70, 7);
  ctx.fillStyle = '#2a1a15';
  ctx.fillRect(x - 10, y + 55, 70, 3);
}

function drawDoor(dawn) {
  const x = HOUSE.centerX - 26;
  ctx.fillStyle = '#1e1512';
  ctx.fillRect(x - 6, 326, 64, HOUSE.base - 326);
  ctx.fillStyle = '#6b4132';
  ctx.fillRect(x, 332, 52, HOUSE.base - 332);
  ctx.fillStyle = '#573327';
  ctx.fillRect(x + 6, 342, 40, 38);
  ctx.fillRect(x + 6, 388, 40, 38);
  ctx.fillStyle = mixColor('#e8bd66', '#fff0c4', dawn);
  ctx.beginPath();
  ctx.arc(x + 44, 396, 3.5, 0, 7);
  ctx.fill();
}

/* Deck, steps and a picket fence. The steps are the detail that makes the porch
   a height the player could plausibly stand on. */
function drawPorch() {
  const left = HOUSE.x - 20;
  const right = HOUSE.x + HOUSE.w + 20;

  /* Skirt and piers under the deck. Without them the porch was a plank floating
     over grass with a gap behind it. */
  ctx.fillStyle = '#20160f';
  ctx.fillRect(left + 6, HOUSE.porchBottom, right - left - 12, HOUSE.fenceBottom - HOUSE.porchBottom - 6);
  ctx.fillStyle = '#2c2018';
  for (let px = left + 14; px < right - 16; px += 22) {
    ctx.fillRect(px, HOUSE.porchBottom, 9, HOUSE.fenceBottom - HOUSE.porchBottom - 8);
  }
  ctx.fillStyle = '#3a2a1e';
  for (const pier of [left + 8, HOUSE.centerX - 70, HOUSE.centerX + 62, right - 20]) {
    ctx.fillRect(pier, HOUSE.porchBottom - 2, 13, HOUSE.fenceBottom - HOUSE.porchBottom + 2);
  }

  ctx.fillStyle = '#4a3226';
  ctx.fillRect(left, HOUSE.porchTop, right - left, HOUSE.porchBottom - HOUSE.porchTop);
  ctx.fillStyle = '#2b1c15';
  ctx.fillRect(left, HOUSE.porchBottom - 4, right - left, 4);
  // Deck boards, so the floor has a direction.
  ctx.fillStyle = 'rgba(28,18,12,.35)';
  for (let bx = left + 12; bx < right - 6; bx += 24) ctx.fillRect(bx, HOUSE.porchTop, 2, 12);

  // Steps down to the path.
  ctx.fillStyle = '#54382a';
  ctx.fillRect(HOUSE.centerX - 44, HOUSE.porchBottom, 88, 12);
  ctx.fillStyle = '#3f2a20';
  ctx.fillRect(HOUSE.centerX - 52, HOUSE.porchBottom + 12, 104, 12);

  ctx.fillStyle = '#3a2419';
  ctx.fillRect(left, HOUSE.fenceTop, right - left, 8);
  ctx.fillStyle = '#7d5238';
  for (let x = left + 4; x < right - 8; x += 27) {
    // Leave a gap where the steps meet the path.
    if (x > HOUSE.centerX - 58 && x < HOUSE.centerX + 46) continue;
    ctx.fillRect(x, HOUSE.fenceTop + 8, 8, HOUSE.fenceBottom - HOUSE.fenceTop - 8);
  }
  ctx.fillStyle = '#95674a';
  ctx.fillRect(left, HOUSE.fenceBottom - 12, right - left, 6);

  // Shrubs, tucked against the wall where they read as planting.
  ctx.fillStyle = '#2c4530';
  ctx.beginPath();
  ctx.arc(right + 34, 404, 38, 0, 7);
  ctx.arc(right + 76, 420, 29, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#375539';
  ctx.beginPath();
  ctx.arc(right + 24, 392, 22, 0, 7);
  ctx.fill();
}

/** How much of the barricade is still standing, 0..1. */
function barricadeRatio() {
  if (!state || !state.maxBarr) return 1;
  return Math.max(0, Math.min(1, state.barricade / state.maxBarr));
}

/* Plank-by-plank wear: boards drop off the wall as health falls, so the line's
   condition is readable in the world and not only on the HUD meter. */
function drawBarricade(dawn) {
  const { x, w, top, bottom, plankH, plankGap } = BARRICADE;
  const ratio = barricadeRatio();

  // Posts stay until the wall is gone entirely.
  ctx.fillStyle = mixColor('#2d2a25', '#6b665c', dawn);
  ctx.fillRect(x - 12, top, 14, bottom - top);
  ctx.fillRect(x + w - 2, top, 14, bottom - top);
  ctx.fillStyle = mixColor('#3b3730', '#847d70', dawn);
  ctx.fillRect(x - 12, top, 5, bottom - top);
  ctx.fillRect(x + w - 2, top, 5, bottom - top);

  if (ratio <= 0) {
    drawRubble(dawn);
    return;
  }

  const slots = Math.floor((bottom - top - 12) / plankGap);
  const standing = Math.max(1, Math.round(slots * ratio));

  /* No backing panel: gaps show the street through the wall, which reads as
     holes. A filled backing made a half-wrecked barricade look like a door. */
  for (let i = 0; i < slots; i++) {
    const y = top + 10 + i * plankGap;
    // Boards fail from the middle out, where the horde actually chews.
    const distanceFromMiddle = Math.abs(i - (slots - 1) / 2);
    if (distanceFromMiddle < (slots / 2) * (1 - ratio)) continue;

    ctx.fillStyle = '#6f4a35';
    ctx.fillRect(x - 8, y, w + 16, plankH);
    ctx.fillStyle = '#8f6244';
    ctx.fillRect(x - 4, y + 3, w + 8, 4);
    ctx.fillStyle = '#4b3124';
    ctx.fillRect(x - 8, y + plankH - 3, w + 16, 3);
  }

  // Cross braces, and a scrap sheet riveted over the middle.
  ctx.strokeStyle = '#2b1b13';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 4, top + 14);
  ctx.lineTo(x + w + 4, bottom - 14);
  ctx.moveTo(x + w + 4, top + 14);
  ctx.lineTo(x - 4, bottom - 14);
  ctx.stroke();

  if (ratio > 0.45) {
    ctx.fillStyle = mixColor('#5a6168', '#98a0a2', dawn);
    ctx.fillRect(x + 6, 452, w - 12, 74);
    ctx.fillStyle = mixColor('#43494f', '#7e868a', dawn);
    ctx.fillRect(x + 6, 452, w - 12, 5);
    ctx.fillStyle = mixColor('#767d82', '#b4bbbd', dawn);
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 12 + i * 16, 458, 3, 3);
  }

  drawFortification(dawn);
  drawSandbags(dawn);
}

/* Whatever is bolted to the line, by tier. Visible so the upgrade is something
   you can see working, not just a number in the shop. */
function drawFortification(dawn) {
  const tier = state?.fortification || 0;
  if (!tier) return;
  const { x, w, top, bottom } = BARRICADE;
  const right = x + w + 6;

  if (tier >= 1) {
    // Barbed wire: a coil down the outer face with barbs on it.
    ctx.strokeStyle = mixColor('#8f9aa1', '#c3c9c6', dawn);
    ctx.lineWidth = 2;
    for (let y = top + 22; y < bottom - 16; y += 26) {
      ctx.beginPath();
      ctx.arc(right, y, 9, -1.9, 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(right + 4, y - 6); ctx.lineTo(right + 13, y - 9);
      ctx.moveTo(right + 6, y + 4); ctx.lineTo(right + 15, y + 7);
      ctx.stroke();
    }
  }
  if (tier >= 2) {
    // Spikes jutting out into the road.
    ctx.fillStyle = mixColor('#6d6a63', '#a9a49a', dawn);
    for (let y = top + 30; y < bottom - 20; y += 34) {
      ctx.beginPath();
      ctx.moveTo(right + 2, y - 5);
      ctx.lineTo(right + 24, y);
      ctx.lineTo(right + 2, y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (tier >= 3) {
    // Live wire: arcs crackle along the boards.
    const pulse = 0.45 + Math.abs(Math.sin(performance.now() / 190)) * 0.55;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#9fd8ff';
    ctx.shadowColor = '#6cc4ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    for (let y = top + 18; y < bottom - 14; y += 30) {
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      for (let step = 0; step < 4; step++) {
        ctx.lineTo(x - 8 + (step + 1) * ((w + 20) / 4), y + (step % 2 ? 5 : -5));
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Sandbags stacked on the yard side, at the foot of the wall. */
function drawSandbags(dawn) {
  ctx.fillStyle = mixColor('#4c4632', '#8f8664', dawn);
  const rows = [[BARRICADE.x - 44, 596], [BARRICADE.x - 44, 620], [BARRICADE.x - 30, 608]];
  for (const [x, y] of rows) {
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 11, 0, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = mixColor('#3a3527', '#6f684e', dawn);
  for (const [x, y] of rows) ctx.fillRect(x - 18, y + 8, 36, 3);
}

function drawRubble(dawn) {
  const { x, w, top, bottom } = BARRICADE;
  ctx.fillStyle = mixColor('#3d2a1f', '#7b6349', dawn);
  for (let i = 0; i < 11; i++) {
    const y = top + 22 + i * ((bottom - top - 40) / 11);
    const lean = ((i * 37) % 26) - 13;
    ctx.save();
    ctx.translate(x + w / 2 + lean, y);
    ctx.rotate(((i % 4) - 1.5) * 0.34);
    ctx.fillRect(-30, -6, 60, 12);
    ctx.fillStyle = mixColor('#523a2a', '#93795c', dawn);
    ctx.fillRect(-26, -4, 52, 3);
    ctx.restore();
    ctx.fillStyle = mixColor('#3d2a1f', '#7b6349', dawn);
  }
  drawSandbags(dawn);
}
