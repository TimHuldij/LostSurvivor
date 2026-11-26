import * as THREE from 'three';
import { armorMaterials } from './armor-materials.js';
import { armorTrim, curvedPart, roundedPart } from './model-geometry.js';

<<<<<<< HEAD
export const THIGH_LENGTH = .417;
export const SHIN_LENGTH = .391;
export const HIP_HEIGHT = .869;
export const ANKLE_HEIGHT = HIP_HEIGHT - THIGH_LENGTH - SHIN_LENGTH;

function frontPlate(parent, material, rows) {
  const profile = [-1, -.57, 0, .57, 1];
  const positions = [];
  const uv = [];
  const indices = [];
  rows.forEach(([y, width, rim, ridge], row) => {
    profile.forEach((x, column) => {
      positions.push(x * width, y, THREE.MathUtils.lerp(ridge, rim, Math.abs(x)));
      uv.push((x + 1) / 2, row / (rows.length - 1));
      const vertex = row * profile.length + column;
      if (row && column) {
        const top = vertex - profile.length;
        indices.push(top - 1, top, vertex - 1, top, vertex, vertex - 1);
      }
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function addCape(torso, material) {
  const vertices = [];
  const uv = [];
  const indices = [];
  const columns = 14;
  const rows = 10;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const width = .245 + .078 * t;
      const riffle = Math.sin(u * 8 * Math.PI + t * .74) * (.012 + .022 * t);
      const hem = Math.cos(u * 13.3) * .031 + Math.sin(u * 29.0) * .011;
      vertices.push((2 * u - 1) * width, .452 - .955 * t + hem * t ** 4,
        .141 + .255 * t ** 1.4 + Math.sin(u * Math.PI) * .045 + riffle);
      uv.push(u, t);
      if (column && row) {
        const i = row * (columns + 1) + column;
        indices.push(i - columns - 2, i - 1, i - columns - 1, i - 1, i, i - columns - 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const capeMaterial = material.clone();
  capeMaterial.side = THREE.DoubleSide;
  torso.add(new THREE.Mesh(geometry, capeMaterial));
}

function addHelmet(torso, armor) {
  const helmet = new THREE.Group();
  helmet.position.y = .606;
  torso.add(helmet);
  const shape = [[0, -.045],[.128, -.045],[.15, .012],[.15, .104],[.135, .176],[.104, .228],
    [.060, .261],[.020, .274],[0, .277]];
  const dome = new THREE.Mesh(new THREE.LatheGeometry(shape.map(([r,y])=>new THREE.Vector2(r,y)), 28), armor.steel);
  dome.scale.z = .98;
  helmet.add(dome);
  curvedPart(helmet, armor.mail, [.269, .139, .251], [0, -.038, .005]);
  frontPlate(helmet, armor.darkSteel, [
    [.159, .132, -.061, -.175],[.117, .147, -.067, -.220],[.019, .129, -.037, -.209],
    [-.041, .084, -.041, -.163],[-.060, .018, -.092, -.133],
  ]);
  frontPlate(helmet, armor.recess, [[.130, .126, -.081, -.206],[.112, .128, -.083, -.224]]);
  armorTrim(helmet, armor.edge, [[-.139, .144, -.063],[-.078, .147, -.148],[0, .152, -.202],
    [.078, .147, -.148],[.139, .144, -.063]], .005);
  armorTrim(helmet, armor.steel, [[0, .253, .062],[0, .278, -.005],[0, .250, -.080],[0, .191, -.133]], .006);
  for (const side of [-1, 1]) {
    curvedPart(helmet, armor.brass, [.021, .034, .034], [side*.148, .108, -.047]);
    armorTrim(helmet, armor.edge, [[side*.107, .179, .092],[side*.139, .087, .092],
      [side*.132, -.026, .052],[side*.094, -.043, -.073]], .005);
    for (let row=0; row<3; row++) {
      roundedPart(helmet, armor.recess, [.009, .021, .0025], [side*(.042+.019*row), .022, -.180+.012*row], .001);
    }
  }
}

export function createSurvivorBody() {
  const body = new THREE.Group();
  body.name = 'Armored soldier';
  const armor = armorMaterials();
  const upperBody = new THREE.Group();
  upperBody.position.y = .89;
  body.add(upperBody);

  roundedPart(upperBody, armor.mail, [.404, .516, .279], [0, .237, 0], .10);
  curvedPart(upperBody, armor.darkSteel, [.437, .439, .278], [0, .272, .025]);
  frontPlate(upperBody, armor.steel, [
    [.448, .138, -.061, -.136],[.399, .245, -.065, -.216],[.298, .230, -.097, -.238],
    [.193, .193, -.104, -.184],[.112, .176, -.101, -.156],
  ]);
  for (const side of [-1, 1]) {
    armorTrim(upperBody, armor.edge, [[side*.126, .444, -.080],[side*.220, .398, -.079],
      [side*.209, .308, -.125],[side*.160, .226, -.150]], .005);
    curvedPart(upperBody, armor.brass, [.025, .028, .018], [side*.153, .413, -.147]);
  }
  for (let i=0; i<3; i++) {
    curvedPart(upperBody, i % 2 ? armor.steel : armor.darkSteel, [.379-i*.015, .119, .289],
      [0, .163-i*.047, -.028]);
  }
  curvedPart(upperBody, armor.darkSteel, [.329, .115, .321], [0, .484, 0]);
  curvedPart(upperBody, armor.mail, [.209, .157, .209], [0, .529, 0]);
  roundedPart(upperBody, armor.leather, [.374, .060, .303], [0, .033, 0], .025);
  roundedPart(upperBody, armor.brass, [.088, .059, .022], [0, .032, -.155], .011);
  roundedPart(upperBody, armor.leather, [.049, .031, .013], [0, .032, -.172], .005);
  frontPlate(upperBody, armor.cloth, [[.014, .087, -.151, -.171],[-.214, .105, -.143, -.197],
    [-.325, .061, -.125, -.169],[-.364, .022, -.125, -.155]]);
  roundedPart(upperBody, armor.brass, [.043, .043, .008], [0, -.073, -.183], .003).rotation.z = Math.PI / 4;
  addCape(upperBody, armor.cloth);
  addHelmet(upperBody, armor);
=======
export function createSurvivorBody() {
  const body = new THREE.Group();
  body.name = 'Relay yard survivor';
  const cloth = new THREE.MeshStandardMaterial({ color: 0x626c46, roughness: .96 });
  const nylon = new THREE.MeshStandardMaterial({ color: 0x3a483c, roughness: .92 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x817552, roughness: .97 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x252c27, roughness: .83 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xbfc880, roughness: .72 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xc79b55, roughness: .33, metalness: .17 });

  roundedPart(body, cloth, [.44, .51, .29], [0, 1.13, 0], .07);
  roundedPart(body, nylon, [.37, .37, .10], [0, 1.16, -.14], .032);
  roundedPart(body, rubber, [.39, .075, .29], [0, .89, 0], .022);
  roundedPart(body, nylon, [.21, .10, .21], [0, 1.39, 0], .038);
  roundedPart(body, rubber, [.30, .30, .29], [0, 1.57, 0], .07);
  roundedPart(body, nylon, [.323, .20, .29], [0, 1.64, .021], .07);
  roundedPart(body, glass, [.251, .094, .063], [0, 1.588, -.13], .026);
  roundedPart(body, canvas, [.34, .39, .16], [0, 1.16, .209], .055);
  roundedPart(body, nylon, [.33, .092, .179], [0, 1.29, .212], .033);

  for (const side of [-1, 1]) {
    roundedPart(body, canvas, [.041, .35, .053], [side * .14, 1.21, -.191], .013);
    roundedPart(body, canvas, [.13, .122, .09], [side * .083, 1.105, -.207], .021);
    roundedPart(body, rubber, [.059, .137, .132], [side * .146, 1.578, .007], .024);
  }
  roundedPart(body, trim, [.10, .035, .012], [-.07, 1.259, -.199], .004);
>>>>>>> parent of 084d75d (f)

  const limbs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
<<<<<<< HEAD
    leg.position.set(side * .115, HIP_HEIGHT, 0);
    roundedPart(leg, armor.mail, [.181, .451, .194], [0, -.201, 0], .051);
    for (let row=0; row<3; row++) {
      const panel = roundedPart(leg, row % 2 ? armor.darkSteel : armor.steel, [.146, .080, .130],
        [side*.066, -.052-row*.061, -.066], .026);
      panel.rotation.y = -side * .53;
    }
    curvedPart(leg, armor.darkSteel, [.162, .224, .108], [0, -.253, -.059]);
    const shin = new THREE.Group();
    shin.position.y = -THIGH_LENGTH;
    roundedPart(shin, armor.leather, [.147, .379, .151], [0, -.157, .006], .044);
    frontPlate(shin, armor.steel, [[.025, .064, -.044, -.104],[-.070, .080, -.046, -.120],
      [-.231, .064, -.053, -.107],[-.339, .056, -.041, -.091]]);
    curvedPart(shin, armor.darkSteel, [.178, .145, .101], [0, .022, -.067]);
    curvedPart(shin, armor.steel, [.124, .103, .059], [0, .026, -.108]);
    armorTrim(shin, armor.edge, [[0, -.051, -.121],[0, -.154, -.118],[0, -.306, -.097]], .004);
    const foot = new THREE.Group();
    foot.position.y = -SHIN_LENGTH;
    roundedPart(foot, armor.leather, [.172, .111, .242], [0, .001, -.049], .032);
    roundedPart(foot, armor.recess, [.176, .025, .255], [0, -.047, -.050], .008);
    for (let row=0; row<3; row++) {
      curvedPart(foot, row % 2 ? armor.darkSteel : armor.steel, [.163-row*.013, .096-row*.011, .111],
        [0, .025-row*.008, -.035-row*.044]);
    }
    shin.add(foot);
    leg.add(shin);
    body.add(leg);

    const arm = new THREE.Group();
    arm.position.set(side * .255, .438, 0);
    roundedPart(arm, armor.mail, [.179, .269, .178], [side*.024, -.106, 0], .053);
    curvedPart(arm, armor.darkSteel, [.242, .158, .249], [side*.040, -.019, .009]);
    curvedPart(arm, armor.steel, [.222, .128, .215], [side*.042, .006, .003]);
    armorTrim(arm, armor.edge, [[side*.039, .010, -.109],[side*.134, -.036, -.065],
      [side*.151, -.049, .002],[side*.122, -.035, .084],[side*.041, .004, .112]], .004);
    for (let row=0; row<3; row++) {
      curvedPart(arm, row % 2 ? armor.darkSteel : armor.steel, [.195-row*.017, .090, .189-row*.013],
        [side*.046, -.075-row*.046, 0]);
    }
    const elbow = new THREE.Group();
    elbow.position.set(side*.025, -.233, -.018);
    curvedPart(elbow, armor.darkSteel, [.180, .123, .169], [side*.017, -.018, 0]);
    roundedPart(elbow, armor.recess, [.127, .239, .134], [0, -.111, -.008], .040);
    curvedPart(elbow, armor.steel, [.151, .209, .153], [side*.013, -.109, -.022]);
    armorTrim(elbow, armor.edge, [[side*.058, -.024, -.062],[side*.083, -.096, -.073],
      [side*.064, -.189, -.045]], .004);
    roundedPart(elbow, armor.darkSteel, [.125, .134, .132], [0, -.237, -.027], .035);
    roundedPart(elbow, armor.steel, [.091, .089, .036], [side*.016, -.225, .023], .016);
    arm.add(elbow);
    upperBody.add(arm);
    limbs.push({ leg, shin, foot, arm, elbow, side });
=======
    leg.position.set(side * .111, .869, 0);
    roundedPart(leg, nylon, [.186, .46, .202], [0, -.207, .003], .045);
    roundedPart(leg, nylon, [.158, .32, .171], [0, -.551, .019], .038);
    roundedPart(leg, rubber, [.131, .125, .077], [0, -.40, -.086], .025);
    roundedPart(leg, rubber, [.182, .18, .27], [0, -.756, -.037], .033);
    roundedPart(leg, canvas, [.184, .041, .272], [0, -.84, -.037], .008);
    body.add(leg);

    const arm = new THREE.Group();
    arm.position.set(side * .26, 1.34, 0);
    roundedPart(arm, cloth, [.177, .263, .182], [side * .019, -.113, .007], .055);
    roundedPart(arm, cloth, [.133, .231, .154], [side * .029, -.34, -.049], .039).rotation.x = .29;
    roundedPart(arm, rubber, [.124, .149, .146], [side * .03, -.475, -.088], .034);
    body.add(arm);
    limbs.push({ leg, arm, side });
>>>>>>> parent of 084d75d (f)

    if (side === 1) {
      const socket = new THREE.Group();
      socket.name = 'ItemSocket';
<<<<<<< HEAD
      socket.position.set(.005, -.198, -.073);
=======
      socket.position.set(.020, -.41, -.117);
>>>>>>> parent of 084d75d (f)
      socket.rotation.x = -.39;
      arm.add(socket);
    }
  }
  return { body, limbs };
}
