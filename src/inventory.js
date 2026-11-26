import * as THREE from 'three';
import { Pistol } from './pistol.js';

const EMPTY = 1;
const GLOCK = 2;

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
    this.scene.add(fill, key, edge, this.pistol.root);
    this.reset();
  }

  get isPistol() { return this.slot === GLOCK; }
  get action() { return this.isPistol ? this.pistol.action : null; }
  get heldItem() {
    return this.isPistol ? this.pistol.worldModel : null;
  }

  reset() {
    this.pistol.reset();
    this.slot = null;
    this.select(EMPTY);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.update(0, 0);
  }

  select(slot) {
    if (slot === this.slot || (slot !== EMPTY && slot !== GLOCK)) return false;
    this.pistol.cancelAction();
    this.slot = slot;
    this.pistol.setEquipped(this.isPistol);
    this.update(0, 0);
    return true;
  }

  addLook(horizontal, vertical) {
    this.pistol.addLook(horizontal, vertical);
  }

  inspect() {
    if (this.isPistol) this.pistol.begin('inspect');
  }

  reload() {
    if (this.isPistol) this.pistol.begin('reload');
  }

  fire() {
    if (this.isPistol) this.pistol.fire();
  }

  update(delta, speed, aiming = false, obstructionDistance = Infinity) {
    this.pistol.setObstruction(obstructionDistance);
    this.pistol.update(delta, speed, this.camera.aspect, this.isPistol && aiming);
  }
}
