/* Weapon catalogue. Add an entry here and it shows up in the shop, the loadout
   screens and the survivor assignment list automatically. A new `id` also needs
   a matching case in src/render/weaponSprites.js to get its own silhouette. */
export const weapons = {
  pistol: {
    name: 'PISTOL', price: 0, mag: 12, reload: 1.2, damage: 20, fire: 0.29, bulletSpeed: 1080,
    color: '#edf3f5', accent: '#7f9199', muzzle: 45, trail: 58, projectileSize: 2.2
  },
  revolver: {
    name: 'REVOLVER', price: 300, mag: 6, reload: 1.8, damage: 90, fire: 0.48, bulletSpeed: 1160, pierce: 1,
    color: '#ffcf54', accent: '#a45b31', muzzle: 42, trail: 66, projectileSize: 3
  },
  shotgun: {
    name: 'PUMP SHOTGUN', price: 650, mag: 6, reload: 2.4, damage: 28, fire: 0.72, bulletSpeed: 900,
    pellets: 8, spread: 0.22, heavy: true,
    color: '#ffcf54', accent: '#805230', muzzle: 60, trail: 38, projectileSize: 1.8
  },
  smg: {
    name: 'SMG', price: 950, mag: 30, reload: 2, damage: 24, fire: 0.085, bulletSpeed: 1060,
    color: '#c8ff58', accent: '#435b4e', muzzle: 46, trail: 48, projectileSize: 2
  },
  rifle: {
    name: 'HUNTING RIFLE', price: 1350, mag: 5, reload: 2.2, damage: 150, fire: 0.65, bulletSpeed: 1450, pierce: 3,
    color: '#a6dcff', accent: '#8b5a39', muzzle: 67, trail: 94, projectileSize: 3.2
  },
  ar: {
    name: 'ASSAULT RIFLE', price: 1800, mag: 24, reload: 2.1, damage: 58, fire: 0.16, bulletSpeed: 1190,
    color: '#ffcf54', accent: '#59665c', muzzle: 55, trail: 64, projectileSize: 2.5
  },
  lmg: {
    name: 'LIGHT MACHINE GUN', price: 2600, mag: 60, reload: 4, damage: 42, fire: 0.1, bulletSpeed: 1150,
    color: '#ff934b', accent: '#4e5553', muzzle: 61, trail: 62, projectileSize: 2.5
  },
  /* Explosive ordnance. `throwable` routes the shot through systems/throwables.js
     instead of spawning bullets: it arcs to the cursor and detonates there.
     `damage` is the peak blast damage, or damage-per-second for fire. Blasts
     never harm the player or the survivor line. */
  molotov: {
    name: 'MOLOTOV KIT', price: 1500, mag: 2, reload: 3, damage: 60, fire: 0.95, bulletSpeed: 520,
    throwable: { kind: 'fire', radius: 74 },
    color: '#ff9d4b', accent: '#6b3a22', muzzle: 38, trail: 26, projectileSize: 4
  },
  launcher: {
    name: 'GRENADE LAUNCHER', price: 2300, mag: 4, reload: 3.2, damage: 165, fire: 0.85, bulletSpeed: 620,
    throwable: { kind: 'blast', radius: 118 }, heavy: true,
    color: '#9be86a', accent: '#4b5a33', muzzle: 56, trail: 30, projectileSize: 5
  },
  buster: {
    name: 'BUNKER BUSTER', price: 3900, mag: 1, reload: 3.6, damage: 320, fire: 1.1, bulletSpeed: 700,
    throwable: { kind: 'blast', radius: 168 }, heavy: true,
    color: '#ff6b4b', accent: '#4a4038', muzzle: 64, trail: 34, projectileSize: 6
  },
  moonbeam: {
    name: 'MOONBEAM-9', price: 4500, mag: 8, reload: 2.8, damage: 180, fire: 0.46, bulletSpeed: 1150, pierce: 8,
    moon: true, rare: true,
    color: '#ff4bdf', accent: '#7a4dca', muzzle: 59, trail: 92, projectileSize: 4
  }
};

export const STARTING_WEAPON = 'pistol';
