import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Door } from '../src/door.js';
import { NavigationGrid } from '../src/navigation.js';
import { NPC } from '../src/npc.js';
import { Player } from '../src/player.js';

function survivor() {
  const navigation = new NavigationGrid([], { minX: -5, maxX: 5, minZ: -5, maxZ: 5, cellSize: .5 });
  return new NPC(new THREE.Scene(), navigation, { position: [0, 0, 0], route: [[0, 0, 0], [0, 0, 3]] });
}

test('survivor investigates audible noise but ignores distant or occluded noise', () => {
  const npc = survivor();
  assert.equal(npc.hear(new THREE.Vector3(0, 0, 9), 8), false);
  const wall = new THREE.Box3(new THREE.Vector3(-1, 0, 1), new THREE.Vector3(1, 3, 1.2));
  assert.equal(npc.hear(new THREE.Vector3(0, 0, 5), 8, [wall]), false);
  assert.equal(npc.hear(new THREE.Vector3(0, 0, 2), 8, [wall]), true);
  assert.equal(npc.state, 'investigate');
  assert.ok(npc.path.length);
});

test('investigation returns to patrol and reset restores spawn', () => {
  const npc = survivor();
  npc.hear(new THREE.Vector3(0, 0, 2), 8);
  for (let i = 0; i < 800; i++) npc.update(1 / 120);
  assert.equal(npc.state, 'patrol');
  npc.reset();
  assert.deepEqual(npc.root.position.toArray(), [0, 0, 0]);
  assert.equal(npc.state, 'patrol');
});

test('closed door blocks travel and is requested once while opening', () => {
  const npc = survivor();
  npc.wait = 0;
  npc.path = [new THREE.Vector3(0, 0, 2)];
  let interactions = 0;
  const door = { segments: [new THREE.Box3(new THREE.Vector3(-1, 0, .4), new THREE.Vector3(1, 2, .5))],
    locked: false, latched: true, target: null, angle: 0, interact() { interactions++; this.latched = false; this.target = 1; } };
  for (let i = 0; i < 120; i++) npc.update(1 / 120, [door]);
  assert.equal(interactions, 1);
  assert.ok(npc.root.position.z < .11);
});

test('survivor crosses an unlocked door after opening it', () => {
  const scene = new THREE.Scene();
  const navigation = new NavigationGrid([], { minX: -4, maxX: 4, minZ: -3, maxZ: 5, cellSize: .25 });
  const npc = new NPC(scene, navigation, {
    position: [0, 0, 0], route: [[0, 0, 0], [0, 0, 3]],
  });
  const door = new Door(scene, {
    hinge: [-.55, 0, 1.5], width: 1.1, minAngle: -1.48, maxAngle: 1.48,
    openingDirection: 0,
  });
  const remotePlayer = { position: new THREE.Vector3(3, 0, -3) };
  for (let i = 0; i < 1800 && npc.root.position.z < 2.8; i++) {
    door.step(1 / 120, remotePlayer, []);
    npc.update(1 / 120, [door]);
  }
  assert.ok(door.angle < -.8);
  assert.ok(npc.root.position.z > 2.8);
});

test('pathfinding detours around dynamic locked-door obstacles', () => {
  const navigation = new NavigationGrid([], {
    minX: -4, maxX: 4, minZ: -4, maxZ: 4, cellSize: .25,
  });
  const closedDoor = new THREE.Box3(
    new THREE.Vector3(-.6, 0, -.08), new THREE.Vector3(.6, 2.35, .08),
  );
  const path = navigation.findPath(new THREE.Vector3(0, 0, -2), new THREE.Vector3(0, 0, 2), [closedDoor]);
  assert.ok(path.length > 16);
  assert.ok(path.some(point => Math.abs(point.x) > .9));
});

test('damage cannot revive a dead survivor and reset restores health', () => {
  const npc = survivor();
  assert.equal(npc.takeDamage(40), true);
  assert.equal(npc.health, 60);
  npc.takeDamage(100);
  assert.equal(npc.state, 'dead');
  assert.equal(npc.takeDamage(10), false);
  assert.equal(npc.hear(new THREE.Vector3(0, 0, 1), 8), false);
  npc.reset();
  assert.equal(npc.health, 100);
  assert.equal(npc.state, 'patrol');
});

test('hostile vision respects range, facing and world occlusion', () => {
  const npc = new NPC(new THREE.Scene(), new NavigationGrid([], {
    minX: -5, maxX: 5, minZ: -5, maxZ: 8, cellSize: .5,
  }), {
    position: [0, 0, 0], yaw: Math.PI, route: [[0, 0, 0]],
    disposition: 'hostile', visionRange: 8,
  });
  const player = new Player({ x: 0, y: 0, z: 5, yaw: 0 });
  assert.equal(npc.canSee(player), true);

  const wall = new THREE.Box3(new THREE.Vector3(-1, 0, 2), new THREE.Vector3(1, 3, 2.2));
  assert.equal(npc.canSee(player, [wall]), false);
  player.position.z = -4;
  assert.equal(npc.canSee(player), false);
  player.position.z = 10;
  assert.equal(npc.canSee(player), false);
});

test('hostile attacks apply damage on cadence and stop behind blockers', () => {
  const npc = new NPC(new THREE.Scene(), new NavigationGrid([], {
    minX: -5, maxX: 5, minZ: -5, maxZ: 8, cellSize: .5,
  }), {
    position: [0, 0, 0], yaw: Math.PI, route: [[0, 0, 0]],
    disposition: 'hostile', weapon: { damage: 20, range: 8, interval: .5 },
  });
  const player = new Player({ x: 0, y: 0, z: 4, yaw: 0 });
  npc.update(.01, [], player);
  assert.equal(player.health, 80);
  npc.update(.49, [], player);
  assert.equal(player.health, 80);
  npc.update(.02, [], player);
  assert.equal(player.health, 60);

  player.reset();
  player.position.z = 4;
  const wall = new THREE.Box3(new THREE.Vector3(-1, 0, 2), new THREE.Vector3(1, 3, 2.2));
  npc.update(1, [], player, [wall]);
  assert.equal(player.health, 100);
});

test('a closed door blocks hostile sight and attacks', () => {
  const scene = new THREE.Scene();
  const npc = new NPC(scene, new NavigationGrid([], {
    minX: -5, maxX: 5, minZ: -5, maxZ: 5, cellSize: .5,
  }), {
    position: [0, 0, 0], route: [[0, 0, 0]], disposition: 'hostile',
  });
  const player = new Player({ x: 0, y: 0, z: -4, yaw: 0 });
  const door = new Door(scene, {
    hinge: [-.55, 0, -2], width: 1.1, minAngle: -1.48, maxAngle: 1.48,
  });

  assert.equal(npc.canSee(player, door.segments), false);
  npc.update(.1, [door], player, door.segments);
  assert.equal(player.health, 100);
});

test('taking damage turns a neutral survivor hostile and reset restores disposition', () => {
  const npc = survivor();
  const player = new Player({ x: 0, y: 0, z: 2, yaw: 0 });
  assert.equal(npc.takeDamage(25, player), true);
  assert.equal(npc.disposition, 'hostile');
  assert.ok(npc.weaponModel.visible);
  npc.reset();
  assert.equal(npc.disposition, 'neutral');
  assert.equal(npc.weaponModel.visible, false);
});
