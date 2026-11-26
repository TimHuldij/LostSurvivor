import * as THREE from 'three';
import { PistolAudio } from './pistol-audio.js';
import { createPistolModel } from './pistol-model.js';
import { createViewmodelArms } from './viewmodel-arms.js';

const CAPACITY = 15;
const SHOT_INTERVAL = .19;
const UP = new THREE.Vector3(0, 1, 0);
const REST = [.39, -.158, -1.31];
const HOLD = [.055, .17, -.065];
const SUPPORT = [-.074, -.263, .042];
const SUPPORT_GRIP = [.17, .34, -.21];
const ZERO = [0, 0, 0];

// Each animation samples the weapon pose and accessory poses from the same clock.
const ACTIONS = {
  reload: {
    duration: 1.46,
    cues: [[.10, 'cloth'], [.30, 'release'], [.56, 'swap'], [.94, 'seat'], [1.22, 'settle']],
    weapon: [
      [0, REST, HOLD],
      [.26, [.20, -.048, -1.24], [.13, 1.07, -.37]],
      [.58, [.23, -.058, -1.29], [.18, 1.16, -.39]],
      [.89, [.20, -.019, -1.24], [.09, .97, -.43]],
      [1.00, [.20, -.014, -1.22], [.06, .86, -.34]],
      [1.16, [.26, -.17, -1.15], [.14, .51, -.21]],
      [1.46, REST, HOLD],
    ],
    magazine: [
      [0, ZERO, ZERO], [.28, ZERO, ZERO],
      [.55, [.05, -.37, .16], [.43, -.21, .38]],
      [.65, [-.23, -.33, .17], [-.21, .22, -.36]],
      [.80, [-.065, -.16, .045], [-.105, .11, -.18]],
      [.94, ZERO, ZERO], [1.46, ZERO, ZERO],
    ],
    support: [
      [0, SUPPORT, SUPPORT_GRIP],
      [.27, [-.105, -.32, .105], [-.24, .22, -.14]],
      [.55, [-.012, -.68, .25], [-.22, .28, -.38]],
      [.65, [-.28, -.64, .27], [-.22, .28, -.43]],
      [.81, [-.12, -.492, .15], [-.18, .29, -.27]],
      [.94, [-.068, -.332, .105], [-.12, .21, -.24]],
      [1.16, [-.122, -.255, .035], [.10, .12, -.14]],
      [1.46, SUPPORT, SUPPORT_GRIP],
    ],
  },
  inspect: {
    duration: 2.18,
    cues: [[.22, 'cloth'], [1.16, 'cloth']],
    weapon: [
      [0, REST, HOLD],
      [.38, [.08, -.05, -1.03], [.06, 1.38, -.36]],
      [.83, [.07, -.044, -1.02], [.14, 1.68, -.39]],
      [1.19, [.12, -.09, -1.11], [-.36, .85, .34]],
      [1.58, [.14, -.10, -1.10], [-.42, .65, .28]],
      [2.18, REST, HOLD],
    ],
    support: [
      [0, SUPPORT, SUPPORT_GRIP],
      [.32, [-.15, -.37, -.08], [-.20, .13, -.14]],
      [.75, [-.13, -.27, -.125], [.10, .18, -.16]],
      [1.19, [-.22, -.36, -.13], [-.27, .22, .24]],
      [1.58, [-.15, -.27, -.10], [-.12, .22, .11]],
      [2.18, SUPPORT, SUPPORT_GRIP],
    ],
  },
};

function pose(node, [x, y, z], [pitch, yaw, roll]) {
  node.position.set(x, y, z);
  node.rotation.set(pitch, yaw, roll, 'YXZ');
}

function samplePose(node, keyframes, time) {
  const index = keyframes.findIndex(([stamp]) => time < stamp);
  if (index < 0) {
    const [, position, rotation] = keyframes.at(-1);
    pose(node, position, rotation);
    return;
  }
  const [start, fromPosition, fromRotation] = keyframes[index - 1];
  const [end, toPosition, toRotation] = keyframes[index];
  const blend = THREE.MathUtils.smoothstep(time, start, end);
  const lerp = THREE.MathUtils.lerp;
  node.position.set(
    lerp(fromPosition[0], toPosition[0], blend),
    lerp(fromPosition[1], toPosition[1], blend),
    lerp(fromPosition[2], toPosition[2], blend),
  );
  node.rotation.set(
    lerp(fromRotation[0], toRotation[0], blend),
    lerp(fromRotation[1], toRotation[1], blend),
    lerp(fromRotation[2], toRotation[2], blend),
    'YXZ',
  );
}

function muzzleFlash() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const glow = context.createRadialGradient(32, 32, 2, 32, 32, 31);
  glow.addColorStop(0, '#fff3b7');
  glow.addColorStop(.35, '#fbb460ac');
  glow.addColorStop(1, '#ff822200');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.position.set(0, .083, -.61);
  sprite.scale.set(.3, .22, 1);
  return sprite;
}

