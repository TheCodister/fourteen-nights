/* Headless smoke test — `npm test`.
   Stubs just enough DOM/canvas to boot src/main.js in node, then drives real
   frames through the real systems. No browser, no dependencies.

   Add a case by driving frames and asserting on stateModule.state; keep using
   `stateModule.state` rather than destructuring, because state.js reassigns the
   binding on every new run. */
const noop = () => {};

const ctxStub = new Proxy({}, {
  get(target, prop) {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (prop === 'measureText') return () => ({ width: 10 });
    return typeof target[prop] === 'undefined' ? noop : target[prop];
  },
  set: () => true
});

const registry = new Map();
const makeEl = (id) => ({
  id, textContent: '', innerHTML: '', value: '6', dataset: {}, style: {},
  classList: { toggle: noop, add: noop, remove: noop },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
  getContext: () => ctxStub,
  addEventListener: noop,
  setPointerCapture: noop,
  releasePointerCapture: noop,
  querySelector: (selector) => lookup(selector),
  querySelectorAll: () => [],
  onclick: null, oninput: null, onchange: null
});
const lookup = (selector) => {
  if (!registry.has(selector)) registry.set(selector, makeEl(selector));
  return registry.get(selector);
};

globalThis.window = { addEventListener: noop, AudioContext: undefined };
globalThis.document = { querySelector: lookup };
globalThis.localStorage = {
  store: new Map(),
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
  setItem(key, value) { this.store.set(key, String(value)); }
};
globalThis.performance = { now: () => 0 };

let frames = [];
globalThis.requestAnimationFrame = (fn) => frames.push(fn);

await import('../src/main.js');
const stateModule = await import('../src/core/state.js');
const { mouse } = await import('../src/core/input.js');

