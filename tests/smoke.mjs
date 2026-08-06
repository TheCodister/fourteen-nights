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
stateModule.state.zones.length = 0;
stateModule.state.zombies.push({
  ...types.spitter, type: 'spitter', r: 26, x: 700, y: 460,
  maxHp: types.spitter.hp, hp: types.spitter.hp, boss: false, headHp: 1, attackCd: 0, bob: 0
});
drive(0.1);
const spit = stateModule.state.acid[0];
assert('spitters lob acid at a telegraphed landing spot', !!spit && spit.flight > 0 && spit.tx > 0);
drive(2.5);
assert('acid leaves a zone behind', stateModule.state.zones.length > 0);

invincible = false;
const puddle = stateModule.state.zones[0];
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

/* Payouts did not move when the ladder shifted up; Nightmare shares Hard's. */
assert('rewards stay x1 / x1.2 / x1.5, nightmare matching hard',
  difficulties.easy.reward === 1 && difficulties.normal.reward === 1.2
  && difficulties.hard.reward === 1.5 && difficulties.nightmare.reward === difficulties.hard.reward);

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
/* Head hitbox: tightened to 0.55r, and it must never shrink below the drawn head
   or shots that visibly hit the head would miss. */
const { HEAD } = await import('../src/systems/bullets.js');
const { Z } = await import('../src/render/actors.js');
assert('head hitbox is not smaller than the drawn head', HEAD.radius >= Z.headR);

/** Fires at a horizontal offset from the head centre. Returns headHp afterwards. */
const shotOffsetFromHead = (fraction) => {
  stateModule.state.bullets.length = 0;
  const before = victim.headHp;
  stateModule.state.bullets.push({
    x: victim.x + victim.r * fraction, y: victim.y - victim.r * HEAD.offset,
    vx: 0, vy: 0, damage: 20, pierce: 0, life: 1, bot: false,
    color: '#fff', trail: 10, projectileSize: 2
  });
  updateBullets(0.016);
  return { before, after: victim.headHp };
};
let probe = shotOffsetFromHead(0.5);
assert('a shot 0.50r from head centre still counts as a headshot', probe.after === probe.before - 1);
victim.headHp = 3;
probe = shotOffsetFromHead(0.6);
assert('a shot 0.60r out now misses the head (was a hit at 0.62r)', probe.after === probe.before);
victim.headHp = 3;
victim.hp = 180;

// Derived from the table, so retuning hard cannot silently invalidate this.
const needed = headShots(types.shambler, 'hard');
for (let i = 1; i < needed; i++) {
  headshotAt();
  assert(`hard: headshot ${i} of ${needed} wounds but does not kill`,
    stateModule.state.zombies.length === 1 && victim.headHp === needed - i);
}
headshotAt();
assert(`hard: headshot ${needed} kills`, stateModule.state.zombies.length === 0);

/* Loadout moves: a non-Pistol weapon lives in exactly one place, so dropping it
   somewhere new must vacate the old spot with no manual reassignment. */
const loadout = await import('../src/game/loadout.js');
const st = stateModule.state;
st.armory = ['pistol', 'smg', 'ar'];
st.weapons = ['pistol', null];
st.survivorLoadout = {};
st.survivors = [{ id: 'mechanic', name: 'Mechanic Mae' }, { id: 'nurse', name: 'Nurse Nia' }];

loadout.moveWeapon('smg', { kind: 'player', slot: 1 });
assert('drop onto a player slot equips it', st.weapons[1] === 'smg');

loadout.moveWeapon('smg', { kind: 'survivor', id: 'mechanic' });
assert('handing a carried weapon to a survivor frees the player slot',
  st.survivorLoadout.mechanic === 'smg' && st.weapons[1] === null);

loadout.moveWeapon('smg', { kind: 'survivor', id: 'nurse' });
assert('moving between survivors leaves only one holder',
  st.survivorLoadout.nurse === 'smg' && st.survivorLoadout.mechanic === undefined);

loadout.moveWeapon('smg', { kind: 'player', slot: 0 });
assert('taking a survivor weapon back clears them',
  st.weapons[0] === 'smg' && st.survivorLoadout.nurse === undefined);
