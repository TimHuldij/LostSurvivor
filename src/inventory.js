import * as THREE from 'three';
import { Pistol } from './pistol.js';
import { createRifleModel } from './rifle-model.js';

const EMPTY = 1;
const GLOCK = 2;
const RIFLE = 3;

export class Inventory {
  constructor(reducedMotion) {
    this.reducedMotion = reducedMotion;
    this.camera = new THREE.PerspectiveCamera(56, 1, .035, 8);
    this.scene = new THREE.Scene();
    const fill = new THREE.HemisphereLight(0xe4eddd, 0x676d53, 2.4);
    const key = new THREE.DirectionalLight(0xffe0aa, 2.5);
    key.position.set(-2, 4, 2);
    const edge = new THREE.DirectionalLight(0xd7e6ff, 1.7);
    edge.position.set(2.5, 2, -3.2);

    this.pistol = new Pistol(reducedMotion);
    this.rifle = new Pistol(reducedMotion, { model: createRifleModel, capacity: 30, shotInterval: .1, reserve: 90 });
    this.rifle.flash.position.set(0, .04, -1.12);
    this.fireMode = 'auto';
    this.scene.add(fill, key, edge, this.pistol.root, this.rifle.root);
    this.reset();
  }

  get isPistol() { return this.slot === GLOCK; }
  get activeWeapon() { return this.slot === GLOCK ? this.pistol : this.slot === RIFLE ? this.rifle : null; }
  get action() { return this.activeWeapon?.action ?? null; }
  get heldItem() {
    return this.activeWeapon?.worldModel ?? null;
  }

  reset() {
    this.pistol.reset();
    this.rifle.reset();
    this.fireMode = 'auto';
    this.slot = null;
    this.select(EMPTY);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.update(0, 0);
  }

  select(slot) {
    if (slot === this.slot || (slot !== EMPTY && slot !== GLOCK && slot !== RIFLE)) return false;
    this.activeWeapon?.cancelAction();
    this.slot = slot;
    this.pistol.setEquipped(this.isPistol);
    this.rifle.setEquipped(slot === RIFLE);
    this.update(0, 0);
    return true;
  }

  addLook(horizontal, vertical) {
    this.activeWeapon?.addLook(horizontal, vertical);
  }

  inspect() {
    this.activeWeapon?.begin('inspect');
  }

  reload() {
    this.activeWeapon?.begin('reload');
  }

  fire() {
    return this.activeWeapon?.fire() ?? false;
  }

  update(delta, speed, aiming = false, obstructionDistance = Infinity) {
    for (const weapon of [this.pistol, this.rifle]) {
      weapon.setObstruction(obstructionDistance);
      weapon.update(delta, speed, this.camera.aspect, weapon === this.activeWeapon && aiming);
    }
  }
}
