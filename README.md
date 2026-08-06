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

## Sound

Everything is synthesised at runtime with Web Audio — there are no audio files, so the project keeps its no-build-step, no-dependency shape and every sound is a tunable recipe rather than a fixed clip.

- **Every weapon has its own voice.** Gunfire is built from a low sine sweep for the body thump, a filtered noise burst for the crack, and decay length for the size of the room. Those three knobs are what separate the hollow *thoomp* of a Grenade Launcher (spectral centroid ~750 Hz) from the sharp crack of a Hunting Rifle (~8.7 kHz) or the pure whoosh of a Molotov (~12 kHz).
- **The horde is audible before it is visible.** Zombies groan at random, panned to where they stand, and the gap between groans shortens as the horde grows. Bites, deaths, headshots, a Pouncer's screech and a Bloater's burst all have their own cues.
- **A procedural score**, not a loop file: a 16-step sequencer in D minor over a Dm–Bb–F–C progression. The menu mood is slow and hollow; nights add a driving kick, hats and an arpeggio.
- **Two toggles** in the top bar, for sound effects and music separately.

Browsers only allow audio to start inside a user gesture, so the graph is built on your first click. Sound and music both default to on; `SOUND: N/A` means the browser exposes no AudioContext at all.

Tune fire sounds and cues in `src/data/sounds.js`, the score in `src/core/music.js`, and the engine in `src/core/audio.js`.

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
- Spitters lob acid at where you were standing, marked by a ring that closes on the landing spot. Whatever a spit hits leaves a pool that burns **you and your survivors** at 14 health per second, so the safe yard shrinks as they work it over.
- If the barricade breaks, the night is not automatically lost. Kite the zombies inside the protected zone—but if one reaches you, the run ends.
- At 90 seconds, new zombies stop spawning; the night ends only after the remaining horde is destroyed. Waves become faster and arrive in larger groups as nights advance.
- Night 7 introduces **The Foreman**; Night 14 ends with **The Passenger** boss and the rescue sequence.
- Two late types hunt your survivors rather than the barricade. The **Pouncer** (night 9+) leaps the line and pins a survivor until you shoot it off. The **Bloater** (night 11+) bursts on death, hurting only your own side — kill it at the barricade and the blast catches your front row, kill it at range and it costs nothing.

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

## Barricade fortifications

Bought with in-run cash from the shop, so late-run money has somewhere to go once the rack is full. Each tier replaces the last and damages anything chewing on the line — continuously, whether you are reloading, reviving or across the yard. It stops working the moment the barricade falls.

| Tier | Price | Contact damage |
| --- | --- | --- |
| Barbed Wire | $450 | 9 / sec |
| Spike Strip | $900 | 21 / sec |
| Electric Fence | $1800 | 44 / sec |

Each tier is visible on the barricade, so the upgrade is something you can watch working.

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
- An assigned weapon supplies that survivor's own damage, fire rate, projectile speed, pellets/spread, piercing, and on-screen gun design.
- They are slower on the trigger than you are, but only by a **fixed multiple of the weapon's own fire rate** (~1.4×). Hand a survivor an SMG and it still rips. The handicap used to include a flat delay per shot, which cost an SMG 3.9× its rate while a shotgun lost 1.7× — automatics felt broken in survivor hands.
- A non-Pistol weapon is exclusive: only one holder on the whole team, player included. The Pistol is standard issue and exempt.

### Survivors can die

They are no longer scenery. Acid, Bloater bile and a Pouncer's teeth all hurt them.

- At zero health a survivor is **downed**, not dead — they stop shooting and start bleeding out.
- **Walk into them** and hold position to revive; they get back up on half health.
- Let the bleed-out ring empty and they are **gone from the run permanently**, which is what finally makes dawn's search allocation a real decision.
- A survivor pinned by a Pouncer cannot fight back until you shoot it off them.

## Armory and progression

Kill zombies to earn cash during a run. Weapons are bought once per run and retained in the armory; they are never overwritten by later purchases.

At dawn, open the armory to:

1. Buy weapons in the shop.
2. Open **Arrange Loadout** for the board.

The board shows every owned weapon in exactly one place: **the rack**, one of **your two slots**, or a **survivor's hands**. Drag a weapon where you want it and the old spot empties itself — taking a gun back off a survivor, or handing one over, needs no second step.

Drag-and-drop does not fire on touch devices, so every drag has a tap equivalent: **tap a weapon to pick it up, then tap a destination**. The `×` on a filled slot returns that weapon to the rack, and your primary slot always holds something.

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
| Molotov Kit | Lobbed fire pool; burns everything standing in it |
| Grenade Launcher | Arcing blast, four rounds, crowd answer |
| Bunker Buster | One rocket, huge blast, long reload |

Explosives are **aimed at the ground, not along a ray** — the shot arcs to wherever the cursor is and detonates there, with a ring showing the landing spot on the way in. Blast damage falls off to the edge and **never harms the player or the survivor line**; the only explosion that hurts your side is the Bloater's.

## Project layout

```
index.html            game shell and HUD markup
style.css             interface and responsive layout
src/
  main.js             entry point: binds input + UI, starts the loop
  config.js           arena dimensions, night length, world bounds
  data/               balance tables — weapons, zombies, survivors, upgrades
  core/               state, persistence, events, input, frame loop,
                      audio engine + sfx cues + procedural score
  systems/            per-frame simulation: combat, bullets, throwables, zombies,
                      bots, acid, zones, particles
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
| Tune acid flight or spit behaviour | `src/systems/acid.js` (`ACID`) |
| Tune acid / bile / fire ground zones | `src/systems/zones.js` (`ZONE_KINDS`) |
| Tune explosives and blast falloff | `src/systems/throwables.js` |
| Retune barricade fortifications | `src/data/fortifications.js` |
| Change survivor health, bleed-out or revive | `src/data/survivors.js` (`BOT_VITALS`) |
| Tune the Pouncer or Bloater | `src/data/zombies.js` (`POUNCE`, `BLOAT`) |
| Change zombie or human proportions | `src/render/actors.js` (`Z`, `BODY`) |
| Tune blood spray, gibs or ground stains | `src/systems/particles.js` |
| Tune barricade bite feedback | `src/systems/zombies.js` (`BITE`) + `VIGNETTE` in `src/render/scene.js` |
| Change wave pacing | `src/systems/spawner.js` |
| Change night flow or endings | `src/game/night.js` |
| Add a screen | `src/ui/screens/`, wired in `src/ui/index.js` |
| Retune a weapon's sound or add a cue | `src/data/sounds.js` |
| Change the score | `src/core/music.js` (`SONGS`) |

## Development

```bash
npm run dev      # serve on :8080
npm test         # headless smoke test in node
```

`npm test` stubs a minimal DOM and canvas, boots the real `src/main.js`, and drives real frames: spawning, firing, kills, barricade collapse, dawn planning, the armory, and the night 7 boss.
