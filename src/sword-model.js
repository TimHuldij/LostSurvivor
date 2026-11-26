import * as THREE from 'three';
import { armorMaterials } from './armor-materials.js';
import { armorTrim, curvedPart, roundedPart } from './model-geometry.js';

export function createSwordModel() {
  const sword = new THREE.Group();
  sword.name = 'Steel longsword';
  const armor = armorMaterials();
  const sections = [
    [.127, .051, .014], [.240, .056, .014], [.775, .045, .010],
    [.994, .028, .006], [1.117, .0008, .0008],
  ];
  const positions = [];
  const vertexColors = [];
  const light = new THREE.Color(0xb0c0c9);
  const shadow = new THREE.Color(0x566777);
  const color = new THREE.Color();
  for (let section = 1; section < sections.length; section++) {
    for (let face = 0; face < 4; face++) {
      const pairs = [[section - 1, face], [section - 1, (face + 1) % 4],
        [section, face], [section, face], [section - 1, (face + 1) % 4], [section, (face + 1) % 4]];
      for (const [row, corner] of pairs) {
        const [y, width, depth] = sections[row];
        positions.push([width, 0, -width, 0][corner], y, [0, -depth, 0, depth][corner]);
        color.copy(corner % 2 ? shadow : light);
        color.multiplyScalar(face === 1 || face === 3 ? .85 : 1);
        vertexColors.push(color.r, color.g, color.b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  geometry.computeVertexNormals();
  const bladeMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, metalness: .48, roughness: .33, side: THREE.DoubleSide,
  });
  sword.add(new THREE.Mesh(geometry, bladeMaterial));

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.029, .025, .204, 12), armor.leather);
  grip.position.y = .002;
  grip.scale.z = .84;
  sword.add(grip);
  for (let wrap = 0; wrap < 7; wrap++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.027, .0036, 6, 14),
      wrap % 2 ? armor.leather : armor.darkSteel);
    band.rotation.x = Math.PI / 2;
    band.scale.y = .85;
    band.position.y = -.075 + wrap * .025;
    sword.add(band);
  }

  roundedPart(sword, armor.darkSteel, [.115, .046, .062], [0, .119, 0], .014);
  armorTrim(sword, armor.brass, [[-.165, .138, 0],[-.106, .102, -.009],[0, .112, 0],
    [.106, .102, -.009],[.165, .138, 0]], .014);
  for (const side of [-1, 1]) {
    curvedPart(sword, armor.steel, [.047, .034, .036], [side*.157, .137, 0]);
    roundedPart(sword, armor.brass, [.041, .042, .013], [0, .123,side*.033], .005).rotation.z = Math.PI / 4;
  }
  curvedPart(sword, armor.darkSteel, [.096, .088, .060], [0, -.127, 0]);
  curvedPart(sword, armor.brass, [.062, .067, .067], [0, -.126, 0]);
  return sword;
}
