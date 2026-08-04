/* localStorage persistence. Every read is guarded: a corrupt or blocked store
   degrades to a fresh profile instead of throwing during boot. */
const KEY_SCRAP = 'fn_scrap';
const KEY_UPGRADES = 'fn_upgrades';

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

export function saveProfile({ scrap, upgrades }) {
  write(KEY_SCRAP, String(scrap));
  write(KEY_UPGRADES, JSON.stringify(upgrades));
}
