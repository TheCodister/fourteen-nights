/* localStorage persistence. Every read is guarded: a corrupt or blocked store
   degrades to a fresh profile instead of throwing during boot. */
const KEY_SCRAP = 'fn_scrap';
const KEY_UPGRADES = 'fn_upgrades';
const KEY_DIFFICULTY = 'fn_difficulty';
const KEY_RUN = 'fn_run';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private browsing or a full quota — progress is lost, the run is not. */
  }
}

export function loadScrap() {
  const value = Number(read(KEY_SCRAP, 0));
  return Number.isFinite(value) ? value : 0;
}

export function loadUpgrades() {
  try {
    const parsed = JSON.parse(read(KEY_UPGRADES, '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Last chosen difficulty id, so the title screen reopens on your pick. */
export function loadDifficulty() {
  return read(KEY_DIFFICULTY, '');
}

export function saveDifficulty(id) {
  write(KEY_DIFFICULTY, id);
}

/* An in-progress run, so closing the tab on night twelve is recoverable.

   Only the between-nights shape is stored — never live zombies, bullets or
   particles. Serialising mid-fight entities would be far more fragile and buys
   nothing: resuming at the start of the interrupted night is both simpler and
   fairer. `v` is checked on load so an older save from a previous build is
   discarded rather than restored into a shape the code no longer expects. */
export const RUN_SAVE_VERSION = 3;

export function loadRun() {
  try {
    const parsed = JSON.parse(read(KEY_RUN, 'null'));
    if (!parsed || parsed.v !== RUN_SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRun(snapshot) {
  write(KEY_RUN, JSON.stringify({ ...snapshot, v: RUN_SAVE_VERSION }));
}

export function clearRun() {
  try {
    localStorage.removeItem(KEY_RUN);
  } catch {
    // Some stores expose only get/set; overwriting is as good as removing.
    write(KEY_RUN, 'null');
  }
}

export function saveProfile({ scrap, upgrades }) {
  write(KEY_SCRAP, String(scrap));
  write(KEY_UPGRADES, JSON.stringify(upgrades));
}
