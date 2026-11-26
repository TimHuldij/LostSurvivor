import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyGrenadeBlast, GrenadeItem, GrenadeProjectile } from '../src/grenade.js';
import { NavigationGrid } from '../src/navigation.js';
import { NPC } from '../src/npc.js';
import { GrenadePickup } from '../src/pickups.js';
import { Player } from '../src/player.js';

test('grenade charges launch once at the release window and cancel cleanly when holstered', () => {
  const grenade = new GrenadeItem(true);
  assert.equal(grenade.collect(3), 2);
  grenade.setEquipped(true);
  assert.equal(grenade.use(), true);
  assert.equal(grenade.use(), false);
  grenade.update(.2, 0);
  assert.equal(grenade.consumeThrow(), false);
  assert.equal(grenade.uses, 2);
  grenade.update(.13, 0);
  assert.equal(grenade.consumeThrow(), true);
  assert.equal(grenade.uses, 1);
  assert.equal(grenade.consumeThrow(), false);

  grenade.update(.4, 0);
  assert.equal(grenade.using, false);
  assert.equal(grenade.use(), true);
  grenade.update(.2, 0);
  grenade.setEquipped(false);
  assert.equal(grenade.consumeThrow(), false);
  assert.equal(grenade.uses, 1);
  grenade.reset();
  assert.equal(grenade.uses, 0);
  grenade.collect(1);
  grenade.setEquipped(true);
  assert.equal(grenade.use(), true);
  grenade.update(.8, 0);
  assert.equal(grenade.consumeThrow(), true);
  assert.equal(grenade.uses, 0);
});

test('grenade pickup respects capacity and restores its stock on reset', () => {
  const grenade = new GrenadeItem();
  grenade.collect(1);
  const pickup = new GrenadePickup(new THREE.Scene(), [1, 0, 2], { amount: 2 });
  assert.equal(pickup.collect({ grenade }), 1);
  assert.equal(grenade.uses, 2);
  assert.equal(pickup.amount, 1);
  grenade.reset();
  assert.equal(pickup.collect({ grenade }), 1);
  assert.equal(pickup.root.visible, false);
  pickup.reset();
  assert.equal(pickup.amount, 2);
});

test('grenade projectile collides with blockers, detonates on fuse and cleans up', () => {
  const scene = new THREE.Scene();
  const wall = new THREE.Box3(
    new THREE.Vector3(-1, 0, -.6),
    new THREE.Vector3(1, 2, -.5),
  );
  const grenade = new GrenadeProjectile(
    scene,
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, -10),
    .2,
  );
  grenade.step(.1, [wall]);
  assert.ok(grenade.position.z > -.5);
  let detonated = false;
  for (let i = 0; i < 80 && grenade.alive; i++) {
    const justDetonated = grenade.step(1 / 120, []);
    detonated ||= justDetonated;
  }
  assert.equal(detonated, true);
  assert.equal(grenade.alive, false);
  assert.equal(scene.children.length, 0);
});

test('grenade blast damages exposed targets and leaves targets behind walls unharmed', () => {
  const exposed = new Player({ x: 0, y: 0, z: -1 });
  const blocked = new Player({ x: 0, y: 0, z: -3 });
  const attacker = { position: new THREE.Vector3(2, 0, 2) };
  const npc = new NPC(new THREE.Scene(), new NavigationGrid([], {
    minX: -4, maxX: 4, minZ: -4, maxZ: 4, cellSize: .5,
  }), {
    position: [1, 0, -1], route: [[1, 0, -1]],
  });
  const wall = new THREE.Box3(
    new THREE.Vector3(-1, 0, -1.7),
    new THREE.Vector3(1, 2, -1.4),
  );

  const hits = applyGrenadeBlast(
    new THREE.Vector3(0, .15, 0),
    [exposed, blocked, npc],
    [wall],
    attacker,
  );
  assert.equal(hits.length, 2);
  assert.equal(hits[0].target, exposed);
  assert.ok(exposed.health < 100);
  assert.equal(blocked.health, 100);
  assert.ok(npc.health < 100);
  assert.equal(npc.disposition, 'hostile');
});