export class Pistol {
  constructor(reducedMotion) {
    this.audio = new PistolAudio();
    this.reducedMotion = reducedMotion;
    this.camera = new THREE.PerspectiveCamera(56, 1, .035, 8);
    this.scene = new THREE.Scene();
    const fill = new THREE.HemisphereLight(0xe4eddd, 0x676d53, 2.4);
    const key = new THREE.DirectionalLight(0xffe0aa, 2.5);
    key.position.set(-2, 4, 2);
    const edge = new THREE.DirectionalLight(0xd7e6ff, 1.7);
    edge.position.set(2.5, 2, -3.2);
    this.scene.add(fill, key, edge);

    const { body, upper, magazine } = createPistolModel();
    this.worldModel = body.clone(true);
    this.worldModel.scale.setScalar(.34);
    this.viewmodel = body;
    this.upper = upper;
    this.magazine = magazine;
    this.flash = muzzleFlash();
    this.arms = createViewmodelArms();
    const { rightHand, leftHand, rightSleeve, leftSleeve } = this.arms;
    pose(rightHand, [.052, -.229, .137], [.14, -.26, .09]);
    this.viewmodel.add(rightHand, leftHand, this.flash);
    this.scene.add(this.viewmodel, rightSleeve, leftSleeve);
    this.rightElbow = new THREE.Vector3(.59, -.73, -.48);
    this.leftElbow = new THREE.Vector3(-.21, -.75, -.50);
    this.wrist = new THREE.Vector3();
    this.armDirection = new THREE.Vector3();
    this.capacity = CAPACITY;
    this.reset();
  }

  reset() {
    this.ammo = this.capacity;
    this.action = null;
    this.elapsed = 0;
    this.shotAge = 1;
    this.cooldown = 0;
    this.stride = 0;
    this.sprint = 0;
    this.update(0, 0);
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  fire() {
    if (this.action || this.cooldown > 0) return;
    this.cooldown = SHOT_INTERVAL;
    if (this.ammo === 0) {
      this.audio.play('dry');
      return;
    }
    this.ammo--;
    this.shotAge = 0;
    this.audio.play('fire');
  }

  begin(action) {
    if (this.action || !Object.hasOwn(ACTIONS, action)) return;
    this.action = action;
    this.elapsed = 0;
  }

  update(delta, speed) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    const animation = ACTIONS[this.action];
    if (animation) {
      const before = this.elapsed;
      this.elapsed += delta;
      for (const [time, cue] of animation.cues) {
        if (before < time && time <= this.elapsed) this.audio.play(cue);
      }
      if (this.elapsed >= animation.duration) {
        if (this.action === 'reload') this.ammo = this.capacity;
        this.action = null;
      }
    }

    if (this.action) {
      samplePose(this.viewmodel, animation.weapon, this.elapsed);
      samplePose(this.arms.leftHand, animation.support, this.elapsed);
      if (animation.magazine) samplePose(this.magazine, animation.magazine, this.elapsed);
      this.magazine.visible = this.action !== 'reload' || this.elapsed < .55 || this.elapsed > .68;
    } else {
      pose(this.viewmodel, REST, HOLD);
      pose(this.arms.leftHand, SUPPORT, SUPPORT_GRIP);
      pose(this.magazine, ZERO, ZERO);
      this.magazine.visible = true;
    }

    this.stride += speed * delta * 2.85;
    this.sprint = THREE.MathUtils.damp(this.sprint, speed > 4.6 && !this.action ? 1 : 0, 10, delta);
    if (!this.reducedMotion && !this.action) {
      const walk = Math.min(speed / 5, 1);
      this.viewmodel.position.x += Math.sin(this.stride) * .015 * walk;
      this.viewmodel.position.y += Math.cos(this.stride * 2) * .011 * walk;
      this.viewmodel.rotation.z += Math.sin(this.stride) * .025 * walk;
    }
    if (!this.reducedMotion) {
      this.viewmodel.position.y -= this.sprint * .10;
      this.viewmodel.rotation.x -= this.sprint * .24;
    }
    this.viewmodel.position.x *= THREE.MathUtils.clamp(this.camera.aspect / 1.38, .6, 1.15);

    const recoil = this.shotAge < .25 ? Math.exp(-this.shotAge * 19) : 0;
    const kick = recoil * (this.reducedMotion ? .3 : 1);
    this.viewmodel.position.z += kick * .094;
    this.viewmodel.rotation.x += kick * .18;
    this.upper.position.z = recoil * .043;
    this.flash.visible = !this.reducedMotion && this.shotAge < .045;
    this.shotAge += delta;

    this.viewmodel.updateMatrixWorld(true);
    const { rightSleeve, rightHand, leftSleeve, leftHand } = this.arms;
    this.updateSleeve(rightSleeve, this.rightElbow, rightHand);
    this.updateSleeve(leftSleeve, this.leftElbow, leftHand);
  }

  updateSleeve(sleeve, elbow, hand) {
    this.wrist.set(0, -.093, .050);
    hand.localToWorld(this.wrist);
    this.armDirection.copy(this.wrist).sub(elbow);
    sleeve.position.copy(elbow).lerp(this.wrist, .5);
    sleeve.scale.y = this.armDirection.length();
    sleeve.quaternion.setFromUnitVectors(UP, this.armDirection.normalize());
  }
}
