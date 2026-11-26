import * as THREE from 'three';
import { Pistol } from './pistol.js';
import { alignSleeve, createViewmodelArms } from './viewmodel-arms.js';

const HANDS = 1;
const GLOCK = 2;
const PALMS = {
  ready: [
    [[-.425, -.263, -1.035], [-.36, -.45, -.44], .93],
    [[.425, -.268, -1.025], [-.37, .46, .46], .94],
  ],
  inspect: [
    [[-.385, -.105, -1.04], [.14, -.29, -.28], .07],
    [[.39, -.081, -1.03], [.15, .34, .26], .05],
  ],
};

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

    this.freeHands = new THREE.Group();
    const { leftHand, rightHand, leftSleeve, rightSleeve, curlLeft, curlRight } = createViewmodelArms(false);
    this.freeHands.add(leftHand, rightHand, leftSleeve, rightSleeve);
    this.arms = [
      { hand: leftHand, sleeve: leftSleeve, curl: curlLeft, elbow: new THREE.Vector3(-.66, -.73, -.56) },
      { hand: rightHand, sleeve: rightSleeve, curl: curlRight, elbow: new THREE.Vector3(.66, -.73, -.56) },
    ];
    for (const { sleeve } of this.arms) sleeve.scale.set(1.43, 1, 1.43);
    this.wrist = new THREE.Vector3();
    this.scene.add(fill, key, edge, this.pistol.root, this.freeHands);
    this.reset();
  }

  get isPistol() { return this.slot === GLOCK; }
  get action() {
    if (this.isPistol) return this.pistol.action;
    return this.inspectTime === null ? null : 'inspect';
  }
  get heldItem() {
    return this.isPistol ? this.pistol.worldModel : null;
  }

  reset() {
    this.pistol.reset();
    this.slot = null;
    this.stride = 0;
    this.select(HANDS);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.update(0, 0);
  }

  select(slot) {
    if (slot === this.slot || (slot !== HANDS && slot !== GLOCK)) return false;
    this.pistol.cancelAction();
    this.slot = slot;
    this.inspectTime = null;
    this.equipTime = 0;
    this.pistol.root.visible = this.isPistol;
    this.freeHands.visible = !this.isPistol;
    this.update(0, 0);
    return true;
  }

  inspect() {
    if (this.isPistol) {
      this.pistol.begin('inspect');
    } else if (this.inspectTime === null) {
      this.inspectTime = 0;
    }
  }

  reload() {
    if (this.isPistol) this.pistol.begin('reload');
  }

  fire() {
    if (this.isPistol) this.pistol.fire();
  }

  update(delta, speed) {
    const aspect = this.camera.aspect;
    if (this.isPistol) {
      this.pistol.update(delta, speed, aspect);
      return;
    }

    const { clamp, lerp, smoothstep } = THREE.MathUtils;
    this.equipTime = Math.min(this.equipTime + delta, .22);
    if (this.inspectTime !== null) {
      this.inspectTime += delta;
      if (this.inspectTime >= 1.78) this.inspectTime = null;
    }
    const time = this.inspectTime ?? 0;
    const inspect = smoothstep(time, 0, .40) * (1 - smoothstep(time, 1.12, 1.78));
    this.stride += delta * speed * 2.6;
    const move = this.reducedMotion ? 0 : Math.min(speed / 5, 1) * (1 - inspect);
    const enter = this.reducedMotion ? 0 : .145 * (1 - smoothstep(this.equipTime, 0, .22));
    const width = clamp(aspect / 1.42, .56, 1.08);

    this.arms.forEach(({ hand, sleeve, elbow, curl }, index) => {
      const [from, angles, grip] = PALMS.ready[index];
      const [to, targetAngles, open] = PALMS.inspect[index];
      const side = index === 0 ? -1 : 1;
      hand.position.set(
        width * lerp(from[0], to[0], inspect) + Math.sin(this.stride) * move * .015,
        lerp(from[1], to[1], inspect) + side * Math.cos(this.stride) * move * .015 - enter,
        lerp(from[2], to[2], inspect),
      );
      hand.rotation.set(
        lerp(angles[0], targetAngles[0], inspect),
        lerp(angles[1], targetAngles[1], inspect),
        lerp(angles[2], targetAngles[2], inspect),
        'YXZ',
      );
      curl(lerp(grip, open, inspect));
      alignSleeve(sleeve, elbow, hand, this.wrist.set(0, -.163, -.007));
    });
  }
}
