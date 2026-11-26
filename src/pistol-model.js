import * as THREE from 'three';
import { makeTexture, randomSource } from './landscape.js';
import { roundedPart } from './model-geometry.js';

// All shapes are visual meshes in viewmodel coordinates.
function silhouette(parent, material, points, width, bevel) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, steps: 1,
  });
  geometry.translate(0, 0, -(width - bevel * 2) / 2);
  geometry.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function markings() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const context = canvas.getContext('2d');
  context.fillStyle = '#78807d';
  context.font = 'bold 34px monospace';
  context.fillText('G19', 12, 45);
  context.fillStyle = '#636b68';
  context.font = '16px monospace';
  context.fillText('RELAY', 106, 43);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
}

function slideFinish() {
  const random = randomSource(2904);
  const texture = makeTexture(256, 256, (context, width, height) => {
    context.fillStyle = '#dedede';
    context.fillRect(0, 0, width, height);
    for (let mark = 0; mark < 2400; mark++) {
      context.fillStyle = random() > .62 ? '#ffffff32' : '#11111112';
      context.fillRect(random() * width, random() * height, 1 + random() * 9, 1);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createPistolModel() {
  const body = new THREE.Group();
  body.name = 'G19 game model';
  const upper = new THREE.Group();
  const magazine = new THREE.Group();
  body.add(upper, magazine);

  const blueSteel = new THREE.MeshStandardMaterial({ color: 0x494d50, roughness: .43, metalness: .49, map: slideFinish() });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x303235, roughness: .84 });
  const inset = new THREE.MeshStandardMaterial({ color: 0x242629, roughness: .79 });
  const steelAccent = new THREE.MeshStandardMaterial({ color: 0x51565a, roughness: .51, metalness: .42 });
  const sightPaint = new THREE.MeshStandardMaterial({ color: 0xe6e5bb, emissive: 0x857d38, emissiveIntensity: .16 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x9aa16f, roughness: .57 });

  silhouette(upper, blueSteel, [
    [-.49, .026], [-.525, .066], [-.517, .121], [-.482, .135],
    [.121, .135], [.159, .111], [.144, .032], [.115, .022],
  ], .116, .012);
  silhouette(body, polymer, [
    [-.462, .022], [.117, .022], [.153, -.026], [.164, -.107],
    [.207, -.324], [.171, -.355], [.063, -.337], [.028, -.264],
    [-.035, -.105], [-.187, -.076], [-.422, -.063], [-.473, -.025],
  ], .107, .013);
  silhouette(body, polymer, [
    [-.236, -.067], [-.246, -.117], [-.210, -.173], [-.151, -.198],
    [-.043, -.183], [.002, -.144], [-.003, -.116], [-.04, -.148],
    [-.156, -.168], [-.196, -.151], [-.212, -.112], [-.20, -.07],
  ], .068, .006);
  roundedPart(body, inset, [.026, .074, .036], [0, -.107, -.089], .012).rotation.x = -.33;

  const etching = markings();
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(.225, .063), etching);
    decal.position.set(side * .0586, .085, -.274);
    decal.rotation.y = side * Math.PI / 2;
    upper.add(decal);
    for (let i = 0; i < 6; i++) {
      const ridge = roundedPart(upper, inset, [.006, .071, .009], [side * .057, .079, .017 + i * .020], .0025);
      ridge.rotation.x = -.14;
    }
    const grip = roundedPart(body, inset, [.006, .219, .107], [side * .053, -.225, .104], .003);
    grip.rotation.x = .26;
    for (let i = 0; i < 8; i++) {
      roundedPart(body, steelAccent, [.003, .0035, .071], [side * .057, -.145 - i * .021, .081 + i * .005], .001);
    }
    roundedPart(body, steelAccent, [.006, .028, .054], [side * .053, -.040, -.035], .003);
    for (const z of [-.354, -.316, -.278]) {
      roundedPart(body, inset, [.009, .013, .020], [side * .052, -.037, z], .003);
    }
  }

  roundedPart(upper, inset, [.082, .007, .117], [0, .136, -.102], .003);
  roundedPart(upper, steelAccent, [.062, .006, .087], [0, .139, -.102], .002);
  roundedPart(upper, inset, [.036, .026, .039], [0, .15, -.466], .004);
  roundedPart(upper, sightPaint, [.014, .011, .005], [0, .151, -.445], .002);
  const rearPlate = roundedPart(upper, inset, [.079, .066, .012], [0, .071, .153], .006);
  rearPlate.rotation.x = .16;
  for (const y of [-.018, -.008, .002]) {
    roundedPart(rearPlate, steelAccent, [.054, .002, .003], [0, y, .006], .0008);
  }
  for (const side of [-1, 1]) {
    roundedPart(upper, inset, [.031, .027, .039], [side * .033, .15, .112], .004);
    roundedPart(upper, sightPaint, [.012, .008, .004], [side * .034, .151, .133], .0015);
  }
  const face = new THREE.Mesh(new THREE.CircleGeometry(.031, 24), inset);
  face.rotation.y = Math.PI;
  face.position.set(0, .083, -.529);
  upper.add(face);

  roundedPart(magazine, steelAccent, [.064, .139, .093], [0, -.278, .112], .009).rotation.x = .21;
  roundedPart(magazine, inset, [.113, .028, .133], [0, -.351, .124], .009).rotation.x = -.15;
  roundedPart(magazine, accent, [.051, .004, .031], [0, -.367, .139], .002);
  return { body, upper, magazine };
}
