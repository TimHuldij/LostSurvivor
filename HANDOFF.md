# Development handoff

Last updated 2026-11-26.

## Current request and objective

The latest request asked for persistent, accurate repository documentation and an AI session continuity protocol. The objective is to make the repository sufficient for a new agent to understand the current game without prior chat history.

## Current state

The documentation audit and requested files have been created. No gameplay implementation was requested in this session. Source inspection confirms the relay yard, handless Glock, first/third-person movement, and single-press doors. The earlier hold-to-control door design was explicitly replaced by one E press to open and one to close.

Files created in this documentation task: `AGENTS.md`, `GAME_DESIGN.md`, `DEVELOPMENT.md`, and `HANDOFF.md`. `README.md` was updated with project overview and links. Existing working-tree changes predate this documentation task and must be preserved. At the audit they included modified `index.html`, `src/main.js`, and `src/world.js`, plus untracked `src/door.js` and `tests/`.

Technical decisions: the current game is Three.js with custom fixed-step collision, not a standalone engine. First-person equipment must remain handless. Door interactions are single-press. Sources determine actual implementation, while newer user instructions take precedence over this handoff.

## Validation and remaining work

`node --test tests/doors.test.js` passed all 13 tests during this audit. The documentation links and `git diff --check` were checked. No full browser regression was run for this documentation-only task. There is no build script. No new defects were confirmed. There is no authorized unfinished feature. The next action is to follow the user's next request.

## NEXT AI AGENT PROMPT

Read AGENTS.md, README.md, GAME_DESIGN.md, DEVELOPMENT.md, and this handoff. Inspect the working tree and current source before making changes. The previous agent created the continuity documents so future work can proceed without chat history. The playable prototype is a Three.js relay yard with custom fixed-step collision, first/third-person cameras, a handless Glock, and single-press E doors. Key code is in src/main.js, src/player.js, src/third-person-camera.js, src/inventory.js, src/pistol.js, src/door.js, and src/world.js. Preserve existing uncommitted work, invisible first-person hands, movement, camera, equipment, relays, and single-press doors. There is no pending approved feature. Follow the latest user request, update the documentation and this prompt as work progresses, run node --test tests/doors.test.js when relevant, and perform browser checks for affected gameplay. Do not claim unperformed validation.
