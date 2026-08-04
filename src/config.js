/* Tunable constants shared by simulation and renderer. */
export const W = 1280;
export const H = 720;

export const ACTOR_SCALE = 1.25;
export const PLAYER_HIT_RADIUS = 26;

/** Seconds of horde per night. */
export const NIGHT_LENGTH = 90;
/** Hours the player allocates between repairing and searching each dawn. */
export const DAWN_HOURS = 12;
export const FINAL_NIGHT = 14;
export const MAX_SURVIVORS = 6;
export const PLAYER_MAX_HP = 100;

/** The yard the player may walk inside of. */
export const PLAYER_BOUNDS = { minX: 55, maxX: 535, minY: 350, maxY: 647 };
/** X of the barricade line zombies push against. */
export const BARRICADE_X = 610;
/** Spitters stop and lob acid once they get this close. */
export const SPITTER_RANGE_X = 760;

export const SPAWN_ZONE = { x: 1325, xJitter: 60, y: 355, yJitter: 275 };
