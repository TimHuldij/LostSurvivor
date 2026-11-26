import * as THREE from 'three';
import { roundedPart } from './model-geometry.js';

// Procedural rifle in the same viewmodel coordinates as the pistol.
export function createRifleModel() {
  const body = new THREE.Group();
  body.name = 'AK rifle';
  const upper = new THREE.Group();
  const magazine = new THREE.Group();
  body.add(upper, magazine);
  const steel = new THREE.MeshStandardMaterial({ color: 0x303535, metalness: .7, roughness: .5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x202525, metalness: .5, roughness: .66 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x66452d, metalness: .04, roughness: .82 });
  const part = (parent, material, size, position, bevel = .012) => roundedPart(parent, material, size, position, bevel);
  part(body, steel, [.13, .16, .46], [0, .02, -.13]);
  part(upper, steel, [.12, .07, .39], [0, .135, -.14]);
  part(body, wood, [.14, .15, .34], [0, -.02, -.53]);
  part(body, wood, [.14, .12, .37], [0, .02, .30]).rotation.x = -.14;
  part(body, dark, [.08, .28, .11], [0, -.20, .09]).rotation.x = -.18;
  part(body, steel, [.055, .055, .40], [0, .02, -.88], .008);
  part(body, dark, [.075, .08, .085], [0, .03, -1.07], .008);
  part(upper, dark, [.035, .08, .035], [0, .13, -.91], .004);
  part(upper, dark, [.06, .035, .06], [0, .18, -.05], .004);
  for (let i = 0; i < 4; i++) {
    part(body, steel, [.015, .015, .28], [i % 2 ? .075 : -.075, .035 + Math.floor(i / 2) * .04, -.53], .003);
  }
  const mag = part(magazine, dark, [.11, .31, .16], [0, -.23, -.20]);
  mag.rotation.x = -.28;
  part(magazine, steel, [.115, .025, .17], [0, -.38, -.16], .005).rotation.x = -.28;
  return { body, upper, magazine };
}
