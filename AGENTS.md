# Agent instructions

Lost Survivor is a browser-based survival game prototype. The current playable slice is a forest relay yard. Favor immersive, physical, responsive interactions and retain its muted, low-poly outdoor presentation unless the user directs a change.

## Permanent development rules

- Inspect existing implementations and Git changes before editing. Reuse existing assets and systems and avoid duplicate implementations or unnecessary rewrites.
- Preserve working gameplay and controls unless the user explicitly requests a change. Do not silently remove features.
- Never introduce visible first-person hands, arms, or fingers. Maintain the invisible-hand convention for weapons, items, and environmental interaction.
- Keep systems modular and maintainable. Do not invent assets, dependencies, APIs, or implemented features.
- Follow the existing readable JavaScript ES-module style. Use meters and Y-up coordinates. Keep physics changes compatible with the fixed-step controller and existing collision boxes.
- Validate changes through their normal entry points and report verification limits accurately.

## Architecture and files

The game uses JavaScript modules, HTML, CSS, Three.js, and a local Node static server. There is no separate game engine or rigid-body physics library. `src/main.js` connects input, simulation, UI, camera and rendering. `src/player.js` handles character collision and movement. `src/third-person-camera.js` follows the character. `src/inventory.js` and `src/pistol*.js` handle equipment. `src/door.js` implements hinged door behavior. `src/world.js` creates the yard and collisions. `src/landscape.js` generates scenery. `src/models.js` loads configured glTF models. `index.html` and `styles.css` define the UI. See DEVELOPMENT.md for dependencies and limitations.

Run `npm install` and `npm run dev`, then open http://127.0.0.1:8080. Run `node --test tests/doors.test.js` and relevant browser playtests. There is no build script.

## Session continuity

At the start of every development session:

1. Read AGENTS.md, README.md, GAME_DESIGN.md, DEVELOPMENT.md, and HANDOFF.md.
2. Inspect the current repository and Git changes. Verify documentation against the implementation and identify unfinished work.
3. Continue from the latest valid state while prioritizing the user's newest instructions. Do not repeat completed work unnecessarily.

During development, update affected documentation after significant changes. Record important decisions, task status, bugs, validation, and a current continuation prompt. Save checkpoints to HANDOFF.md during larger tasks so work can resume after interruption.

At the end, update affected documentation and task statuses. Record modified files, completed and outstanding tests, the current state, and the next actionable step. Rewrite the NEXT AI AGENT PROMPT in HANDOFF.md. The source is authoritative for current implementation. User-approved decisions govern intended behavior. Label untested work and proposals clearly, remove stale claims, and never let an old handoff override a newer request.
