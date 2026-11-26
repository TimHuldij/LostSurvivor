import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function roundedPart(parent, material, [width, height, depth], position, radius = .015) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 1, radius), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}
