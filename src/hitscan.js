import * as THREE from 'three';

export function traceHitscan(origin, direction, targets, blockers) {
  const ray = new THREE.Ray(origin, direction.clone().normalize());
  const hit = new THREE.Vector3();
  let distance = Infinity;
  let target = null;
  let point = null;

  for (const box of blockers) {
    const intersection = ray.intersectBox(box, hit);
    if (intersection) distance = Math.min(distance, origin.distanceTo(intersection));
  }

  for (const candidate of targets) {
    if (candidate.health <= 0) continue;
    const intersection = ray.intersectBox(candidate.getHitbox(), hit);
    if (!intersection) continue;
    const candidateDistance = origin.distanceTo(intersection);
    if (candidateDistance < distance) {
      distance = candidateDistance;
      target = candidate;
      point = intersection.clone();
    }
  }

  return target ? { target, point, distance } : null;
}
