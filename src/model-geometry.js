import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const sphere = new THREE.SphereGeometry(1, 18, 12);

export function roundedPart(parent, material, [width, height, depth], position, radius = .015) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 1, radius), material);
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

export function curvedPart(parent, material, [width, height, depth], position) {
  const mesh = new THREE.Mesh(sphere, material);
  mesh.position.set(...position);
  mesh.scale.set(width / 2, height / 2, depth / 2);
  parent.add(mesh);
  return mesh;
}

export function armorTrim(parent, material, points, radius = .007) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 16, radius, 6), material);
  parent.add(mesh);
  return mesh;
}