assert('holderOf reports the player slot', loadout.holderOf('smg').slot === 0);

loadout.moveWeapon('smg', { kind: 'pool' });
assert('dropping on the rack unassigns entirely', loadout.holderOf('smg').kind === 'pool');
assert('slot 0 never ends up empty', !!st.weapons[0]);

// The Pistol is standard issue: many hands may hold one at once.
loadout.moveWeapon('pistol', { kind: 'survivor', id: 'mechanic' });
loadout.moveWeapon('pistol', { kind: 'player', slot: 0 });
assert('the Pistol is exempt from exclusivity',
  st.weapons[0] === 'pistol' && st.survivorLoadout.mechanic === 'pistol');

/* Survivor fire rate: the handicap must scale with the weapon, so a fast weapon
   stays fast in their hands. Sampled, since the gap carries jitter. */
const { createBots, updateBots } = await import('../src/systems/bots.js');
const shotsPerSecond = (weaponId) => {
  st.survivors = [{ id: 'mechanic', name: 'Mechanic Mae' }];
  st.survivorLoadout = { mechanic: weaponId };
  st.bots = createBots();
  st.zombies = [{ x: 700, y: 500, r: 25, hp: 999, maxHp: 999, headHp: 99, color: '#8cab6a', attackCd: 0, bob: 0 }];
  st.bullets.length = 0;
  st.bots[0].shotCd = 0;
  let shots = 0;
  for (let i = 0; i < 625; i++) { // 10 seconds
    const before = st.bullets.length;
    updateBots(0.016);
    if (st.bullets.length > before) shots++;
    st.bullets.length = 0;
  }
  return shots / 10;
};
const smgRate = shotsPerSecond('smg');
const pistolRate = shotsPerSecond('pistol');
/* Sustained rates, so reload downtime is included: an SMG burns 30 rounds in
   ~3.6s then reloads 2s. Burst rate is ~8/s; sustained lands near 6/s, against
   ~2.5/s before the handicap became multiplicative. */
assert(`survivor SMG sustains a fast rate (${smgRate.toFixed(1)}/s, was ~2.5/s)`, smgRate > 5);
assert('survivor SMG clearly outpaces their Pistol', smgRate > pistolRate * 2.5);

/* Survivor mortality. The roster loss has to survive the night, so these assert
   on state.survivors and not just on the per-night bot. */
const bots = await import('../src/systems/bots.js');
const { BOT_VITALS } = await import('../src/data/survivors.js');
st.survivors = [{ id: 'mechanic', name: 'Mechanic Mae' }, { id: 'nurse', name: 'Nurse Nia' }];
st.survivorLoadout = {};
st.zombies = [];
st.bots = bots.createBots();
const mae = st.bots[0];

bots.hurtBot(mae, 10);
assert('a survivor takes damage without going down', !mae.downed && mae.hp === BOT_VITALS.hp - 10);
assert('hurt survivors are still counted as live', bots.liveBots().length === 2);

bots.hurtBot(mae, BOT_VITALS.hp);
assert('enough damage downs a survivor', mae.downed && mae.bleed > 0);
assert('a downed survivor stops shooting', bots.liveBots().length === 1);

// Standing over them revives; they come back hurt.
Object.assign(st.player, { x: mae.x, y: mae.y });
bots.updateBots(BOT_VITALS.reviveTime + 0.1);
assert('standing with a downed survivor revives them', !mae.downed && mae.hp > 0 && mae.hp < BOT_VITALS.hp);

// Bleeding out with nobody nearby loses them from the run for good.
bots.hurtBot(mae, BOT_VITALS.hp * 2);
Object.assign(st.player, { x: 90, y: 620 });
bots.updateBots(BOT_VITALS.bleedOut + 0.1);
assert('bleeding out removes the survivor from the roster',
  st.survivors.length === 1 && st.survivors[0].id === 'nurse');
assert('the lost survivor leaves the bot line', st.bots.every((b) => b.survivor.id !== 'mechanic'));

