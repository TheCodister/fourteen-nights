/* The single mutable run state.
   `state` is a live binding: modules `import { state }` and always see the
   object installed by the most recent setState(). Nothing else in the codebase
   should hold a long-lived reference to a state object. */
import { PLAYER_MAX_HP } from '../config.js';
import { STARTING_WEAPON } from '../data/weapons.js';
import { DEFAULT_DIFFICULTY, difficulties } from '../data/difficulty.js';
import { loadScrap, loadUpgrades, loadDifficulty, saveProfile } from './storage.js';

/** @typedef {'title'|'playing'|'paused'|'between'|'gameover'|'victory'} Scene */

export let state = createState();

export function setState(next) {
  state = next;
}

/** A fresh run with the persisted profile (scrap + upgrade ranks) folded in. */
export function createState() {
  return {
    scene: /** @type {Scene} */ ('title'),
    night: 1,
    cash: 0,
    scrap: loadScrap(),
    upgrades: loadUpgrades(),
    /** Difficulty id; scales zombie hp/headHp and the cash/Scrap payout. */
    difficulty: difficulties[loadDifficulty()] ? loadDifficulty() : DEFAULT_DIFFICULTY,

    /** `step`/`moving` drive the renderer's walk cycle; set in systems/player.js. */
    player: { x: 270, y: 445, hp: PLAYER_MAX_HP, step: 0, moving: false },
    barricade: 100,
    maxBarr: 100,
    /** Barricade fortification tier; 0 is bare boards. See data/fortifications.js. */
    fortification: 0,

    armory: [STARTING_WEAPON],
    weapons: [STARTING_WEAPON, null],
    selected: 0,
    ammo: { [STARTING_WEAPON]: 12 },
    reload: 0,
    /** Duration the current reload started with, so the HUD can draw progress. */
    reloadTotal: 0,
    fireCd: 0,
    instantReload: true,

    /** Consecutive player headshot kills, and the best streak this run. */
    streak: 0,
    streakBest: 0,

    survivors: [],
    survivorLoadout: {},
    bots: [],

    zombies: [],
    bullets: [],
    particles: [],
    /** Blood stains on the ground; they outlive the droplets that made them. */
    decals: [],
    acid: [],
    /** Damaging ground patches: acid, bile, fire. See systems/zones.js. */
    zones: [],
    /** In-flight explosive ordnance. */
    throwables: [],

    elapsed: 0,
    spawnClock: 1,
    killed: 0,
    shake: 0,
    /** 0..1 pulse raised whenever the barricade is bitten; drives the vignette. */
    barrFlash: 0,
    bossSpawned: false,
    bossKilled: false,
    nightIntro: 0
  };
}

export function saveProgress() {
  saveProfile({ scrap: state.scrap, upgrades: state.upgrades });
}
