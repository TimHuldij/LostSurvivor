import * as THREE from 'three';
import { addLandscape, makeTexture, randomSource } from './landscape.js';

const OFFLINE = 0xffae58;
const ONLINE = 0xc6ff74;
const UNIT_BOX = new THREE.BoxGeometry();

export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb4ba9e, .019);
  const ambient = new THREE.HemisphereLight(0xe6efdc, 0x5d6047, 2.35);
  const sun = new THREE.DirectionalLight(0xffdb9d, 2.65);
  sun.position.set(26, 27, -23);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -33;
  sun.shadow.camera.right = 33;
  sun.shadow.camera.top = 29;
  sun.shadow.camera.bottom = -29;
  sun.shadow.camera.far = 90;
  sun.shadow.normalBias = .045;
  sun.shadow.bias = -.00015;
  scene.add(ambient, sun);
  addLandscape(scene);

  const materials = new Map();
  const solids = [];
  const relays = [];
  const iron = 0x323c3a;
  const dark = 0x232d28;
  const timber = 0x615843;
  const rust = 0x8c4f36;
  const trim = 0x9a9280;
  const concrete = 0x838477;

  function material(color) {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .86 }));
    }
    return materials.get(color);
  }

  function addSolid(x, y, z, width, height, depth) {
    solids.push(new THREE.Box3(
      new THREE.Vector3(x - width / 2, y - height / 2, z - depth / 2),
      new THREE.Vector3(x + width / 2, y + height / 2, z + depth / 2),
    ));
  }

  function box(parent, x, y, z, width, height, depth, color, solid = false) {
    const mesh = new THREE.Mesh(UNIT_BOX, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) addSolid(x, y, z, width, height, depth);
    return mesh;
  }

  function post(parent, x, z, height, color = iron, base = 0) {
    box(parent, x, height / 2 + base, z, .16, height, .16, color);
  }

  function sign(parent, x, y, z, width, text, subtitle) {
    const map = makeTexture(512, 192, (context) => {
      context.fillStyle = '#252f25';
      context.fillRect(0, 0, 512, 192);
      context.strokeStyle = '#afb19a';
      context.lineWidth = 5;
      context.strokeRect(10, 10, 492, 172);
      context.fillStyle = '#e2e4c9';
      context.font = 'bold 57px monospace';
      context.textAlign = 'center';
      context.fillText(text, 256, subtitle ? 88 : 116);
      if (subtitle) {
        context.fillStyle = '#cfad75';
        context.font = '25px monospace';
        context.fillText(subtitle, 256, 136);
      }
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * .375),
      new THREE.MeshBasicMaterial({ map }));
    mesh.position.set(x, y, z);
    parent.add(mesh);
  }

  const fenceTexture = makeTexture(128, 128, (context) => {
    context.strokeStyle = '#606854';
    context.lineWidth = 11;
    for (const direction of [-1, 1]) {
      for (const x of [-128, -64, 0, 64, 128, 192, 256]) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 128 * direction, 128);
        context.stroke();
      }
    }
  });
  fenceTexture.wrapS = fenceTexture.wrapT = THREE.RepeatWrapping;

  function fence(x, z, length, northSouth = false) {
    const height = 2.35;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    if (northSouth) group.rotation.y = Math.PI / 2;
    scene.add(group);

    const mesh = new THREE.PlaneGeometry(length, height - .22);
    const uv = mesh.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * length / .85, uv.getY(i) * 3);
    const wire = new THREE.Mesh(mesh, new THREE.MeshStandardMaterial({
      map: fenceTexture, side: THREE.DoubleSide, alphaTest: .42, roughness: .9,
    }));
    wire.position.y = height / 2;
    group.add(wire);
    for (const y of [.18, 2.29]) box(group, 0, y, 0, length, .072, .08, iron);
    const sections = Math.ceil(length / 3);
    for (let i = 0; i <= sections; i++) post(group, i * length / sections - length / 2, 0, 2.56);
    addSolid(x, height / 2, z, northSouth ? .18 : length, height, northSouth ? length : .18);
  }

  function crate(x, y, z, width, height, depth, color = timber) {
    box(scene, x, y + height / 2, z, width, height, depth, color, true);
    for (const offset of [-.5, .5]) {
      box(scene, x, y + height / 2, z + offset * depth, width + .04, .12, .09, iron);
      box(scene, x, y + height - .1, z + offset * depth, width + .04, .075, .09, dark);
      for (const side of [-.47, .47]) {
        box(scene, x + side * width, y + height / 2, z + offset * depth, .12, height, .11, iron);
      }
    }
  }

  function relay(number, label, x, elevation, z) {
    const group = new THREE.Group();
    group.position.set(x, elevation, z);
    scene.add(group);
    box(group, 0, .10, 0, 1.14, .20, .80, concrete);
    box(group, 0, .54, -.17, .18, .92, .21, iron);
    box(group, 0, 1.06, 0, .83, .86, .45, iron);
    box(group, 0, 1.03, .236, .72, .70, .054, 0x63735e);
    box(group, 0, 1.11, .272, .51, .31, .05, dark);
    box(group, 0, .76, .281, .59, .052, .055, trim);
    box(group, 0, 1.52, 0, .89, .11, .52, dark);
    box(group, .20, 1.84, -.1, .056, .72, .052, iron);
    box(group, .20, 2.18, -.1, .42, .068, .06, iron);
    box(group, 0, 1.66, .08, .22, .19, .2, dark);
    addSolid(x, elevation + .745, z, 1.08, 1.49, .63);

    const lampMaterial = new THREE.MeshStandardMaterial({ color: OFFLINE, emissive: OFFLINE, emissiveIntensity: 2.2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.115, 10, 8), lampMaterial);
    lamp.position.set(0, 1.76, .08);
    group.add(lamp);
    const screen = new THREE.Mesh(UNIT_BOX, lampMaterial);
    screen.position.set(0, 1.11, .303);
    screen.scale.set(.32, .053, .021);
    group.add(screen);
    const light = new THREE.PointLight(OFFLINE, 7, 4, 2);
    light.position.set(0, 1.76, .32);
    group.add(light);
    sign(group, 0, .94, .311, .36, number);

    relays.push({
      number, label,
      panel: new THREE.Vector3(x, elevation + 1.18, z + .36),
      marker: new THREE.Vector3(x, elevation + 2.53, z),
      active: false,
      setActive(active) {
        this.active = active;
        const color = active ? ONLINE : OFFLINE;
        lampMaterial.color.setHex(color);
        lampMaterial.emissive.setHex(color);
        light.color.setHex(color);
      },
    });
  }

  function buildWorkshop() {
    const x = 13;
    const z = -13.5;
    const width = 11.5;
    const depth = 7.4;
    const front = z + depth / 2;
    const height = 3.75;
    box(scene, x, height / 2, z, width, height, depth, rust, true);
    box(scene, x, .18, front + .08, width + .12, .36, .24, concrete);
    box(scene, x, height + .08, z, width + .65, .26, depth + .7, dark);
    box(scene, x, height + .27, z - 1.8, width + .25, .21, 3.4, iron);
    for (let i = 0; i <= 29; i++) {
      box(scene, x - width / 2 + i * width / 29, 2.07, front + .02, .13, 3.39, .11, i % 3 ? 0x995d40 : 0x784430);
    }
    for (let i = 0; i <= 18; i++) {
      box(scene, x - width / 2 - .02, 2.07, z - depth / 2 + i * depth / 18, .10, 3.39, .11, rust);
    }
    box(scene, x + 1.62, 1.32, front + .107, 3.31, 2.63, .15, dark);
    for (let i = 0; i < 12; i++) {
      box(scene, x + 1.62, .17 + i * .188, front + .204, 2.97, .16, .062, i % 2 ? 0x586353 : 0x697060);
    }
    for (const offset of [-4.9, -2.8]) {
      box(scene, x + offset, 2.11, front + .11, 1.3, .97, .13, dark);
      for (const pane of [-.3, .3]) {
        box(scene, x + offset + pane, 2.12, front + .193, .52, .76, .03, 0xa29362);
      }
    }
    sign(scene, x + 1.62, 3.11, front + .22, 2.15, 'WORKSHOP');
    for (const offset of [-5.3, 5.3]) {
      box(scene, x + offset, 2.87, front + .24, .3, .18, .33, iron);
      box(scene, x + offset, 2.81, front + .40, .21, .05, .025, 0xffc979);
    }
    box(scene, 18.5, .13, -7.98, 1.3, .26, 3.45, concrete, true);
    crate(17.8, .26, -8.05, 1.05, .82, 1.35);
    crate(16.22, 0, -8.68, 1.18, .62, 1.04);
  }

  function buildLookout() {
    const x = -8.5;
    const front = -10.8;
    const height = 1.4;
    const stepDepth = .62;
    const deckFront = front - 7 * stepDepth;
    const depth = 7.2;
    const z = deckFront - depth / 2;
    for (let i = 0; i < 7; i++) {
      const top = .2 * (i + 1);
      const stepZ = front - stepDepth * (i + .5);
      box(scene, x, top / 2, stepZ, 2.4, top, stepDepth, i % 2 ? iron : 0x515b4b, true);
      box(scene, x, top - .045, stepZ + stepDepth / 2, 2.42, .06, .06, trim);
    }
    box(scene, x, height - .12, z, 5.25, .24, depth, 0x565743, true);
    for (let i = 1; i < 16; i++) {
      box(scene, x, height + .002, deckFront - i * depth / 16, 5.25, .006, .022, 0x333c30);
    }
    for (const side of [-1, 1]) {
      const railX = x + 2.52 * side;
      for (const railZ of [deckFront - .12, z, z - 3.5]) {
        post(scene, railX, railZ, 1.04, iron, height);
        box(scene, railX, .59, railZ, .26, 1.18, .26, iron, true);
      }
      for (const y of [height + .49, height + 1.01]) {
        box(scene, railX, y, z, .105, .105, depth, iron);
      }
      addSolid(railX, height + .50, z, .14, 1, depth);
      box(scene, x + side * 2.12, 2.96, z - 2.72, .18, 3.12, .18, iron, true);
    }
    const rear = z - depth / 2 + .09;
    box(scene, x, height + 1.01, rear, 5.13, .11, .13, iron);
    addSolid(x, height + .50, rear, 5.13, 1, .13);
    box(scene, x, 4.58, z - 2.45, 4.92, .18, 2.9, rust);
    sign(scene, x, 4.63, z - .95, 2.2, 'LOOKOUT');
  }

  function buildShelter() {
    const x = -12.8;
    const z = -1.3;
    const width = 5.6;
    const depth = 4.8;
    box(scene, x, .08, z, width + .56, .16, depth + .48, concrete, true);
    for (const dx of [-width / 2, width / 2]) {
      for (const dz of [-depth / 2, depth / 2]) {
        box(scene, x + dx, 1.44, z + dz, .24, 2.88, .24, timber, true);
      }
    }
    box(scene, x, 1.36, z - depth / 2, width, 2.4, .17, timber, true);
    box(scene, x, 2.96, z, width + .8, .2, depth + .85, rust);
    sign(scene, x, 2.78, z + 2.9, 1.65, 'SUPPLIES');
    crate(x - 1.45, .16, z - .45, 1.5, .79, 1.24);
    crate(x - .48, .16, z - 1.38, .75, .57, .8);
  }

  function utilityPole(x, z, height) {
    box(scene, x, height / 2, z, .23, height, .23, timber, true);
    box(scene, x, height - .25, z, 1.9, .19, .20, timber);
    box(scene, x, height - .91, z, 1.23, .14, .14, timber);
    for (const offset of [-.74, 0, .74]) box(scene, x + offset, height - .11, z, .12, .26, .13, iron);
  }

  function cable(x1, z1, y1, x2, z2, y2) {
    const points = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      points.push(new THREE.Vector3(
        THREE.MathUtils.lerp(x1, x2, t),
        THREE.MathUtils.lerp(y1, y2, t) - Math.sin(t * Math.PI) * 1.05,
        THREE.MathUtils.lerp(z1, z2, t),
      ));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x2e3830 })));
  }

  addSolid(0, -.25, 0, 46, .5, 55);
  fence(-21.5, -2.2, 49.6, true);
  fence(21.5, -2.2, 49.6, true);
  fence(0, -27, 43);
  fence(0, 22.6, 43);
  buildWorkshop();
  buildLookout();
  buildShelter();
  crate(6.1, 0, 4.4, 2.05, .56, 1.65, 0x67704d);
  crate(7.68, 0, 2.98, 1.25, .93, 1.55);
  crate(-4.1, 0, -4.7, 2.15, .62, 1.36, 0x626a51);
  crate(-2.9, 0, -6, 1.25, .91, 1.5);
  crate(10.8, 0, -1.62, 1.4, .73, 1.1);
  crate(19, 0, -20, 2.03, .86, 1.45);
  crate(-15, 0, -17, 1.6, .68, 1.5);

  const random = randomSource(8143);
  for (let i = 0; i < 20; i++) {
    const x = i < 10 ? -18 - random() * 1.4 : 19 + random() * 1.4;
    const z = random() * 41 - 21;
    const plank = box(scene, x, .10, z, .19, .12, .50 + random() * 1.25, timber);
    plank.rotation.y = random() * Math.PI;
  }

  utilityPole(7.75, .1, 8.25);
  utilityPole(5.15, -12.5, 7.7);
  utilityPole(12.9, -22.7, 8.5);
  for (const offset of [-.74, 0, .74]) {
    cable(7.75 + offset, .1, 8.28, 5.15 + offset, -12.5, 7.73);
    cable(5.15 + offset, -12.5, 7.73, 12.9 + offset, -22.7, 8.53);
  }

  relay('01', 'Entry post', -3.7, 0, 5.6);
  relay('02', 'Workshop', 12.85, 0, -6.68);
  relay('03', 'Lookout', -8.5, 1.4, -19.45);

  const spawn = { x: .0, y: 0, z: 13.2, yaw: .18 };
  return { scene, solids, relays, spawn };
}
