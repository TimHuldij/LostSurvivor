import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player.js';

test('player health initializes, takes valid damage and resets', () => {
  const player = new Player({ x: 1, y: 0, z: 2, yaw: 0 });
  assert.equal(player.health, 100);
  assert.equal(player.takeDamage(35), true);
  assert.equal(player.health, 65);
  assert.equal(player.takeDamage(Infinity), false);
  assert.equal(player.takeDamage(0), false);
  player.reset();
  assert.equal(player.health, 100);
});

test('player hitbox is centered above the feet', () => {
  const player = new Player({ x: 1, y: 0, z: 2, yaw: 0 });
  const hitbox = player.getHitbox();
  assert.ok(hitbox.containsPoint(new THREE.Vector3(1, .9, 2)));
  assert.equal(hitbox.min.y, 0);
});
