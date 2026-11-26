import * as THREE from 'three';
import { PistolAudio } from './pistol-audio.js';
import { createPistolModel } from './pistol-model.js';

const CAPACITY = 15;
const SHOT_INTERVAL = .19;
const REST = [.31, -.244, -1.43];
const HOLD = [.112, .073, -.048];
const AIM = [.015, -.15, -1.6];
const AIM_HOLD = [.015, .015, 0];
const AIM_POSITION = new THREE.Vector3(...AIM);
const ZERO = [0, 0, 0];

// Each action samples weapon and magazine poses from the same clock.
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
  },
  inspect: {
    duration: 2.18,
    cues: [[.22, 'cloth'], [1.83, 'cloth']],
    weapon: [
      [0, REST, HOLD],
      [.34, [.37, -.132, -1.19], [.06, 1.12, -.24]],
      [.69, [.33, -.053, -.98], [.12, 1.51, -.25]],
      [1.12, [.33, -.056, -.97], [.14, 1.57, -.22]],
      [1.49, [.34, -.072, -1.04], [-.16, 1.36, .12]],
      [1.87, [.35, -.22, -1.37], [.04, .53, -.051]],
      [2.18, REST, HOLD],
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
    this.root = new THREE.Group();
    this.equipped = false;
    this.equipBlend = 0;
    this.lookLag = new THREE.Vector2();
    this.clock = 0;

    const { body, upper, magazine } = createPistolModel();
    this.worldModel = body.clone(true);
    this.worldModel.scale.setScalar(.34);
    this.viewmodel = body;
    this.viewMaterials = [];
    this.viewmodel.traverse((object) => {
      if (!object.isMesh) return;
      const cloneMaterial = (material) => {
        const clone = material.clone();
        clone.transparent = true;
        clone.depthWrite = false;
        this.viewMaterials.push(clone);
        return clone;
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(cloneMaterial)
        : cloneMaterial(object.material);
    });
    this.upper = upper;
    this.magazine = magazine;
    this.flash = muzzleFlash();
    this.viewMaterials.push(this.flash.material);
    this.viewmodel.add(this.flash);
    this.root.add(this.viewmodel);
    this.root.visible = false;
    this.capacity = CAPACITY;
    this.reset();
  }

  reset() {
    this.ammo = this.capacity;
    this.cancelAction();
    this.stride = 0;
    this.sprint = 0;
    this.aimBlend = 0;
    this.cameraRecoil = 0;
    this.obstructionOpacity = 1;
    this.viewOpacity = 1;
    for (const material of this.viewMaterials) material.opacity = 1;
    this.equipBlend = 0;
    this.equipped = false;
    this.root.visible = false;
    this.lookLag.set(0, 0);
    this.clock = 0;
    this.update(0, 0);
  }

  setEquipped(equipped) {
    this.equipped = equipped;
    if (equipped) this.root.visible = true;
  }

  addLook(horizontal, vertical) {
    if (this.reducedMotion) return;
    this.lookLag.x = THREE.MathUtils.clamp(this.lookLag.x + horizontal * 1.5, -.14, .14);
    this.lookLag.y = THREE.MathUtils.clamp(this.lookLag.y + vertical * 1.5, -.12, .12);
  }

  setObstruction(distance) {
    this.obstructionOpacity = THREE.MathUtils.smoothstep(distance, .55, 1.35);
  }

  cancelAction() {
    this.action = null;
    this.elapsed = 0;
    this.shotAge = 1;
    this.cooldown = 0;
  }

  fire() {
    if (!this.equipped || this.action || this.cooldown > 0) return;
    this.cooldown = SHOT_INTERVAL;
    if (this.ammo === 0) {
      this.audio.play('dry');
      return;
    }
    this.ammo--;
    this.shotAge = 0;
    this.cameraRecoil = Math.min(this.cameraRecoil + .018, .055);
    this.audio.play('fire');
  }

  begin(action) {
    if (!this.equipped || this.action || !Object.hasOwn(ACTIONS, action)) return;
    this.action = action;
    this.elapsed = 0;
  }

  update(delta, speed, aspect = 1.38, aiming = false) {
    this.clock += delta;
    this.viewOpacity = THREE.MathUtils.damp(this.viewOpacity, this.obstructionOpacity, 12, delta);
    for (const material of this.viewMaterials) material.opacity = this.viewOpacity;
    this.equipBlend = THREE.MathUtils.damp(this.equipBlend, Number(this.equipped), 14, delta);
    this.lookLag.multiplyScalar(Math.exp(-7 * delta));
    if (!this.equipped && this.equipBlend < .002) this.root.visible = false;

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
      if (animation.magazine) samplePose(this.magazine, animation.magazine, this.elapsed);
      this.magazine.visible = this.action !== 'reload' || this.elapsed < .55 || this.elapsed > .68;
    } else {
      pose(this.viewmodel, REST, HOLD);
      pose(this.magazine, ZERO, ZERO);
      this.magazine.visible = true;
    }

    this.aimBlend = THREE.MathUtils.damp(this.aimBlend, Number(aiming && this.equipped && !this.action && speed < 4.6), 13, delta);
    this.viewmodel.position.lerp(AIM_POSITION, this.aimBlend);
    this.viewmodel.rotation.x = THREE.MathUtils.lerp(this.viewmodel.rotation.x, AIM_HOLD[0], this.aimBlend);
    this.viewmodel.rotation.y = THREE.MathUtils.lerp(this.viewmodel.rotation.y, AIM_HOLD[1], this.aimBlend);
    this.viewmodel.rotation.z = THREE.MathUtils.lerp(this.viewmodel.rotation.z, AIM_HOLD[2], this.aimBlend);

    this.stride += speed * delta * 2.85;
    this.sprint = THREE.MathUtils.damp(this.sprint, speed > 4.6 && !this.action ? 1 : 0, 10, delta);
    if (!this.reducedMotion && this.equipped && !this.action) {
      const walk = Math.min(speed / 5, 1);
      const idle = 1 - walk;
      this.viewmodel.position.x += Math.sin(this.stride) * .015 * walk;
      this.viewmodel.position.y += Math.cos(this.stride * 2) * .011 * walk;
      this.viewmodel.rotation.z += Math.sin(this.stride) * .025 * walk;
      this.viewmodel.position.x += Math.sin(this.clock * .72) * .0025 * idle;
      this.viewmodel.position.y += Math.sin(this.clock * .94) * .0035 * idle;
      this.viewmodel.rotation.z += Math.sin(this.clock * .72) * .004 * idle;
    }
    if (this.equipped) {
      this.viewmodel.rotation.y += this.lookLag.x;
      this.viewmodel.rotation.x -= this.lookLag.y;
    }
    this.viewmodel.position.y -= (1 - this.equipBlend) * .42;
    this.viewmodel.rotation.x += (1 - this.equipBlend) * .28;
    if (!this.reducedMotion) {
      this.viewmodel.position.y -= this.sprint * .10;
      this.viewmodel.rotation.x -= this.sprint * .24;
    }
    this.viewmodel.position.x *= THREE.MathUtils.clamp(aspect / 1.38, .6, 1.15);

    const recoil = this.shotAge < .25 ? Math.exp(-this.shotAge * 19) : 0;
    const kick = recoil * (this.reducedMotion ? .3 : 1);
    this.viewmodel.position.z += kick * .094;
    this.viewmodel.rotation.x += kick * .18;
    this.upper.position.z = recoil * .043;
    this.flash.visible = !this.reducedMotion && this.shotAge < .045;
    this.shotAge += delta;
    this.cameraRecoil = THREE.MathUtils.damp(this.cameraRecoil, 0, 8, delta);
  }
}
