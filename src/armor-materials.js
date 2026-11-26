import * as THREE from 'three';

function surfaceTexture(sample) {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = sample(x, y);
      pixels[i + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

let materials;

export function armorMaterials() {
  if (materials) return materials;
  const worn = surfaceTexture((x, y) => {
    const grain = ((Math.imul(x + 31, 1376312589) ^ Math.imul(y + 17, 83492791)) >>> 21) & 31;
    const brushing = Math.sin(y * 1.7 + x * .014) * 7;
    const patches = Math.sin(x * .18 + y * .09) * Math.sin(y * .31) * 15;
    const scratch = (y * 37 + (x >> 4) * 13) % 111 < 2 ? 27 : 0;
    return THREE.MathUtils.clamp(196 + grain + brushing + patches + scratch, 0, 255);
  });
  const links = surfaceTexture((x, y) => {
    const row = Math.floor(y / 8);
    const dx = ((x + (row % 2) * 6) % 12 - 6) / 5;
    const dy = (y % 8 - 4) / 3.7;
    const edge = Math.hypot(dx, dy);
    return edge > .66 && edge < 1.13 ? (dy < 0 ? 198 : 123) : 68;
  });
  materials = {
    steel: new THREE.MeshStandardMaterial({ color: 0x627281, map: worn, metalness: .47, roughness: .42 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3a4a59, map: worn, metalness: .44, roughness: .53 }),
    edge: new THREE.MeshStandardMaterial({ color: 0xa5b2b8, map: worn, metalness: .48, roughness: .38 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb39a61, map: worn, metalness: .54, roughness: .45 }),
    mail: new THREE.MeshStandardMaterial({ color: 0x8d99a0, map: links, metalness: .26, roughness: .68 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x302626, roughness: .91 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x502029, map: worn, roughness: .95 }),
    recess: new THREE.MeshStandardMaterial({ color: 0x12191e, roughness: .93 }),
  };
  return materials;
}
