import * as THREE from 'three';
import { roundedPart } from './model-geometry.js';

const SLEEVE_PROFILE = [
  [0, -.50], [.113, -.50], [.120, -.43], [.116, -.34], [.106, -.27],
  [.112, -.23], [.103, -.18], [.098, -.09], [.091, -.016], [.093, .05],
  [.083, .13], [.085, .19], [.076, .255], [.072, .32], [0, .32],
];
const WRIST_PROFILE = [[0, .27], [.069, .27], [.067, .335], [.059, .41], [.053, .50], [0, .50]];
const UP = new THREE.Vector3(0, 1, 0);

function tubeAlong(parent, material, points, radius) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 12, radius, 8), material);
  parent.add(mesh);
}

function makeWeaveTexture() {
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

function profileGeometry(profile) {
  return new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), 24);
}

export function createViewmodelArms(pistolGrip = true) {
  const weave = makeWeaveTexture();
  const navy = new THREE.MeshStandardMaterial({ color: 0x363d51, roughness: .95, map: weave });
  const hem = new THREE.MeshStandardMaterial({ color: 0x262b38, roughness: .94, map: weave });
  const leather = new THREE.MeshStandardMaterial({ color: 0x262728, roughness: .76 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x333437, roughness: .94, map: weave });
  const piping = new THREE.MeshStandardMaterial({ color: 0x4a4947, roughness: .90 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b7055, roughness: .84 });
  const sleeveShape = profileGeometry(SLEEVE_PROFILE);
  const wristShape = profileGeometry(WRIST_PROFILE);

  function sleeve(side) {
    const arm = new THREE.Group();
    const cloth = new THREE.Mesh(sleeveShape, navy);
    cloth.scale.z = .88;
    const wrist = new THREE.Mesh(wristShape, skin);
    wrist.scale.z = .89;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.074, .082, .084, 24), hem);
    cuff.position.y = .294;
    cuff.scale.z = .9;
    arm.add(cloth, wrist, cuff);

    for (const xOffset of [-.013, .013]) {
      const points = SLEEVE_PROFILE.slice(2, -2).map(([radius, y]) => {
        const x = side * (radius * .52) + xOffset;
        const z = Math.sqrt(radius ** 2 - x ** 2) * .88;
        return [x, y, z];
      });
      tubeAlong(arm, hem, points, .0017);
    }
    return arm;
  }

  function glove(side) {
    const hand = new THREE.Group();
    const grippingHand = side > 0;
    roundedPart(hand, leather, [.098, .130, .115], [0, .002, .024], .038);
    const back = roundedPart(hand, fabric, [.023, .109, .092], [side * .041, -.004, .024], .011);
    back.rotation.x = -.10;
    roundedPart(hand, fabric, [.095, .087, .093], [-side * .004, -.074, .044], .024);
    roundedPart(hand, leather, [.107, .032, .108], [-side * .004, -.092, .047], .012);
    tubeAlong(hand, piping, [
      [side * .041, -.094, .094], [side * .051, -.094, .070], [side * .048, -.094, .016],
    ], .0018);

    for (let finger = 0; finger < 4; finger++) {
      const y = .054 - .032 * finger;
      const length = grippingHand ? [.193, .181, .167, .150][finger] : [.103, .100, .088, .073][finger];
      const cuffCurl = grippingHand ? .102 : .018;
      const fingertipCurl = grippingHand ? .137 : .051;
      const radius = .018 - finger * .0011;
      const rim = [-side * cuffCurl, y - .005, -length * .98];
      const end = [-side * fingertipCurl, y - .010, -length * .87];
      tubeAlong(hand, leather, [
        [side * .030, y, .015],
        [side * .038, y, -length * .68],
        [-side * cuffCurl * .40, y - .001, -length * 1.05],
        rim,
      ], radius);
      tubeAlong(hand, skin, [
        rim, [-side * (cuffCurl + fingertipCurl) * .5, y - .007, -length * .95], end,
      ], radius * .84);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * .84, 12, 8), skin);
      tip.position.set(...end);
      hand.add(tip);
      const pad = roundedPart(hand, fabric, [.017, .025, .052], [side * .044, y, -.017], .008);
      pad.rotation.y = side * .19;
    }

    tubeAlong(hand, leather, [
      [-side * .028, .017, .050], [-side * .051, .049, .053], [-side * .067, .074, .033],
    ], .022);
    tubeAlong(hand, skin, [
      [-side * .064, .072, .035], [-side * .078, .089, .018], [-side * .082, .092, .002],
    ], .018);
    roundedPart(hand, skin, [.029, .032, .038], [-side * .082, .091, .003], .014);
    return hand;
  }

  function articulatedGlove(side) {
    const hand = new THREE.Group();
    roundedPart(hand, leather, [.212, .222, .113], [0, -.015, 0], .051);
    roundedPart(hand, fabric, [.173, .139, .044], [0, .013, .044], .022);
    roundedPart(hand, fabric, [.170, .125, .116], [0, -.13, -.008], .033);
    roundedPart(hand, leather, [.183, .044, .127], [0, -.157, -.009], .018);
    tubeAlong(hand, piping, [[-.073, -.075, .047], [0, -.056, .066], [.073, -.075, .047]], .003);

    const fingers = [.115, .127, .119, .092].map((length, index) => {
      const width = .047 - index * .003;
      const root = new THREE.Group();
      root.position.set(side * (-.071 + index * .047), .074 - index * .006, 0);
      roundedPart(root, leather, [width, length * .68, .045], [0, length * .27, 0], .018);
      roundedPart(root, fabric, [width * .79, length * .38, .016], [0, length * .26, .021], .007);

      const tip = new THREE.Group();
      tip.position.y = length * .56;
      roundedPart(tip, skin, [width * .77, length * .55, .036], [0, length * .22, 0], .017);
      root.add(tip);
      hand.add(root);
      return { root, tip, spread: side * (1.3 - index) * .10 };
    });

    const thumb = new THREE.Group();
    thumb.position.set(-side * .080, -.050, -.022);
    roundedPart(thumb, leather, [.067, .110, .062], [0, .035, 0], .026);
    roundedPart(thumb, skin, [.047, .057, .045], [0, .104, -.006], .021);
    hand.add(thumb);

    return {
      hand,
      curl(amount) {
        for (const { root, tip, spread } of fingers) {
          root.rotation.set(-.14 - amount * 1.37, 0, spread * (1 - amount));
          tip.rotation.x = -.06 - amount * 1.53;
        }
        thumb.rotation.set(-.26 - amount * .70, 0, side * (.95 - amount * .54));
      },
    };
  }

  const right = pistolGrip ? { hand: glove(1) } : articulatedGlove(1);
  const left = pistolGrip ? { hand: glove(-1) } : articulatedGlove(-1);
  return {
    rightHand: right.hand,
    leftHand: left.hand,
    curlRight: right.curl,
    curlLeft: left.curl,
    rightSleeve: sleeve(1),
    leftSleeve: sleeve(-1),
  };
}

export function alignSleeve(sleeve, elbow, hand, wrist) {
  hand.localToWorld(wrist);
  sleeve.position.copy(elbow).lerp(wrist, .5);
  wrist.sub(elbow);
  sleeve.scale.y = wrist.length();
  sleeve.quaternion.setFromUnitVectors(UP, wrist.normalize());
}
