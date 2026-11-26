import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Door, DoorInteraction } from '../src/door.js';
import { Player } from '../src/player.js';

const dt = 1 / 120;

function setup(options = {}) {
  const scene = new THREE.Scene();
  const door = new Door(scene, { hinge: [0, 0, 0], minAngle: 0, maxAngle: 1.4, openingDirection: 1, ...options });
  const player = new Player({ x: .8, y: 0, z: 1.3, yaw: 0 });
  const interaction = new DoorInteraction([door], []);
  return { door, player, interaction };
}

function advance(interaction, player, seconds) {
  for (let i = 0; i < Math.round(seconds / dt); i++) interaction.step(dt, player);
}

test('one press opens and the next closes with a latch', () => {
  const { door, player, interaction } = setup();
  door.interact(player);
  assert.ok(door.target > 0);
  advance(interaction, player, 3);
  assert.ok(door.angle > 1.1);
  assert.equal(door.latched, false);
  door.interact(player);
  advance(interaction, player, 3);
  assert.equal(door.angle, 0);
  assert.equal(door.latched, true);
});

test('locked handles cannot open', () => {
  const events = [];
  const locked = setup({ locked: true, audio: { onEvent: event => events.push(event.type) } });
  locked.door.interact(locked.player);
  advance(locked.interaction, locked.player, .4);
  advance(locked.interaction, locked.player, 1);
  assert.equal(locked.door.angle, 0);
  assert.ok(events.includes('locked'));
});

test('a moving door cannot cross an obstacle or the player', () => {
  const { door, player, interaction } = setup();
  interaction.solids.push(new THREE.Box3(new THREE.Vector3(.55, 0, -.45), new THREE.Vector3(.95, 2, -.24)));
  door.interact(player);
  advance(interaction, player, 3);
  assert.ok(door.angle < .8);
  assert.equal(door.blocked, true);
  assert.equal(door.velocity, 0);
});

test('the door stops at the player without moving them or jittering', () => {
  const { door, player, interaction } = setup();
  player.position.set(.75, 0, -.58);
  const original = player.position.clone();
  door.interact(player);
  advance(interaction, player, 2);
  assert.equal(door.blocked, true);
  assert.equal(door.velocity, 0);
  const angle = door.angle;
  advance(interaction, player, 1);
  assert.equal(door.angle, angle);
  assert.ok(player.position.equals(original));
});

test('a rapid second press reverses the door instead of creating another motor', () => {
  const { door, player, interaction } = setup();
  door.interact(player);
  advance(interaction, player, .8);
  assert.ok(door.angle > .15);
  door.interact(player);
  advance(interaction, player, 2);
  assert.equal(door.angle, 0);
  assert.equal(door.latched, true);
});

test('two presses before the latch releases leave the door closed', () => {
  const { door, player, interaction } = setup();
  door.interact(player);
  advance(interaction, player, .04);
  door.interact(player);
  advance(interaction, player, 1);
  assert.equal(door.angle, 0);
  assert.equal(door.latched, true);
});

test('a slightly open door closes on the next press', () => {
  const { door, player, interaction } = setup();
  door.angle = .05;
  door.latched = false;
  door.updateTransform();
  door.interact(player);
  assert.equal(door.target, 0);
  advance(interaction, player, 2);
  assert.equal(door.angle, 0);
  assert.equal(door.latched, true);
});

test('a fast closing swing reaches the latch and emits a positional slam', () => {
  const events = [];
  const { door, player, interaction } = setup({
    audio: { onEvent: event => events.push(event) },
  });
  door.latched = false;
  door.angle = .18;
  door.velocity = -2.3;
  door.updateTransform();
  advance(interaction, player, .25);
  const slam = events.find(event => event.type === 'slam');
  assert.ok(slam);
  assert.ok(slam.intensity > .5 && slam.position.isVector3);
  assert.ok(slam.angularVelocity < -1.1);
  assert.equal(door.latched, true);
  assert.equal(door.angle, 0);
});

test('an unlatched door responds to a player pushing', () => {
  const { door, player } = setup();
  door.latched = false;
  const before = new THREE.Vector3(.7, 0, .45);
  player.position.set(.7, 0, .34);
  door.push(before, player);
  assert.ok(door.velocity > 0);
});

test('a two-way door chooses a direction away from the player', () => {
  for (const side of [-1, 1]) {
    const { door, player, interaction } = setup({ minAngle: -1.3, maxAngle: 1.3, openingDirection: 0 });
    player.position.z = side * 1.3;
    door.interact(player);
    advance(interaction, player, 2.5);
    assert.ok(door.angle * side > .9);
  }
});

test('door position remains close across fixed update rates', () => {
  const angles = [];
  for (const step of [1 / 60, 1 / 120, 1 / 240]) {
    const { door, player, interaction } = setup();
    door.interact(player);
    for (let i = 0; i < Math.round(1.5 / step); i++) interaction.step(step, player);
    angles.push(door.angle);
  }
  assert.ok(Math.max(...angles) - Math.min(...angles) < .025);
});

test('two nearby leaves stop on contact instead of passing through each other', () => {
  const scene = new THREE.Scene();
  const left = new Door(scene, { hinge: [0, 0, 0], minAngle: 0, maxAngle: 1.4, openingDirection: 1 });
  const right = new Door(scene, { hinge: [1.8, 0, -.5], yaw: Math.PI, minAngle: 0, maxAngle: 1.4 });
  const player = new Player({ x: .3, y: 0, z: 2, yaw: 0 });
  const interaction = new DoorInteraction([left, right], []);
  left.interact(player);
  advance(interaction, player, 2.5);
  assert.ok(left.blocked);
  assert.equal(left.velocity, 0);
  assert.ok(left.angle < 1.2);
});

test('aiming uses player reach and rejects doors hidden behind a wall', () => {
  const { door, player, interaction } = setup();
  const camera = new THREE.PerspectiveCamera(60, 1, .05, 100);
  camera.position.set(.8, 1.4, 5);
  camera.lookAt(.8, 1.1, 0);
  camera.updateMatrixWorld();
  assert.equal(interaction.focus(camera, player), door);
  interaction.solids.push(new THREE.Box3(new THREE.Vector3(0, 0, .6), new THREE.Vector3(1, 2, .7)));
  assert.equal(interaction.focus(camera, player), null);
  interaction.solids.length = 0;
  player.position.z = 10;
  assert.equal(interaction.focus(camera, player), null);
});
