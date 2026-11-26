import * as THREE from 'three';
import { PLAYER_BODY_LAYER } from './player.js';

const WALL_CLEARANCE = .18;
const BODY_CLEARANCE = .76;
export const THIRD_PERSON_MIN_PITCH = -.34;
export const THIRD_PERSON_MAX_PITCH = .26;

export class ThirdPersonCamera {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(61, aspect, .045, 215);
    this.anchor = new THREE.Vector3();
    this.follow = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.orbit = new THREE.Euler(0, 0, 0, 'YXZ');
    this.ray = new THREE.Ray();
    this.box = new THREE.Box3();
    this.hit = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.distance = 0;
    this.yaw = 0;
    this.pitch = 0;
  }

  update(player, yaw, pitch, solids, delta, snap = false) {
    const { clamp, damp, euclideanModulo } = THREE.MathUtils;
    const turn = euclideanModulo(yaw - this.yaw + Math.PI, 2 * Math.PI) - Math.PI;
    const tilt = clamp(pitch, THIRD_PERSON_MIN_PITCH, THIRD_PERSON_MAX_PITCH);
    this.anchor.copy(player.position);
    this.anchor.y += 1.28;
    const visibleHeight = this.anchor.y + player.visual.position.y;
    if (snap) {
      this.yaw = yaw;
      this.pitch = tilt;
      this.follow.copy(this.anchor);
      this.follow.y = visibleHeight;
    } else {
      this.yaw += turn * (1 - Math.exp(-18 * delta));
      this.pitch = damp(this.pitch, tilt, 15, delta);
      this.follow.x = damp(this.follow.x, this.anchor.x, 14, delta);
      this.follow.y = damp(this.follow.y, visibleHeight, 10, delta);
      this.follow.z = damp(this.follow.z, this.anchor.z, 14, delta);
    }

    this.orbit.set(this.pitch - .16, this.yaw, 0);
    this.offset.set(.38, .32, 3.95).applyEuler(this.orbit).add(this.follow).sub(this.anchor);
    let limit = this.offset.length();
    this.ray.set(this.anchor, this.offset.normalize());

    for (const solid of solids) {
      this.box.copy(solid).expandByScalar(WALL_CLEARANCE);
      if (this.box.containsPoint(this.anchor)) this.box.copy(solid);
      if (this.box.containsPoint(this.anchor)) continue;
      const hit = this.ray.intersectBox(this.box, this.hit);
      if (hit) limit = Math.min(limit, Math.max(0, this.anchor.distanceTo(hit) - .025));
    }

    this.distance = snap || limit < this.distance
      ? limit
      : damp(this.distance, limit, 11, delta);
    this.ray.at(this.distance, this.camera.position);
    this.target.set(this.follow.x - Math.sin(this.yaw) * 1.35, this.follow.y + .04,
      this.follow.z - Math.cos(this.yaw) * 1.35);
    this.camera.lookAt(this.target);

    // Avoid drawing the inside of the character where the boom is fully retracted.
    if (this.distance >= BODY_CLEARANCE) this.camera.layers.enable(PLAYER_BODY_LAYER);
    else this.camera.layers.disable(PLAYER_BODY_LAYER);
  }
}
