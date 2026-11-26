import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MedicalItem } from '../src/medical-item.js';
import { MedicalPickup } from '../src/pickups.js';
import { Player } from '../src/player.js';

test('medkit charges heal only missing health and prevent overlapping use', () => {
  const player = new Player({ x: 0, y: 0, z: 0, yaw: 0 });
  const medkit = new MedicalItem();
  assert.equal(medkit.collect(3), 2);
  assert.equal(medkit.uses, 2);
  assert.equal(medkit.use(player), false);

  player.takeDamage(70);
  medkit.setEquipped(true);
  assert.equal(medkit.use(player), true);
  assert.equal(player.health, 70);
  assert.equal(medkit.uses, 1);
  assert.equal(medkit.use(player), false);
  medkit.update(1, 0);
  assert.equal(medkit.using, false);

  assert.equal(medkit.use(player), true);
  assert.equal(player.health, 100);
  assert.equal(medkit.uses, 0);
  assert.equal(medkit.use(player), false);
});

test('medical pickups respect item capacity and reset cleanly', () => {
  const item = new MedicalItem();
  item.collect(1);
  const pickup = new MedicalPickup(new THREE.Scene(), [1, 0, 2], { amount: 2 });
  assert.equal(pickup.collect({ medical: item }), 1);
  assert.equal(item.uses, 2);
  assert.equal(pickup.amount, 1);
  item.reset();
  assert.equal(pickup.collect({ medical: item }), 1);
  assert.equal(pickup.root.visible, false);
  pickup.reset();
  assert.equal(pickup.amount, 2);
  assert.equal(pickup.root.visible, true);
});

test('player healing is capped and cannot revive a downed player', () => {
  const player = new Player({ x: 0, y: 0, z: 0, yaw: 0 });
  player.takeDamage(25);
  assert.equal(player.heal(40), 25);
  assert.equal(player.health, 100);
  player.takeDamage(100);
  assert.equal(player.heal(50), 0);
  assert.equal(player.health, 0);
});
