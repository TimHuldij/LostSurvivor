import * as THREE from 'three';
import { roundedPart } from './model-geometry.js';

const SLEEVE_PROFILE = [
  [0, -.50], [.113, -.50], [.120, -.43], [.116, -.34], [.106, -.27],
  [.112, -.23], [.103, -.18], [.098, -.09], [.091, -.016], [.093, .05],
  [.082, .13], [.085, .19], [.076, .26], [.079, .33], [.069, .37],
  [.061, .413], [.056, .46], [0, .46],
];

function tubeAlong(parent, material, points, radius) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 12, radius, 5), material);
  parent.add(mesh);
}

function makeClothTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#dbdce0';
  context.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 3) {
    context.fillStyle = y % 2 ? '#c3c7ce' : '#e5e7ec';
    context.fillRect(0, y, 128, 1);
    for (let x = y % 2; x < 128; x += 4) {
      context.fillStyle = (x + y) % 7 < 3 ? '#cbd1d9' : '#f3f3f3';
      context.fillRect(x, y, 1, 2);
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 3);
  map.anisotropy = 4;
  return map;
}

export function createViewmodelArms() {
  const navy = new THREE.MeshStandardMaterial({ color: 0x4d5b6d, roughness: .95, map: makeClothTexture() });
  const hem = new THREE.MeshStandardMaterial({ color: 0x303943, roughness: .96 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x647383, roughness: .95 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x44423a, roughness: .86 });
  const insert = new THREE.MeshStandardMaterial({ color: 0x6d685b, roughness: .91 });
  const armor = new THREE.MeshStandardMaterial({ color: 0x2c3033, roughness: .61 });
  const webbing = new THREE.MeshStandardMaterial({ color: 0x75664d, roughness: .92 });
  const piping = new THREE.MeshStandardMaterial({ color: 0x9b8d74, roughness: .93 });
  const sleeveShape = new THREE.LatheGeometry(SLEEVE_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y)), 24);

  function sleeve(side) {
    const arm = new THREE.Group();
    const fabric = new THREE.Mesh(sleeveShape, navy);
    fabric.scale.z = .87;
    arm.add(fabric);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(.061, .073, .134, 20), hem);
    wrist.position.y = .433;
    wrist.scale.z = .89;
    arm.add(wrist);

    for (const xOffset of [-.013, .013]) {
      const points = SLEEVE_PROFILE.slice(2, -2).map(([radius, y]) => {
        const x = side * (radius * .52) + xOffset;
        const z = Math.sqrt(radius ** 2 - x ** 2) * .87;
        return [x, y, z];
      });
      tubeAlong(arm, seam, points, .0016);
    }

    const wristTab = roundedPart(arm, hem, [.052, .112, .017], [side * .029, .40, .052], .008);
    wristTab.rotation.y = side * .44;
    roundedPart(wristTab, seam, [.017, .052, .005], [0, .003, .010], .002);
    return arm;
  }

  function glove(side) {
    const hand = new THREE.Group();
    roundedPart(hand, leather, [.101, .129, .113], [0, .006, .027], .033);
    roundedPart(hand, insert, [.028, .096, .087], [side * .039, .009, .029], .012);
    roundedPart(hand, leather, [.093, .092, .093], [-side * .004, -.077, .045], .024);
    roundedPart(hand, webbing, [.104, .034, .103], [-side * .004, -.093, .045], .013);
    roundedPart(hand, piping, [.011, .020, .042], [side * .048, -.092, .046], .004);

    for (let finger = 0; finger < 4; finger++) {
      const y = .054 - .032 * finger;
      const length = [.073, .080, .074, .060][finger];
      const last = [-side * .028, y - .008, -length];
      tubeAlong(hand, leather, [
        [side * .024, y, -.015],
        [side * .015, y, -length * .72],
        last,
      ], .017);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.017, 12, 8), leather);
      tip.position.set(...last);
      hand.add(tip);
      const pad = roundedPart(hand, armor, [.018, .024, .040], [side * .044, y, -.016], .008);
      pad.rotation.y = side * .19;
    }

    tubeAlong(hand, insert, [
      [-side * .033, .025, .046], [-side * .050, .054, .008], [-side * .031, .071, -.029],
    ], .022);
    roundedPart(hand, insert, [.029, .035, .031], [-side * .031, .069, -.030], .014);
    return hand;
  }

  return {
    rightHand: glove(1),
    leftHand: glove(-1),
    rightSleeve: sleeve(1),
    leftSleeve: sleeve(-1),
  };
}
