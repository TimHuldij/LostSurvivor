import * as THREE from 'three';
import { armorMaterials } from './armor-materials.js';
import { curvedPart, roundedPart } from './model-geometry.js';

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

<<<<<<< HEAD
<<<<<<< HEAD
function profileGeometry(profile) {
  return new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), 24);
}

export function createViewmodelArms(pistolGrip = true) {
  const { steel, darkSteel, brass, mail, leather, edge } = armorMaterials();
  const sleeveShape = profileGeometry(SLEEVE_PROFILE);
  const wristShape = profileGeometry(WRIST_PROFILE);

  function sleeve(side) {
    const arm = new THREE.Group();
    const cloth = new THREE.Mesh(sleeveShape, mail);
    cloth.scale.z = .88;
    const wrist = new THREE.Mesh(wristShape, mail);
    wrist.scale.z = .89;
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.074, .082, .084, 24), darkSteel);
    cuff.position.y = .294;
    cuff.scale.z = .9;
    arm.add(cloth, wrist, cuff);
    for (let row = 0; row < 4; row++) {
      const plate = curvedPart(arm, row % 2 ? steel : darkSteel, [.19 - row * .014,.224,.096],
        [side * .016, -.032 + row * .13, .050]);
      plate.rotation.y = side * .34;
    }
=======
=======
>>>>>>> parent of 084d75d (f)
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
<<<<<<< HEAD
>>>>>>> parent of 084d75d (f)
=======
>>>>>>> parent of 084d75d (f)

    for (const xOffset of [-.013, .013]) {
      const points = SLEEVE_PROFILE.slice(2, -2).map(([radius, y]) => {
        const x = side * (radius * .52) + xOffset;
        const z = Math.sqrt(radius ** 2 - x ** 2) * .87;
        return [x, y, z];
      });
<<<<<<< HEAD
<<<<<<< HEAD
      tubeAlong(arm, darkSteel, points, .0017);
=======
      tubeAlong(arm, seam, points, .0016);
>>>>>>> parent of 084d75d (f)
=======
      tubeAlong(arm, seam, points, .0016);
>>>>>>> parent of 084d75d (f)
    }

    const wristTab = roundedPart(arm, hem, [.052, .112, .017], [side * .029, .40, .052], .008);
    wristTab.rotation.y = side * .44;
    roundedPart(wristTab, seam, [.017, .052, .005], [0, .003, .010], .002);
    return arm;
  }

  function glove(side) {
    const hand = new THREE.Group();
<<<<<<< HEAD
<<<<<<< HEAD
    const grippingHand = side > 0;
    roundedPart(hand, leather, [.098, .130, .115], [0, .002, .024], .038);
    const back = roundedPart(hand, steel, [.023, .109, .092], [side * .041, -.004, .024], .011);
    back.rotation.x = -.10;
    roundedPart(hand, darkSteel, [.095, .087, .093], [-side * .004, -.074, .044], .024);
    roundedPart(hand, leather, [.107, .032, .108], [-side * .004, -.092, .047], .012);
    tubeAlong(hand, brass, [
      [side * .041, -.094, .094], [side * .051, -.094, .070], [side * .048, -.094, .016],
    ], .0018);
=======
=======
>>>>>>> parent of 084d75d (f)
    roundedPart(hand, leather, [.101, .129, .113], [0, .006, .027], .033);
    roundedPart(hand, insert, [.028, .096, .087], [side * .039, .009, .029], .012);
    roundedPart(hand, leather, [.093, .092, .093], [-side * .004, -.077, .045], .024);
    roundedPart(hand, webbing, [.104, .034, .103], [-side * .004, -.093, .045], .013);
    roundedPart(hand, piping, [.011, .020, .042], [side * .048, -.092, .046], .004);
<<<<<<< HEAD
>>>>>>> parent of 084d75d (f)
=======
>>>>>>> parent of 084d75d (f)

    for (let finger = 0; finger < 4; finger++) {
      const y = .054 - .032 * finger;
      const length = [.073, .080, .074, .060][finger];
      const last = [-side * .028, y - .008, -length];
      tubeAlong(hand, leather, [
<<<<<<< HEAD
<<<<<<< HEAD
        [side * .030, y, .015],
        [side * .038, y, -length * .68],
        [-side * cuffCurl * .40, y - .001, -length * 1.05],
        rim,
      ], radius);
      tubeAlong(hand, darkSteel, [
        rim, [-side * (cuffCurl + fingertipCurl) * .5, y - .007, -length * .95], end,
      ], radius * .84);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * .84, 12, 8), darkSteel);
      tip.position.set(...end);
      hand.add(tip);
      const pad = roundedPart(hand, steel, [.017, .025, .052], [side * .044, y, -.017], .008);
