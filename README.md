# Fourteen Nights

A browser-based, side-view zombie survival shooter. Hold the barricade for fourteen nights, build an armory, recruit imperfect survivors, and stay alive until rescue arrives.

## Play

Open `index.html` in a modern desktop browser. No installation, build step, server, or account is required.

> Tip: browser local storage saves permanent Scrap upgrades between runs. Clearing site data resets that progress.

## Controls

| Control | Action |
| --- | --- |
| `W` `A` `S` `D` | Move inside the protected area |
| Mouse | Aim |
| Left click / hold | Fire your equipped weapon |
| `R` | Reload manually |
| `1` / `2` | Equip your primary or secondary weapon |
| `Esc` | Pause or resume the current night |

Weapons have infinite reserve ammunition but finite magazines. Reloading starts automatically when a magazine is empty.

## Combat

- Zombies arrive from the right and attack the barricade first.
- A Pistol body shot deals 20 damage, so a basic 100-health zombie needs **five body shots**.
- Headshots kill regular zombies instantly. Aim for the enlarged head hit zone.
- If the barricade breaks, the night is not automatically lost. Kite the zombies inside the protected zone—but if one reaches you, the run ends.
- Every night lasts 90 seconds. Waves become faster and arrive in larger groups as nights advance.
- Night 7 introduces **The Foreman**; Night 14 ends with **The Passenger** boss and the rescue sequence.

## Barricade and dawn planning

At dawn, you receive 12 hours to divide between repairs and finding survivors.

- Each hour spent repairing restores **10 barricade health**.
- Every hour assigned to searching adds to the chance of bringing back a survivor.
- The Mechanic survivor improves repair output, while the Inventor and Scavenger upgrades improve search odds.
- You can recruit up to **six** survivors.

## Survivors

Survivors stand behind the barricade and fire automatically.

- Their accuracy is intentionally imperfect: **40–60%**.
- Each starts with a Pistol and reloads after emptying its magazine.
- In the armory, choose **Survivor Weapons** to assign a spare owned weapon to a specific survivor.
- A non-Pistol weapon is exclusive: assigning it to a survivor removes it from the player loadout until reassigned.

## Armory and progression

Kill zombies to earn cash during a run. Weapons are bought once per run and retained in the armory; they are never overwritten by later purchases.

At dawn, open the armory to:

1. Buy weapons.
2. Open **Player Loadout** to assign two carried weapons.
3. Open **Survivor Weapons** to distribute spare guns to your team.

Completed nights also award permanent **Scrap**. Spend Scrap from the title screen on upgrades including barricade durability, reload speed, movement speed, headshot income, better survivor searches, and shop discounts.

## Weapon roster

| Weapon | Role |
| --- | --- |
| Pistol | Starting weapon; accurate, five body hits for a normal zombie |
| Revolver | Strong, precise shots with light piercing |
| Pump Shotgun | Close-range crowd control |
| SMG | High-rate panic weapon |
| Hunting Rifle | Long-range piercing damage |
| Assault Rifle | Reliable all-round weapon |
| Light Machine Gun | Sustained fire with a slow reload |
| Moonbeam-9 | Rare sci-fi piercing weapon |

## Project files

- `index.html` — game shell and HUD
- `style.css` — interface and responsive layout
- `app.js` — game simulation, combat, waves, armory, and progression

## Development

The game is a dependency-free static web project. To serve it locally instead of opening the file directly:

```powershell
python -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.
