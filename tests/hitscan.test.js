import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { traceHitscan } from '../src/hitscan.js';

function target(z, health = 100) {
  return {
    health,
    getHitbox() {
      return new THREE.Box3(new THREE.Vector3(-.4, 0, z - .4), new THREE.Vector3(.4, 1.8, z + .4));
    },
  };
}

test('hitscan selects the nearest living target along the ray', () => {
  const near = target(-4);
  const far = target(-8);
  const dead = target(-2, 0);
  const hit = traceHitscan(new THREE.Vector3(0, .9, 0), new THREE.Vector3(0, 0, -1), [far, dead, near], []);
  assert.equal(hit.target, near);
  assert.ok(Math.abs(hit.distance - 3.6) < .001);
});

test('world or door boxes block hitscan targets behind them', () => {
  const victim = target(-6);
  const wall = new THREE.Box3(new THREE.Vector3(-1, 0, -3), new THREE.Vector3(1, 2, -2.8));
  assert.equal(
    traceHitscan(new THREE.Vector3(0, .9, 0), new THREE.Vector3(0, 0, -1), [victim], [wall]),
    null,
  );
  assert.equal(
    traceHitscan(new THREE.Vector3(0, .9, 0), new THREE.Vector3(0, 0, -1), [victim], []).target,
    victim,
  );
});
