# Lost Survivor

A desktop browser first-person playtest. Explore a fenced forest relay yard and bring the entry post, workshop, and raised lookout back online.

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
| E | Activate a nearby relay while facing its panel |
| Left click | Fire the G19 |
| R | Reload |
| F | Inspect |
| Esc | Pause |

If the browser blocks mouse capture, drag on the game or use the arrow keys to look. Use **Restart** from the pause screen to reset the yard.

## Game models

The full-body survivor, G19, and first-person arms are built in JavaScript. The arms use a two-handed grip, woven sleeves, and padded gloves. The pistol has a reload animation with synchronized sound cues and a separate inspect animation. Sound effects are synthesized in the browser.

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

[src/player.js](src/player.js) holds the persistent player body, collision, and movement state. The first-person camera leaves the body render layer out of view. The pistol attaches to the body's `ItemSocket`, which a future third-person camera can render along with `PLAYER_BODY_LAYER`. An imported body can provide its own node named `ItemSocket`.
