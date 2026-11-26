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
- State: automated door, hitscan, NPC, player-health, pickup, flashlight, medical-item, melee-item and grenade suites exist. Browser playtesting verified live hostile damage, the down/restart flow, relay activation, rifle firing, medkit healing/charge rules, flashlight toggle/stow/camera switching, a knife strike followed by neutral-NPC retaliation, and grenade collection/charge decrement.
- Remaining work: verify hostile fire across a live door, in-world rifle ammo pickups, live door interaction, reload/inspect/ADS, flashlight illumination in darkness, grenade detonation after the latest fix, and full objective completion.
- Known issues: no newly confirmed defects in this audit. Absence of a reported bug does not establish correctness.

## IN PROGRESS — NPC perception and combat

- Files: `src/navigation.js`, `src/npc.js`, `src/hitscan.js`, `src/player.js`, `src/main.js`, `index.html`, `styles.css`.
- State: the static ground-level grid supports dynamic door obstacles and NPCs can open and cross unlocked doors. A neutral survivor investigates gunfire and becomes hostile when shot; a rifle-carrying hostile patrols, detects the player within a configurable forward cone and range, pursues, and fires cadence-limited hitscan attacks. World and door collision boxes block sight and shots. The player has a world-space hitbox, 100 health, a health meter, and a down/restart flow.
- Remaining work: verify hostile fire behind a live door; add cover and more varied NPC states/animations; ensure NPC collision with door swings; add elevated navigation and performance scheduling. The navigation grid remains ground-level.
- Validation: `node --test tests/*.test.js` passes 39 tests, including hostile sight, wall and real-door occlusion, attack cadence, neutral-to-hostile behavior, player health and hitboxes. Syntax checks pass. Browser playtest confirmed hostile damage/down, restart to spawn at 100 health, entry relay activation, rifle selection/fire, and flashlight slot/toggle. Live door-blocking remains unverified.

## IN PROGRESS — reusable held-item foundation, flashlight, medkit and knife

- Files: `src/equippable-item.js`, `src/flashlight.js`, `src/medical-item.js`, `src/melee-weapon.js`, `src/grenade.js`, `src/inventory.js`, `src/pickups.js`, `src/player.js`, `src/main.js`, `index.html`, and the corresponding held-item tests.
- State: a base class provides handless world/view models, configurable equip pose, movement sway, reduced-motion behavior and a blended use pose. Slot 4 toggles a camera-aligned flashlight. Slot 5 uses E-collected medical supplies; F spends a charge to restore up to 40 missing health. Full-health use doesn't consume a charge; two charges maximum. Slot 6 equips a procedural knife; F starts a blended strike, applies one 45-damage hit in a timed contact window, and checks targets within 2.4 meters through the shared world/door blocker-aware hitscan. Slot 7 equips a grenade; E collects up to two charges and F starts its timed throw, followed by a bouncing projectile, 1.8-second fuse, and 5-meter distance-falloff blast with world/door occlusion.
- Remaining work: browser-check flashlight illumination in a dim setting and verify rifle ammo pickups and door interaction under live NPC pressure. Confirm the grenade's visual detonation and live blast damage after the NPC-coordinate fix; the earlier live detonation exposed and reproduced a runtime error, now covered by a regression test. Flashlight battery drain and additional tools/items are not implemented.
- Validation: 39 tests pass, including flashlight state, reduced motion, medkit capacity, use-animation conflict prevention, healing caps, pickup limits, knife strike timing/holster cancellation, grenade pickup, throw timing, projectile collision/fuse cleanup, blast damage/occlusion, and NPC blast damage. Browser confirmed medkit pickup, healing from 92 to 100 and no charge use at full health; flashlight toggle, stow/reselect and camera switching; a knife strike followed by NPC retaliation; grenade pickup/charge decrement; and a post-fix grenade throw with no runtime error during a 10-second fuse wait. The earlier live grenade explosion errored on NPC position access; the fix is unit-tested. The player remained at full health during the post-fix throw, so visual detonation/live blast damage remain unconfirmed. Illumination in darkness, live rifle ammo pickup, and live door interaction remain unverified.

## PLANNED — major world update

- Files: future work across weapon, inventory, interactions, world, audio and rendering modules.
- State: the user requested an AK-47, reserves and pickups, interactive containers, a larger connected world with interiors, more detailed art, audio and optimization. The rifle and rifle ammunition boxes have an initial implementation; the remaining requested systems are not yet implemented.
- Remaining work: continue the partial expansion with more non-firearm equippable items, resources/interactions, connected interiors/world expansion, positional audio and performance improvements. Preserve the existing playable relay-yard loop.
- Validation: test weapon states, ammunition limits, NPC combat and navigation, door regressions, world accessibility, interactions, visual quality and performance.

## Technical decisions and debt

Three.js 0.183.2 is the sole runtime dependency. `serve.mjs` serves the repository on loopback port 8080. The browser resolves Three.js through the import map in `index.html`. There is no build pipeline, lint script, or persistence layer. `src/main.js` coordinates input and fixed-step simulation. Renderer frame delta is capped, so prolonged stalls do not simulate all elapsed real time. The world, models, textures, and synthesized sounds are generated at runtime. Door audio has hooks only. Automated coverage spans doors, hitscan, NPC, player health, pickups, and held items including grenades, but broad browser regression remains necessary.

### Checkpoint — NPC perception, combat and doors

- Files: `src/npc.js`, `src/navigation.js`, `src/hitscan.js`, `src/player.js`, `src/main.js`, `index.html`, `styles.css`, `tests/npc.test.js`, `tests/player.test.js`.
- Status: initial hostile AI and player health are implemented and covered by tests. A survivor can investigate audible gunfire, navigate around dynamic door obstacles, open unlocked doors, and return to patrol. Hostile NPCs have configurable sight range/cone and weapon cadence, pursue the player, and make blocked hitscan attacks. Shooting the neutral NPC turns it hostile. Restart resets health, hostility, and patrol.
- Remaining: verify hostile fire behind a live door, cover, door-swing/NPC body collision, elevated navigation and richer combat animations/audio. Locked doors can still block a ground-level route until another path is found.
- Validation: 35 tests pass, including a real closed Door blocking hostile sight/attacks; browser confirmed hostile damage/down, restart reset, relay activation, rifle fire, flashlight toggling, medical pickup/healing and knife combat. Live door-blocking remains unverified.


## IN PROGRESS — AK-47 and ammunition boxes

- Files: `src/rifle-model.js`, `src/pistol.js`, `src/inventory.js`, `src/pickups.js`, `src/main.js`, `index.html`, `tests/pickups.test.js`.
- State: slot 3 has a procedural rifle, automatic/single toggle (B), 30-round magazine, 90 initial reserve, reload and inspect using the shared handless pistol animation framework. Boxes transfer rifle ammunition with a 180-round reserve cap, retain leftovers and reset on restart. The Glock retains its existing unlimited reload behavior.
- Remaining: proper rifle-specific reload/inspect and sounds, empty reload, shell ejection, impacts, richer hit effects, additional resource types, and broader interaction integration. The current rifle uses Glock pose curves, sound and flash and is not a finished AK implementation.
- Validation: the current suite passes 39 tests. Browser playtesting selected and fired the rifle and viewed the flashlight with no visible hands; reload, inspect, automatic/single modes, rifle ammo pickup, door interaction, flashlight illumination, movement and visual quality still need interactive regression.

- Hitscan: `src/main.js` checks player shots against world/door boxes and NPC hitboxes. Hostile shots use the same `src/hitscan.js` resolver against the player. NPCs have health and a simple falling death pose; this is not a full physical death simulation.
