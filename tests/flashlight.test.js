import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Flashlight } from '../src/flashlight.js';

test('flashlight has an invisible-hand viewmodel, functional light and resettable state', () => {
  const scene = new THREE.Scene();
  const flashlight = new Flashlight(scene);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(1, 1.6, 2);
  camera.lookAt(1, 1.6, -4);
  camera.updateMatrixWorld();

  assert.equal(flashlight.use(), false);
  flashlight.setEquipped(true);
  flashlight.update(.1, 0);
  assert.equal(flashlight.viewModel.visible, true);
  assert.equal(flashlight.use(), true);
  flashlight.updateLight(camera, true);
  assert.equal(flashlight.light.visible, true);
  assert.ok(flashlight.target.position.z < camera.position.z);

  flashlight.setEquipped(false);
  flashlight.updateLight(camera, false);
  assert.equal(flashlight.light.visible, false);
  flashlight.reset();
  assert.equal(flashlight.isOn, false);
  assert.equal(flashlight.viewModel.visible, false);
});

test('flashlight honors reduced-motion preferences', () => {
  const flashlight = new Flashlight(new THREE.Scene(), true);
  flashlight.setEquipped(true);
  flashlight.update(1, 5);
  assert.ok(Math.abs(flashlight.viewModel.position.x - .36) < .001);
  assert.ok(Math.abs(flashlight.viewModel.position.z + .92) < .001);
});
