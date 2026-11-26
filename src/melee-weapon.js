import * as THREE from 'three';
import { EquippableItem } from './equippable-item.js';

function createMeleeModel() {
  const model = new THREE.Group();
  const grip = new THREE.MeshStandardMaterial({ color: 0x554331, roughness: .86 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x92988b, roughness: .35, metalness: .72 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .17, 8), grip);
  handle.rotation.x = -Math.PI / 2;
  handle.position.z = -.02;
  model.add(handle);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(.13, .025, .035), metal);
  guard.position.z = -.12;
  model.add(guard);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(.052, .018, .22), metal);
  blade.position.z = -.245;
  model.add(blade);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return model;
}

export class MeleeWeapon extends EquippableItem {
  constructor(reducedMotion = false) {
    const viewModel = createMeleeModel();
    const worldModel = viewModel.clone(true);
    worldModel.scale.setScalar(.58);
    super({
      worldModel,
      viewModel,
      restPosition: [.39, -.22, -.82],
      restRotation: [-.08, -.12, -.18],
      equipOffset: [0, -.38, .2],
      walkSway: .014,
      idleSway: .002,
      useDuration: .56,
      reducedMotion,
    });
    this.hitTime = .25;
    this.hitPending = false;
  }

  reset() {
    super.reset();
    this.hitPending = false;
  }

  setEquipped(equipped) {
    super.setEquipped(equipped);
    if (!equipped) this.hitPending = false;
  }

  use() {
    if (!this.beginUse()) return false;
    this.hitPending = false;
    return true;
  }

  update(delta, speed, aspect = 1.38) {
    const previousElapsed = this.useElapsed;
    const wasUsing = this.using;
    super.update(delta, speed, aspect);
    if (wasUsing && this.using && previousElapsed < this.hitTime && this.useElapsed >= this.hitTime) {
      this.hitPending = true;
    }

    if (this.viewModel.visible) {
      const progress = this.using ? this.useElapsed / this.useDuration : 0;
      const swing = Math.sin(Math.PI * progress);
      this.viewModel.rotation.x -= swing * .72;
      this.viewModel.rotation.z += swing * .34;
    }
  }

  consumeStrike() {
    const pending = this.hitPending;
    this.hitPending = false;
    return pending;
  }
}
