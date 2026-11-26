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
- Remaining work: gameplay effects such as hit detection and damage are absent. Validation: verify firing, reload, inspect, switching, aiming and pause in browser after changes.

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

## PLANNED — user-directed work

- Files: determined by future requests.
- State: no further feature has been approved as the next task. Potential directions are listed as ideas in GAME_DESIGN.md.
- Remaining work: wait for or follow the latest user request. Validation depends on that request.

## IN PROGRESS and BLOCKED

No gameplay task is currently recorded as in progress or blocked.

## Technical decisions and debt

Three.js 0.183.2 is the sole runtime dependency. `serve.mjs` serves the repository on loopback port 8080. The browser resolves Three.js through the import map in `index.html`. There is no build pipeline, lint script, or persistence layer. `src/main.js` coordinates input and fixed-step simulation. Renderer frame delta is capped, so prolonged stalls do not simulate all elapsed real time. The world, models, textures and pistol sound are generated at runtime. Door audio has hooks only. The project has limited automated coverage outside doors.