let failures = 0;
const assert = (label, condition) => {
  if (!condition) failures++;
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}`);
};

/** Advances the loop. `invincible` pins the defences so a night can reach dawn. */
let clock = 0;
let invincible = false;
const drive = (seconds) => {
  for (let i = 0, ticks = Math.round(seconds / 0.016); i < ticks; i++) {
    clock += 16;
    const queued = frames;
    frames = [];
    for (const fn of queued) fn(clock);
    if (invincible) {
      stateModule.state.barricade = stateModule.state.maxBarr;
      stateModule.state.player.hp = 100;
    }
  }
};

assert('boots on the title scene', stateModule.state.scene === 'title');

lookup('#start').onclick();
assert('start begins night 1', stateModule.state.scene === 'playing' && stateModule.state.night === 1);

drive(3);
assert('spawn director produces zombies', stateModule.state.zombies.length > 0);
assert('night intro card expires', stateModule.state.nightIntro <= 0);

// Hold fire down and confirm shooting, hitting and payout all wire up.
mouse.down = true;
for (let i = 0; i < 30; i++) {
  const target = stateModule.state.zombies[0];
  if (target) {
    mouse.x = target.x;
    mouse.y = target.y - target.r * 0.68; // aim for the head
  }
  drive(0.3);
}
mouse.down = false;
assert('firing produces bullets', stateModule.state.bullets.length > 0);
assert('kills pay out cash', stateModule.state.cash > 0 && stateModule.state.killed > 0);

assert('headshots build the streak', stateModule.state.streakBest > 0);
assert('reloads record their duration for the HUD bar', stateModule.state.reloadTotal > 0);

// The vignette pulse decays between bites, so sample its peak across the window.
const barricadeBefore = stateModule.state.barricade;
let flashPeak = 0;
for (let i = 0; i < 200; i++) {
  drive(0.1);
  flashPeak = Math.max(flashPeak, stateModule.state.barrFlash);
}
assert('horde damages the barricade', stateModule.state.barricade < barricadeBefore);
assert('barricade bites raise the vignette pulse', flashPeak > 0);

// Spitters: a telegraphed lob that leaves a damaging puddle where it lands.
invincible = true;
const { types } = await import('../src/data/zombies.js');
stateModule.state.acid.length = 0;
stateModule.state.puddles.length = 0;
stateModule.state.zombies.push({
  ...types.spitter, type: 'spitter', r: 26, x: 700, y: 460,
  maxHp: types.spitter.hp, hp: types.spitter.hp, boss: false, headHp: 1, attackCd: 0, bob: 0
});
drive(0.1);
const spit = stateModule.state.acid[0];
assert('spitters lob acid at a telegraphed landing spot', !!spit && spit.flight > 0 && spit.tx > 0);
drive(2.5);
assert('acid leaves a puddle behind', stateModule.state.puddles.length > 0);

invincible = false;
const puddle = stateModule.state.puddles[0];
stateModule.state.barricade = stateModule.state.maxBarr;
Object.assign(stateModule.state.player, { x: puddle.x, y: puddle.y, hp: 100 });
drive(0.5);
assert('standing in acid costs health', stateModule.state.player.hp < 100);

// Drop the barricade and let the horde walk in.
stateModule.state.barricade = 0;
for (let i = 0; i < 30 && stateModule.state.scene === 'playing'; i++) drive(1);
assert('a broken barricade ends the run', stateModule.state.scene === 'gameover');

// Restart and coast to dawn with the defences pinned.
lookup('#again').onclick();
invincible = true;
drive(95);
stateModule.state.zombies.length = 0;
drive(1);
invincible = false;
assert('surviving to dawn reaches the between scene', stateModule.state.scene === 'between');
assert('scrap is banked for the night', stateModule.state.scrap >= 35);

lookup('#repairHours').value = '9';
lookup('#commitDawn').onclick();
assert('dawn plan advances the calendar', stateModule.state.night === 2);
lookup('#toShop').onclick();
lookup('#continue').onclick();
assert('armory leads into night 2', stateModule.state.scene === 'playing' && stateModule.state.night === 2);

// Boss night.
stateModule.state.night = 7;
lookup('#continue').onclick();
invincible = true;
drive(50);
invincible = false;
assert('night 7 spawns the foreman', stateModule.state.zombies.some((z) => z.boss && z.type === 'foreman'));

// Difficulty: assert the published body/headshot table, in Pistol shots.
const { scaleZombie } = await import('../src/data/difficulty.js');
const { bosses } = await import('../src/data/zombies.js');
const PISTOL = 20;
const ARMOR_SCALE = 0.75;
const bodyShots = (template, id) => {
  const { hp } = scaleZombie(template, id);
  return Math.ceil(hp / (PISTOL * (template.armor ? ARMOR_SCALE : 1)));
};
const headShots = (template, id, boss = false) => scaleZombie(template, id, boss).headHp;

const table = [
  ['easy', 5, 1, 12, 2, 8, 10],
  ['normal', 7, 2, 10, 3, 10, 13],
  ['hard', 9, 3, 8, 4, 12, 16],
  ['nightmare', 9, 3, 8, 4, 12, 16]
];
for (const [id, nBody, nHead, tBody, tHead, foreman, passenger] of table) {
  assert(`${id}: shambler ${nBody} body / ${nHead} headshot`,
    bodyShots(types.shambler, id) === nBody && headShots(types.shambler, id) === nHead);
  assert(`${id}: tough ${tBody} body / ${tHead} headshots`,
    bodyShots(types.tough, id) === tBody && headShots(types.tough, id) === tHead);
  assert(`${id}: bosses ${foreman} / ${passenger} headshots`,
    headShots(bosses[7], id, true) === foreman && headShots(bosses[14], id, true) === passenger);
}

// A spawned zombie must carry the scaled values, not the raw table's.
localStorage.setItem('fn_difficulty', 'hard');
lookup('#again').onclick();
stateModule.state.difficulty = 'hard';
const { spawnZombie, spawnBoss } = await import('../src/systems/spawner.js');
stateModule.state.zombies.length = 0;
spawnZombie('shambler');
spawnBoss(bosses[7]);
const [shambler, foremanBoss] = stateModule.state.zombies;
assert('hard spawns scale shambler hp and headHp',
  shambler.hp === 180 && shambler.maxHp === 180 && shambler.headHp === 3);
assert('hard spawns scale boss headHp', foremanBoss.headHp === 12);

// Nightmare must match Hard's durability exactly, and only differ in wave size.
const { difficulties } = await import('../src/data/difficulty.js');
const durability = (d) => JSON.stringify([d.hpMultiplier, d.armorHpMultiplier, d.headHp, d.bossHeadMultiplier]);
assert('nightmare durability is identical to hard',
  durability(difficulties.nightmare) === durability(difficulties.hard));

const { runSpawnDirector } = await import('../src/systems/spawner.js');
/** Zombies produced by one wave on `night` at the given difficulty. */
const waveSize = (id, night) => {
  stateModule.state.difficulty = id;
  stateModule.state.night = night;
  stateModule.state.zombies.length = 0;
  stateModule.state.bossSpawned = true; // keep the boss out of the count
  stateModule.state.spawnClock = 0;
  runSpawnDirector(0.016);
  return stateModule.state.zombies.length;
};
assert('nightmare night 1 waves match hard', waveSize('nightmare', 1) === waveSize('hard', 1));
assert('nightmare night 2 waves are larger than hard', waveSize('nightmare', 2) > waveSize('hard', 2));
assert('nightmare still boosts on a late night', waveSize('nightmare', 12) > waveSize('hard', 12));

stateModule.state.difficulty = 'hard';
stateModule.state.night = 1;

/* End-to-end on hard: drive real bullets into a real head and confirm the first
   headshot no longer kills. Guards the whole chain, not just the data table. */
const { updateBullets } = await import('../src/systems/bullets.js');
stateModule.state.zombies.length = 0;
stateModule.state.bullets.length = 0;
spawnZombie('shambler');
const victim = stateModule.state.zombies[0];
// Spawns land at x~1325, off the right edge, where bullets are culled as spent.
Object.assign(victim, { x: 800, y: 500 });
const headshotAt = () => {
  stateModule.state.bullets.push({
    x: victim.x, y: victim.y - victim.r * 0.68, vx: 0, vy: 0,
    damage: 20, pierce: 0, life: 1, bot: false, color: '#fff', trail: 10, projectileSize: 2
  });
  updateBullets(0.016);
};
// Derived from the table, so retuning hard cannot silently invalidate this.
const needed = headShots(types.shambler, 'hard');
for (let i = 1; i < needed; i++) {
  headshotAt();
  assert(`hard: headshot ${i} of ${needed} wounds but does not kill`,
    stateModule.state.zombies.length === 1 && victim.headHp === needed - i);
}
headshotAt();
assert(`hard: headshot ${needed} kills`, stateModule.state.zombies.length === 0);

console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
