# Development handoff

Last updated 2026-11-26.

## Current request and state

Continue the user's phased FPS expansion without discarding the relay-yard slice or existing work. Preserve the handless first-person equipment convention, existing controls, doors, Glock, rifle and objective loop. The immediate NPC foundation tasks from the previous checkpoint—door traversal, hitscan, perception, hostile attacks and player health—are implemented; end-to-end combat still needs live playtesting.

## Checkpoint

- `src/navigation.js`, `src/npc.js`, `src/main.js`: NPCs use the static ground-level grid, investigate nearby gunfire, navigate around dynamic door obstacles, open unlocked doors and cross them. A neutral survivor becomes hostile when shot; a rifle-carrying hostile patrols, detects the player using configurable range/FOV and line of sight, pursues and attacks with cadence-limited hitscan. World and door boxes block vision and fire. NPC reset restores its spawn, disposition and health.
- `src/player.js`, `src/main.js`, `index.html`, `styles.css`: player health is 100, represented by a world-space hitbox and HUD meter. Lethal damage opens a down/restart flow.
- `src/hitscan.js`: shared nearest-first ray resolver handles world/door blockers and living targets. Player and NPC weapon fire use it.
- `src/inventory.js`, `src/pistol.js`, `src/rifle-model.js`, `src/pickups.js`: handless Glock and procedural AK-style rifle, weapon states and rifle ammunition boxes remain as previously documented in `DEVELOPMENT.md` and `README.md`.
- The worktree was already dirty before this continuation. Preserve unrelated/pre-existing changes; do not reset or revert them.

## Validation

- `node --test tests/*.test.js`: 28 tests pass, covering doors, navigation, NPC hearing and door traversal, hitscan blockers, hostile sight and attack cadence, neutral-to-hostile behavior, player health/hitbox and pickups.
- `node --check src/npc.js`, `node --check src/main.js`, `node --check src/player.js`, and `git diff --check` pass.
- Browser smoke on the existing local server loaded the game, entered play and confirmed the visible health meter at 100 with no startup error. The hostile engagement, taking damage and death/restart flow were not driven through a full live browser playtest.
- There is no build or lint script. The game's actual combat quality, enemy placement, wall/door visibility and down/restart UX still need interactive validation.

## Remaining work

1. Play the game and verify hostile NPC detection, pursuit, blocker-aware fire, player damage, down state and restart. Adjust positioning or AI only based on observed behavior.
2. Verify interactions and existing first-person/third-person weapon behavior after these changes.
3. Consider further NPC improvements only after validating the prototype: cover, richer use/fire animations and audio, NPC collision with door swings, and elevated navigation.
4. The broader requested expansion remains partial: more shared equippable item types, resources and environmental interactions, connected interiors/world expansion, positional audio, weapon-specific polish and performance work.

## NEXT AI AGENT PROMPT

Read `AGENTS.md`, `README.md`, `GAME_DESIGN.md`, `DEVELOPMENT.md` and this handoff. Inspect the worktree and preserve its existing changes. First playtest the new NPC combat and player down/restart flow in a browser; confirm a hostile can see and damage the player, walls/doors block its fire, and restart restores the player and NPCs. Also regression-check the handless weapon controls, doors, relay objectives and pickup flow. Fix only issues reproduced during testing, then run `node --test tests/*.test.js` and update all affected documentation. After verified combat, continue the still-partial larger request—additional equippable items/resources/interactions, connected world, audio and performance—without removing working gameplay or claiming untested features are complete.
