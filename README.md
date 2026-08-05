# Fourteen Nights

A browser-based, side-view zombie survival shooter. Hold the barricade for fourteen nights, build an armory, recruit imperfect survivors, and stay alive until rescue arrives.

## Play

The game is loaded as ES modules, so it must be served over HTTP — opening `index.html` from the filesystem will be blocked by the browser. There is still no build step and no dependencies:

```bash
npm run dev     # python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

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

Weapons have infinite reserve ammunition but finite magazines. Reloading starts automatically when a magazine is empty, and a bar above the weapon slots shows how much of it is left.

## Reading the HUD

- Both carried weapons stay on screen with their magazines. The idle slot is dimmed; a magazine at or below a quarter turns red.
- **KILLS** and **HORDE** track your run total and how many zombies are alive right now.
- Consecutive headshots build a cash multiplier, shown as a gold badge under the clock once you reach three.
- Every bite on the barricade shakes the screen and pulses a red frame. The frame stays lit while the barricade is under 40%, and turns hard red once it is gone.

## Combat

- Zombies arrive from the right and attack the barricade first.
- A Pistol body shot deals 20 damage. On Easy a basic 100-health zombie needs **five body shots**, and headshots kill regular zombies instantly — see the difficulty table below for the other tiers.
- The head hit zone is a circle of **0.55×** the zombie's body radius, sitting above the body centre. It is still slightly larger than the drawn head, so a shot that visibly connects always registers — but it is tighter than it used to be, and clipping the edge of the skull no longer counts.
- Each of your own headshots adds **+5% cash**, up to **×2.00**. One of your body-shot kills drops the streak to zero; survivor kills never affect it. The streak resets at the start of every night.
- Spitters lob acid at where you were standing, marked by a ring that closes on the landing spot. Whatever a spit hits leaves a puddle that costs **14 health per second** while you stand in it, so the safe yard shrinks as they work it over.
- If the barricade breaks, the night is not automatically lost. Kite the zombies inside the protected zone—but if one reaches you, the run ends.
- At 90 seconds, new zombies stop spawning; the night ends only after the remaining horde is destroyed. Waves become faster and arrive in larger groups as nights advance.
- Night 7 introduces **The Foreman**; Night 14 ends with **The Passenger** boss and the rescue sequence.

## Difficulty

Four tiers, chosen on the title screen and remembered between runs. Easy is the default.

Difficulty shifts the **ratio** between body shots and headshots rather than simply inflating health. As it rises, more headshots are required, while bigger zombies actually take *fewer* body shots — precision becomes the answer, and spraying stays viable but slow.

Counts below are Pistol shots (20 damage, 15 through armour):

| | Easy | Normal | Hard | Nightmare |
| --- | --- | --- | --- | --- |
| Shambler | 5 body / 1 headshot | 7 body / 2 headshots | 9 body / 3 headshots | 9 body / 3 headshots |
| Tough (armoured) | 12 body / 2 headshots | 10 body / 3 headshots | 8 body / 4 headshots | 8 body / 4 headshots |
| The Foreman | 8 headshots | 10 headshots | 12 headshots | 12 headshots |
| The Passenger | 10 headshots | 13 headshots | 16 headshots | 16 headshots |
| Cash and Scrap | ×1 | ×1.2 | ×1.5 | ×1.5 |
| Horde size | — | — | — | +1 per wave and a 25% faster spawn clock, from night 2 |

**Nightmare is Hard's durability with far more bodies.** Night one is identical to Hard; from night two the extra wave size and tighter cadence land between 59% and 168% more zombies per night. The two tiers share one `HARD_DURABILITY` object in the data file, so they cannot drift apart when either is retuned.

Health is scaled by multiplier, not rewritten per type, so the roster keeps its shape — a runner stays faster and frailer than a spitter at every tier.

**Payouts did not move when the ladder shifted up.** Tier one still pays ×1, tier two ×1.2, tier three ×1.5 — the same cash and Scrap as before, for now-tougher zombies. Nightmare shares Hard's payout as well as its durability, since its extra bodies already mean more kills per night.

Wave pacing and barricade damage are identical across Easy, Normal and Hard; only Nightmare touches them.

Tune it all in `src/data/difficulty.js`; `npm test` asserts every number in the table above, that Nightmare's durability matches Hard exactly, and that its horde boost starts on night two.

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
- An assigned weapon supplies that survivor's own damage, fire rate, projectile speed, pellets/spread, piercing, and on-screen gun design.
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

## Project layout

```
index.html            game shell and HUD markup
style.css             interface and responsive layout
src/
  main.js             entry point: binds input + UI, starts the loop
  config.js           arena dimensions, night length, world bounds
  data/               balance tables — weapons, zombies, survivors, upgrades
  core/               state, persistence, events, input, audio, frame loop
  systems/            per-frame simulation: combat, bullets, zombies, bots, acid + puddles, particles
  game/               orchestration: run, night, dawn, loadout
  render/             canvas drawing: environment, actors, weapon sprites, scene
                      (actors.js pins zombie head/body art to the hit zones in
                       systems/bullets.js — moving one means moving the other)
  ui/                 DOM — HUD and overlay screens
tests/smoke.mjs       headless end-to-end test (no browser needed)
```

Layer rule, enforced by convention: `config`/`data` import nothing, `core` imports data, `systems` and `game` read and mutate state, `render` and `ui` read state. **Nothing in `game/` or `systems/` imports from `render/` or `ui/`** — the simulation talks to the interface only by emitting events from `core/events.js`.

### Where to make a change

| Change | File |
| --- | --- |
| Add or rebalance a weapon | `src/data/weapons.js` (+ a sprite in `src/render/weaponSprites.js`) |
| Add a zombie type or boss | `src/data/zombies.js` |
| Add a survivor or perk | `src/data/survivors.js` (perk is read where `appliedIn` says) |
| Add a permanent upgrade | `src/data/upgrades.js` |
| Retune a difficulty or add a tier | `src/data/difficulty.js` |
| Rebalance scrap or the headshot streak payout | `src/data/upgrades.js` (`SCRAP`, `STREAK`) |
| Tune acid flight, puddle damage or lifetime | `src/systems/acid.js` (`ACID`) |
| Change zombie or human proportions | `src/render/actors.js` (`Z`, `BODY`) |
| Tune blood spray, gibs or ground stains | `src/systems/particles.js` |
| Tune barricade bite feedback | `src/systems/zombies.js` (`BITE`) + `VIGNETTE` in `src/render/scene.js` |
| Change wave pacing | `src/systems/spawner.js` |
| Change night flow or endings | `src/game/night.js` |
| Add a screen | `src/ui/screens/`, wired in `src/ui/index.js` |

## Development

```bash
npm run dev      # serve on :8080
npm test         # headless smoke test in node
```

`npm test` stubs a minimal DOM and canvas, boots the real `src/main.js`, and drives real frames: spawning, firing, kills, barricade collapse, dawn planning, the armory, and the night 7 boss.
