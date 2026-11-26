# Development handoff

Last updated 2026-11-26.

## Current request and state

Continue the user's phased FPS expansion without discarding the relay-yard slice or existing work. Preserve the handless first-person equipment convention, existing controls, doors, Glock, rifle and objective loop. NPC perception/combat and player health have been live-tested. The reusable held-item foundation supports a flashlight, medkit, timed melee knife and throwable grenade.

## Checkpoint

- `src/navigation.js`, `src/npc.js`, `src/main.js`: NPCs use the static ground-level grid, investigate nearby gunfire, navigate around dynamic door obstacles, open unlocked doors and cross them. A neutral survivor becomes hostile when shot; a rifle-carrying hostile patrols, detects the player using configurable range/FOV and line of sight, pursues and attacks with cadence-limited hitscan. World and door boxes block vision and fire. NPC reset restores its spawn, disposition and health.
- `src/player.js`, `src/main.js`, `index.html`, `styles.css`: player health is 100, represented by a world-space hitbox and HUD meter. Lethal damage opens a down/restart flow.
- `src/hitscan.js`: shared nearest-first ray resolver handles world/door blockers and living targets. Player and NPC weapon fire use it.
- `src/equippable-item.js`, `src/flashlight.js`, `src/medical-item.js`, `src/melee-weapon.js`, `src/inventory.js`, `src/main.js`: reusable world/viewmodel item base with configurable equip/movement sway, reduced-motion support and blended use poses. Slot 4 flashlight with camera-aligned spot light/F toggle; slot 5 medical item with two-charge cap and 40-health use; slot 6 knife with timed 45-damage strikes and blocker-aware 2.4-meter reach.
- `src/pickups.js`, `src/player.js`: medical pickup and capped player healing. Medkit charges reset on restart.
- `src/grenade.js`, `src/pickups.js`, `src/inventory.js`, `src/main.js`, `src/pistol-audio.js`, `index.html`: handless grenade in slot 7, two-charge cap, timed throw release, projectile gravity/bounce against world and door boxes, 1.8-second fuse, explosion effect/synthesized blast, and 5-meter distance-falloff damage with blocker occlusion. Grenade pickups and charges reset with the yard.
- `src/pistol.js`, `src/rifle-model.js`, `src/pickups.js`: handless Glock and procedural AK-style rifle, weapon states and rifle ammunition boxes remain as documented in `DEVELOPMENT.md` and `README.md`.
- This session began with uncommitted changes from the previous work. Preserve those changes and inspect the current worktree before editing further.

## Validation

- `node --test tests/*.test.js`: 39 tests pass, covering doors, navigation, NPC hearing/traversal, world and real-door blockers, hostile sight/attack cadence, neutral-to-hostile behavior, player health/healing, resource pickups, flashlight/medical/melee items, and grenade timing/projectile/blast behavior.
- Syntax checks pass for changed JS files; `git diff --check` passes.
- Browser playtest verified hostile fire damages/downed the player, restart restored health and spawn, the entry relay activated, rifle fire consumed ammo, medkit healing from 92 to 100 and full-health charge preservation, flashlight toggle/stow/reselect/camera switching, a knife strike followed by NPC retaliation, and grenade pickup/charge decrement. The grenade's initial live detonation exposed an NPC coordinate access error in `applyGrenadeBlast`; it is fixed by resolving `npc.root.position` and covered by an NPC blast regression test. A post-fix browser throw consumed its charge and completed a 10-second fuse wait without a reported runtime error. The player remained at full health, so visual detonation and live blast damage are not confirmed.
- Remaining browser checks include confirming the grenade's visible detonation and live blast damage, flashlight illumination in darkness, in-world rifle ammo pickup, live door interaction/blocking, and knife presentation/regression in both camera modes. Browser performance remains around 4–5 FPS, making movement-based checks slow and occasionally inconclusive.
- No build or lint script exists. Other first/third-person weapon behavior and door/pickup interactions still need broader browser regression.

## Remaining work

1. Reverify the grenade's visual explosion and live blast damage after the NPC coordinate fix; the post-fix throw and fuse wait produced no runtime error, but did not lower player health.
2. Verify flashlight illumination in a dim setting, in-world rifle ammo collection, and live door interaction/blocking; adjust only on reproduced defects.
3. Regression-test knife range/occlusion and its viewmodel in first- and third-person, including equip/holster cancellation and reset.
4. Continue the larger handless-equipment request with complete items/resources or connected-world work, without rewriting working weapons. Additional interactions, connected interiors/world expansion, positional audio, cover, richer combat animation and performance work remain partial.

## NEXT AI AGENT PROMPT

Read `AGENTS.md`, `README.md`, `GAME_DESIGN.md`, `DEVELOPMENT.md` and this handoff. Inspect the current source and worktree; preserve existing user changes. Verify the grenade's visible explosion and live blast damage after the NPC position fix, then browser-test flashlight illumination in darkness, rifle ammo collection, live door interaction/blocking, and the slot-6 knife in first/third person. Fix only reproduced issues, run `node --test tests/*.test.js`, and update documentation. Continue the larger request with complete handless equippable items/resources or connected-world work while preserving existing gameplay.