/* Pouncer: leaps the barricade and pins a survivor, who then cannot fight back. */
const zombiesSystem = await import('../src/systems/zombies.js');
st.survivors = [{ id: 'nurse', name: 'Nurse Nia' }];
st.bots = bots.createBots();
const nia = st.bots[0];
st.zombies = [{
  ...types.pouncer, type: 'pouncer', r: 24, x: 690, y: nia.y,
  maxHp: 130, hp: 130, boss: false, headHp: 1, attackCd: 0, bob: 0
}];
const pouncer = st.zombies[0];
st.barricade = st.maxBarr;
for (let i = 0; i < 80 && !pouncer.pinnedBot; i++) zombiesSystem.updateZombies(0.016, true);
assert('a pouncer crosses the barricade and pins a survivor',
  pouncer.pinnedBot === nia && nia.pinnedBy === pouncer);
const pinnedHp = nia.hp;
zombiesSystem.updateZombies(0.5, true);
assert('a pinned survivor is being mauled', nia.hp < pinnedHp);
bots.updateBots(2);
assert('a pinned survivor cannot shoot', st.bullets.length === 0);
zombiesSystem.killZombie(pouncer, false, true);
assert('killing the pouncer frees the survivor', !nia.pinnedBy);

/* Bloater: the burst only harms your own side, so killing it at the line is the
   mistake and killing it at range costs nothing. */
st.bots = bots.createBots();
const nearBot = st.bots[0];
st.zones.length = 0;
st.zombies = [{
  ...types.bloater, type: 'bloater', r: 32, x: nearBot.x + 40, y: nearBot.y,
  maxHp: 260, hp: 260, boss: false, headHp: 1, attackCd: 0, bob: 0
}];
zombiesSystem.killZombie(st.zombies[0], false, true);
assert('a bloater bursting nearby hurts the survivor line', nearBot.hp < BOT_VITALS.hp);
assert('a bloater leaves a bile zone', st.zones.some((z) => z.kind === 'bile'));

st.bots = bots.createBots();
const farBot = st.bots[0];
st.zombies = [{
  ...types.bloater, type: 'bloater', r: 32, x: farBot.x + 600, y: farBot.y,
  maxHp: 260, hp: 260, boss: false, headHp: 1, attackCd: 0, bob: 0
}];
zombiesSystem.killZombie(st.zombies[0], false, true);
assert('a bloater killed at range costs nothing', farBot.hp === BOT_VITALS.hp);

// The new types are held back to the late nights.
assert('pouncer and bloater unlock late',
  types.pouncer.unlockNight >= 9 && types.bloater.unlockNight >= 11);

/* Explosives: blast damage falls off with distance and never touches your side. */
const { throwOrdnance, updateThrowables } = await import('../src/systems/throwables.js');
const { weapons: allWeapons } = await import('../src/data/weapons.js');
st.zones.length = 0;
st.throwables.length = 0;
st.bots = bots.createBots();
const bystander = st.bots[0];
Object.assign(st.player, { x: 300, y: 500, hp: 100 });
const nearZ = { ...types.shambler, type: 'shambler', r: 25, x: 300, y: 500, maxHp: 100, hp: 100, boss: false, headHp: 1, attackCd: 0, bob: 0 };
const farZ = { ...types.shambler, type: 'shambler', r: 25, x: 1100, y: 500, maxHp: 100, hp: 100, boss: false, headHp: 1, attackCd: 0, bob: 0 };
st.zombies = [nearZ, farZ];
throwOrdnance(200, 500, 300, 500, allWeapons.launcher);
for (let i = 0; i < 60 && st.throwables.length; i++) updateThrowables(0.016);
assert('a grenade detonates on arrival', st.throwables.length === 0);
assert('the blast kills what it lands on', !st.zombies.includes(nearZ));
assert('the blast spares zombies outside its radius', farZ.hp === 100);
assert('no friendly fire: the player is untouched', st.player.hp === 100);
assert('no friendly fire: survivors are untouched', bystander.hp === BOT_VITALS.hp);

// Molotov leaves a fire zone, and fire burns zombies rather than survivors.
st.throwables.length = 0;
throwOrdnance(200, 500, 640, 500, allWeapons.molotov);
for (let i = 0; i < 90 && st.throwables.length; i++) updateThrowables(0.016);
const fire = st.zones.find((z) => z.kind === 'fire');
assert('a molotov leaves a fire zone', !!fire && fire.harms === 'zombies');