=======
        [side * .024, y, -.015],
        [side * .015, y, -length * .72],
        last,
      ], .017);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.017, 12, 8), leather);
      tip.position.set(...last);
      hand.add(tip);
      const pad = roundedPart(hand, armor, [.018, .024, .040], [side * .044, y, -.016], .008);
>>>>>>> parent of 084d75d (f)
=======
        [side * .024, y, -.015],
        [side * .015, y, -length * .72],
        last,
      ], .017);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.017, 12, 8), leather);
      tip.position.set(...last);
      hand.add(tip);
      const pad = roundedPart(hand, armor, [.018, .024, .040], [side * .044, y, -.016], .008);
>>>>>>> parent of 084d75d (f)
      pad.rotation.y = side * .19;
    }

    tubeAlong(hand, insert, [
      [-side * .033, .025, .046], [-side * .050, .054, .008], [-side * .031, .071, -.029],
    ], .022);
<<<<<<< HEAD
<<<<<<< HEAD
    tubeAlong(hand, darkSteel, [
      [-side * .064, .072, .035], [-side * .078, .089, .018], [-side * .082, .092, .002],
    ], .018);
    roundedPart(hand, steel, [.029, .032, .038], [-side * .082, .091, .003], .014);
    return hand;
  }

  function articulatedGlove(side) {
    const hand = new THREE.Group();
    roundedPart(hand, leather, [.212, .222, .113], [0, -.015, 0], .051);
    curvedPart(hand, steel, [.191,.162,.082], [0,.014,.037]);
    roundedPart(hand, darkSteel, [.170, .125, .116], [0, -.13, -.008], .033);
    roundedPart(hand, steel, [.183, .044, .127], [0, -.157, -.009], .018);
    tubeAlong(hand, edge, [[-.073, -.075, .047], [0, -.056, .066], [.073, -.075, .047]], .003);
    for (let row = 0; row < 3; row++) {
      curvedPart(hand, row === 0 ? steel : darkSteel, [.177,.042,.071], [0,.050-row*.046,.051-row*.004]);
    }

    const fingers = [.115, .127, .119, .092].map((length, index) => {
      const width = .047 - index * .003;
      const root = new THREE.Group();
      root.position.set(side * (-.071 + index * .047), .074 - index * .006, 0);
      roundedPart(root, leather, [width, length * .68, .045], [0, length * .27, 0], .018);
      roundedPart(root, steel, [width * .79, length * .38, .016], [0, length * .26, .021], .007);

      const tip = new THREE.Group();
      tip.position.y = length * .56;
      roundedPart(tip, darkSteel, [width * .77, length * .55, .036], [0, length * .22, 0], .017);
      root.add(tip);
      hand.add(root);
      return { root, tip, spread: side * (1.3 - index) * .10 };
    });

    const thumb = new THREE.Group();
    thumb.position.set(-side * .080, -.050, -.022);
    roundedPart(thumb, leather, [.067, .110, .062], [0, .035, 0], .026);
    roundedPart(thumb, steel, [.047, .057, .045], [0, .104, -.006], .021);
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
=======
    roundedPart(hand, insert, [.029, .035, .031], [-side * .031, .069, -.030], .014);
    return hand;
  }

>>>>>>> parent of 084d75d (f)
=======
    roundedPart(hand, insert, [.029, .035, .031], [-side * .031, .069, -.030], .014);
    return hand;
  }

>>>>>>> parent of 084d75d (f)
  return {
    rightHand: glove(1),
    leftHand: glove(-1),
    rightSleeve: sleeve(1),
    leftSleeve: sleeve(-1),
  };
}
