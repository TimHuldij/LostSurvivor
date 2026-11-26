import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AmmoPickup } from '../src/pickups.js';

test('ammunition pickups respect reserve limits, retain leftovers, and reset', () => {
  const pickup = new AmmoPickup(new THREE.Scene(), [0, 0, 0], { amount: 30, limit: 100 });
  const inventory = { rifle: { reserve: 90 } };
  assert.equal(pickup.collect(inventory), 10);
  assert.equal(inventory.rifle.reserve, 100);
  assert.equal(pickup.amount, 20);
  assert.equal(pickup.collect(inventory), 0);
  inventory.rifle.reserve = 50;
  assert.equal(pickup.collect(inventory), 20);
  assert.equal(pickup.root.visible, false);
  assert.equal(pickup.collect(inventory), 0);
  pickup.reset();
  assert.equal(pickup.amount, 30);
  assert.equal(pickup.root.visible, true);
});

test('pickups require aim, reach and unobstructed sight', () => {
  const pickup = new AmmoPickup(new THREE.Scene(), [0, 0, -2]);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, .13, 0);
  camera.updateMatrixWorld();
  const player = { position: new THREE.Vector3() };
  assert.equal(pickup.focus(camera, player, []), true);
  assert.equal(pickup.focus(camera, player, [new THREE.Box3(new THREE.Vector3(-1, 0, -1.1), new THREE.Vector3(1, 2, -.9))]), false);
  player.position.z = 2;
  assert.equal(pickup.focus(camera, player, []), false);
});
