# Lost Survivor

A desktop browser survival playtest. Explore a fenced forest relay yard and bring the entry post, workshop, and raised lookout back online. The current slice favors responsive movement, handless first-person interaction, physical-feeling doors, and a muted low-poly forest atmosphere.

The project uses HTML, CSS, JavaScript modules and Three.js. It requires Node.js and a desktop browser with WebGL 2. Gameplay runs in memory and resets when restarted. There is no build step or production build script.

For design, implementation status and session continuity, read [GAME_DESIGN.md](GAME_DESIGN.md), [DEVELOPMENT.md](DEVELOPMENT.md), [HANDOFF.md](HANDOFF.md), and [AGENTS.md](AGENTS.md).

## Project structure

- `index.html` and `styles.css` contain the HUD and page layout.
- `src/main.js` connects input, rendering, simulation and UI.
- `src/player.js` and `src/third-person-camera.js` implement movement and cameras.
- `src/inventory.js` and `src/pistol*.js` implement equipment and weapon presentation.
- `src/door.js`, `src/world.js`, and `src/landscape.js` implement doors and the procedural map.
- `src/models.js` and `models/` configure optional user-created models.
- `src/npc.js`, `src/navigation.js`, and `src/hitscan.js` implement ground-level patrol, door-aware navigation, sound investigation, hostile vision and hitscan combat.
- `src/rifle-model.js` and `src/pickups.js` implement the procedural rifle model and ammunition boxes.
- `tests/` contains door, NPC and pickup tests. `serve.mjs` is the local HTTP server.

## Run locally

```sh
npm install
npm run dev
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080) in a desktop browser with WebGL 2 and select **Enter the yard**.

| Control | Action |
| --- | --- |
| W, A, S, D | Move |
| Mouse | Look around |
| Shift + W | Sprint |
| Space | Jump |
| E | Activate a relay, or open or close a door |
| 1 | Holster the Glock |
| 2 | Equip the Glock |
| 3 | Equip the AK-47 |
| B | Toggle AK-47 automatic/single fire |
| Left click | Fire; hold for automatic fire |
| Right click | Aim down sights |
| R | Reload the equipped weapon |
| F | Inspect the equipped slot |
| V | Switch between first person and third person |
| F2 | Toggle debug stats |
| Esc | Pause |

If the browser blocks mouse capture, drag on the game or use the arrow keys to look. Use **Restart** from the pause screen to reset the yard. Hostile NPC fire reduces the health meter; being downed opens the restart flow.

## Doors

Face a door and press E to open it. Press E again to close it. A door has to be unlatched before it can be pushed by walking into it.

The workshop and storehouse have doors. The workshop entrance is beside the shutter, and the storehouse is behind the lookout path.

### Adding and configuring doors

Create a doorway in the surrounding walls, then add a `Door` to the world's `doors` array in [src/world.js](src/world.js). For example:

```js
doors.push(new Door(scene, {
  hinge: [x, floorY, z],
  yaw: 0,
  width: 1.1,
  height: 2.35,
  mass: 45,
  minAngle: 0,
  maxAngle: 1.4,
  openingDirection: 1,
  locked: false,
}));
```

The hinge is the world-space bottom corner, and the closed door extends along its local positive X axis. `yaw` sets its closed orientation in radians. Angles and handle rotation use radians. Use `openingDirection: 0` for a door that chooses its opening side from the player. For double doors, create two doors with separate hinges and angles that swing away from each other.

Other options include `thickness`, `axis` (vertical Y-up), `openingSpeed`, `closingSpeed`, `friction`, `damping`, `interactionDistance`, `handleRotation`, `latch`, `collision`, `color`, and `metalness`. Change `door.locked` at runtime to lock or unlock a door. The existing collision system uses axis-aligned boxes, so place solid boxes around the doorway and keep the door's sweep clear of its frame.

The optional `audio.onEvent` callback receives `{ type, position, angularVelocity, intensity, door }`. Event types include `handle`, `latch`, `locked`, `creak`, `open`, `close`, `slam`, and `collision`. Connect these events to positional sound assets when available.

Run the checks with `node --test tests/*.test.js`.

## Game models

The full-body survivor and Glock are built in JavaScript. First-person items render without visible hands or arms. The Glock has an inspect animation and a reload animation with synchronized sound cues. Switching away from the pistol during reload cancels that reload and preserves its ammo count. Sound effects are synthesized in the browser.

### Optional model imports

| Folder | Contents |
| --- | --- |
| [models/source/](models/source/) | Editable `.blend` files |
| [models/player/](models/player/) | Exported full-body character |
| [models/props/](models/props/) | Exported map props |

1. In Blender, export the model with **File → Export → glTF 2.0**. Use **GLB** for a self-contained file. Keep Draco compression disabled. For a rigged character, include its animations and use in-place movement clips.
2. Put the exported file in its folder and set its path in [models/model-config.js](models/model-config.js). Paths are relative to `models/`. For a separate `.gltf` export, keep its binary and textures in their exported paths.
3. Reload the game. An unconfigured player uses the built-in survivor model.

```js
export const models = {
  player: {
    file: 'player/player.glb',
    yaw: 0,
    animations: { idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump' },
  },
  props: [
    { file: 'props/barrel.glb', position: [6, 0, 4], yaw: 30, scale: 1, solid: true },
  ],
};
```

Player height defaults to 1.76 meters. Its mesh is centered at the feet, and `yaw` rotates it in degrees to face the player's forward direction (world −Z at zero heading). Clip names can be omitted if they include Idle, Walk, Run, or Jump as separate words. Props can opt into a solid axis-aligned bounding box. World coordinates use meters and Y-up.

## Camera and character

[src/player.js](src/player.js) holds the persistent player body, collision, and movement state. In third person, the mouse orbits a follow camera, and the character turns in the direction of camera-relative movement. The camera keeps its focus near the character and pulls in around solid objects. The equipped Glock attaches to the body's `ItemSocket`. An imported body can provide its own node named `ItemSocket`.

## Rifle ammunition

The AK-47 starts with 30 rounds loaded and 90 in reserve. Face an ammunition box and press E to collect rifle rounds, up to a 180-round reserve. Boxes retain any rounds that do not fit and disappear when depleted. Restart resets the equipment and boxes. The rifle currently reuses the Glock animation framework and synthesized sound; shots use hitscan damage against NPCs, with walls and doors blocking shots.

The yard includes a neutral survivor who investigates nearby gunfire and becomes hostile when shot, plus a hostile rifle carrier who patrols, detects the player, pursues, and attacks. Player health is shown in the HUD. Combat and perception are an initial prototype; cover, elevated navigation and fuller combat animation/audio are not implemented.
