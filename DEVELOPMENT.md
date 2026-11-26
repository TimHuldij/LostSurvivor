# Development status

Source code is authoritative. This snapshot was audited on 2026-11-26. Task statuses reflect the present prototype, not a claim of a finished game.

## COMPLETED — playable yard and core controls

- Files: `src/main.js`, `src/world.js`, `src/landscape.js`, `src/player.js`, `src/third-person-camera.js`, `index.html`, `styles.css`.
- State: procedural yard, three relay objectives, first- and third-person movement, camera switching, jump, sprint, pause, restart, and F2 debug HUD exist.
- Remaining work: extend only as requested. Validation: exercise normal entry, movement, relay completion, both cameras, pause and restart in a browser.
- Known limitation: collision uses custom axis-aligned boxes and a fixed 1/120-second simulation step, rather than a rigid-body engine. Third-person camera retracts near solids. Camera and rendered character height are smoothed.

## COMPLETED — invisible-hand Glock prototype

- Files: `src/inventory.js`, `src/pistol.js`, `src/pistol-model.js`, `src/pistol-audio.js`, `src/main.js`.
- State: holster/equip, ammunition, continuous fire, aim, recoil, reload, inspect, procedural gun model, and synthesized audio exist. First-person meshes contain no visible hands.
- Remaining work: expand hit effects and combat beyond the basic NPC hitscan damage. Validation: verify firing, reload, inspect, switching, aiming and pause in browser after changes.

## COMPLETED — single-press door interaction

- Files: `src/door.js`, `src/world.js`, `src/main.js`, `tests/doors.test.js`.
- State: E toggles a targeted door; workshop and storehouse doors have hinge rotation, latches, locks, handles, motion and obstruction checks. Door collision boxes also affect player movement and third-person camera.
- Remaining work: integrate actual positional sound assets if requested. Known limitation: door sound is callback-only and collision uses approximate boxes. Manual hold-and-drag was removed at the user's request.
- Validation: `node --test tests/doors.test.js`. The 13 tests passed on 2026-11-26. Browser interaction was verified in an earlier task; repeat after relevant changes.

## COMPLETED — optional model loading

- Files: `models/model-config.js`, `src/models.js`, `src/player.js`.
- State: player and prop glTF/GLB imports, optional animations, and solid prop boxes are supported. The config has no models selected.
- Remaining work: add user assets only when supplied. Known limitation: imported player item attachment requires an `ItemSocket`; compressed assets need additional decoder setup.
- Validation: test actual supplied assets, animation names, transforms and collision in browser.

## NEEDS TESTING — wider runtime coverage

- Files: all gameplay modules.
- State: door unit tests exist; other behaviors lack a persistent automated suite. No full browser regression was performed during this documentation update.
- Remaining work: when gameplay changes, verify FPS, pointer-lock fallback, camera, relay interaction, equipment, doors, loading and restart on the affected paths.
- Known issues: no newly confirmed defects in this audit. Absence of a reported bug does not establish correctness.

## IN PROGRESS — NPC perception and combat

- Files: `src/navigation.js`, `src/npc.js`, `src/hitscan.js`, `src/player.js`, `src/main.js`, `index.html`, `styles.css`.
- State: the static ground-level grid supports dynamic door obstacles and NPCs can open and cross unlocked doors. A neutral survivor investigates gunfire and becomes hostile when shot; a rifle-carrying hostile patrols, detects the player within a configurable forward cone and range, pursues, and fires cadence-limited hitscan attacks. World and door collision boxes block sight and shots. The player has a world-space hitbox, 100 health, a health meter, and a down/restart flow.
- Remaining work: verify combat and damage in interactive gameplay; add cover and more varied NPC states/animations; ensure NPC collision with door swings; add elevated navigation and performance scheduling. The navigation grid remains ground-level.
- Validation: `node --test tests/*.test.js` passes 28 tests, including hostile sight, occlusion, attack cadence, neutral-to-hostile behavior, player health and hitboxes. Syntax checks pass. Browser smoke test opened the game, entered play, and confirmed the visible health meter at 100; full combat and death flow have not been verified interactively.

## PLANNED — major world update

- Files: future work across weapon, inventory, interactions, world, audio and rendering modules.
- State: the user requested an AK-47, reserves and pickups, interactive containers, a larger connected world with interiors, more detailed art, audio and optimization. The rifle and rifle ammunition boxes have an initial implementation; the remaining requested systems are not yet implemented.
- Remaining work: implement phases 3–8 after the NPC foundation. Do not mark partial work complete without validating normal gameplay paths.
- Validation: test weapon states, ammunition limits, NPC combat and navigation, door regressions, world accessibility, interactions, visual quality and performance.

## Technical decisions and debt

Three.js 0.183.2 is the sole runtime dependency. `serve.mjs` serves the repository on loopback port 8080. The browser resolves Three.js through the import map in `index.html`. There is no build pipeline, lint script, or persistence layer. `src/main.js` coordinates input and fixed-step simulation. Renderer frame delta is capped, so prolonged stalls do not simulate all elapsed real time. The world, models, textures and pistol sound are generated at runtime. Door audio has hooks only. The project has limited automated coverage outside doors.

### Checkpoint — NPC perception, combat and doors

- Files: `src/npc.js`, `src/navigation.js`, `src/hitscan.js`, `src/player.js`, `src/main.js`, `index.html`, `styles.css`, `tests/npc.test.js`, `tests/player.test.js`.
- Status: initial hostile AI and player health are implemented and covered by tests. A survivor can investigate audible gunfire, navigate around dynamic door obstacles, open unlocked doors, and return to patrol. Hostile NPCs have configurable sight range/cone and weapon cadence, pursue the player, and make blocked hitscan attacks. Shooting the neutral NPC turns it hostile. Restart resets health, hostility, and patrol.
- Remaining: browser-play combat and down/restart, cover, door-swing/NPC body collision, elevated navigation and richer combat animations/audio. Locked doors can still block a ground-level route until another path is found.
- Validation: 28 tests pass; browser smoke confirmed entry and health HUD. End-to-end combat remains unverified in a live play session.


## IN PROGRESS — AK-47 and ammunition boxes

- Files: `src/rifle-model.js`, `src/pistol.js`, `src/inventory.js`, `src/pickups.js`, `src/main.js`, `index.html`, `tests/pickups.test.js`.
- State: slot 3 has a procedural rifle, automatic/single toggle (B), 30-round magazine, 90 initial reserve, reload and inspect using the shared handless pistol animation framework. Boxes transfer rifle ammunition with a 180-round reserve cap, retain leftovers and reset on restart. The Glock retains its existing unlimited reload behavior.
- Remaining: proper rifle-specific reload/inspect and sounds, empty reload, shell ejection, impacts, richer hit effects, NPC weapon sharing, additional resource types, and broader interaction integration. The current rifle uses Glock pose curves, sound and flash and is not a finished AK implementation. No NPC combat exists.
- Validation: 19 automated door, NPC and pickup tests pass. Headless Edge launched the game, selected the rifle, fired once, and selected the Glock without page errors. Direct browser module exercise confirmed rifle reload transfers reserve and switching cancels reload without losing ammunition. The software-rendered gameplay smoke test was too slow to establish normal timing; inspect, automatic/single modes, pickups in-world, doors, movement and visual quality still require interactive playtesting.

- Basic hitscan: `src/main.js` checks shots against world/door boxes and NPC bounds; `src/npc.js` tracks health and falls on death, resetting on restart. This is not complete combat or a physical death animation. The new damage path has unit coverage for health but has not been verified end-to-end in a browser.