const { updateZones } = await import('../src/systems/zones.js');
const burning = { ...types.shambler, type: 'shambler', r: 25, x: fire.x, y: fire.y, maxHp: 400, hp: 400, boss: false, headHp: 1, attackCd: 0, bob: 0 };
st.zombies = [burning];
Object.assign(st.player, { x: fire.x, y: fire.y, hp: 100 });
updateZones(0.5);
assert('fire burns zombies standing in it', burning.hp < 400);
assert('fire does not burn the player', st.player.hp === 100);

/* Barricade fortifications: contact damage at the line, and only while it stands. */
const { fortificationDps, fortifications } = await import('../src/data/fortifications.js');
const { buyFortification } = loadout;
assert('bare boards do no contact damage', fortificationDps(0) === 0);
assert('each tier hurts more than the last',
  fortifications.every((f, i) => i === 0 || f.dps > fortifications[i - 1].dps));

st.cash = 0;
st.fortification = 0;
assert('a fortification cannot be bought without cash', !buyFortification());
st.cash = 10000;
assert('buying advances the tier', buyFortification() && st.fortification === 1);
const spentTo = st.cash;
while (buyFortification()); // exhaust the tiers
assert('tiers run out at the top', st.fortification === fortifications.length && st.cash < spentTo);

// A zombie chewing a fortified barricade bleeds without the player firing a shot.
st.fortification = 3;
st.barricade = st.maxBarr;
st.bots = [];
st.zombies = [{
  ...types.shambler, type: 'shambler', r: 25, x: 612, y: 500,
  maxHp: 400, hp: 400, boss: false, headHp: 1, attackCd: 0, bob: 0
}];
const chewer = st.zombies[0];
zombiesSystem.updateZombies(0.4, false);
assert('fortifications damage whatever reaches the line', chewer.hp < 400);

st.fortification = 0;
chewer.hp = 400;
zombiesSystem.updateZombies(0.4, false);
assert('no fortification means no contact damage', chewer.hp === 400);

/* Audio must degrade to a no-op where there is no AudioContext (this harness,
   and any browser that blocks it), and every recipe must be well formed. */
const audio = await import('../src/core/audio.js');
const music = await import('../src/core/music.js');
const { SFX: cues } = await import('../src/core/sfx.js');
const { WEAPON_SOUNDS, SOUNDS: allSounds } = await import('../src/data/sounds.js');
const { weapons: roster } = await import('../src/data/weapons.js');

assert('audio reports itself unavailable without an AudioContext', !audio.audioAvailable());
let audioThrew = false;
try {
  cues.shot('lmg', 400);
  cues.kill(true, 300);
  cues.groan(900);
  cues.explosion(500);
  cues.barricadeBreak();
  audio.playSound(WEAPON_SOUNDS.pistol, { pan: 0.5 });
  music.playMusic('night');
  music.stopMusic();
} catch {
  audioThrew = true;
}
assert('cues are silent no-ops when audio is unavailable', !audioThrew);

assert('every weapon has its own fire sound',
  Object.keys(roster).every((id) => !!WEAPON_SOUNDS[id]));
assert('no two weapons share a sound recipe',
  new Set(Object.values(WEAPON_SOUNDS).map((s) => JSON.stringify(s))).size === Object.keys(WEAPON_SOUNDS).length);

const everyRecipe = [...Object.values(WEAPON_SOUNDS), ...Object.values(allSounds)];
assert('every recipe has at least one layer', everyRecipe.every((s) => s.layers && s.layers.length));
assert('every layer is a noise or oscillator source',
  everyRecipe.every((s) => s.layers.every((l) => l.src === 'noise' || l.src === 'osc')));
assert('every layer decays in finite time',
  everyRecipe.every((s) => s.layers.every((l) => (l.decay ?? 0.12) > 0 && (l.decay ?? 0.12) < 3)));

console.log(failures ? `\n${failures} failing` : '\nall passing');
process.exit(failures ? 1 : 0);
