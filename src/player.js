import * as THREE from 'three';
import { createSurvivorBody } from './character-model.js';

export const PLAYER_BODY_LAYER = 1;
const BODY_HEIGHT = 1.76;
const RADIUS = 0.31;
const STEP_HEIGHT = 0.24;
const WALK_SPEED = 3.8;
const RUN_SPEED = 6.5;
const EPSILON = 0.0001;

export class Player {
  constructor(spawn) {
    this.root = new THREE.Group();
    this.root.name = 'Player';
    this.position = this.root.position;
    this.visual = new THREE.Group();
    this.root.add(this.visual);
    this.velocity = new THREE.Vector3();
    this.wish = new THREE.Vector3();
    this.spawn = spawn;
    this.gait = 0;

    const { body, limbs } = createSurvivorBody();
    this.setBody(body);
    this.placeholderLimbs = limbs;
    this.reset();
  }

  reset() {
    this.position.set(this.spawn.x, this.spawn.y, this.spawn.z);
    this.velocity.set(0, 0, 0);
    this.yaw = this.spawn.yaw;
    this.grounded = true;
    this.running = false;
    this.speed = 0;
    this.root.rotation.y = this.yaw;
  }

  setBody(body, clips = [], names = {}) {
    this.visual.clear();
    this.visual.add(body);
    this.placeholderLimbs = [];
    this.itemSocket = body.getObjectByName('ItemSocket');
    if (this.heldItem) this.setHeldItem(this.heldItem);
    body.traverse((object) => {
      object.layers.set(PLAYER_BODY_LAYER);
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    this.mixer = clips.length ? new THREE.AnimationMixer(body) : null;
    this.actions = new Map();
    this.activeAction = null;
    for (const state of ['idle', 'walk', 'run', 'jump']) {
      const clip = names[state]
        ? THREE.AnimationClip.findByName(clips, names[state])
        : clips.find(({ name }) => new RegExp(`(^|[^a-z])${state}([^a-z]|$)`, 'i').test(name));
      if (clip) this.actions.set(state, this.mixer.clipAction(clip));
    }
    const jump = this.actions.get('jump');
    if (jump) {
      jump.setLoop(THREE.LoopOnce, 1);
      jump.clampWhenFinished = true;
    }
  }

  setHeldItem(item) {
    this.heldItem?.removeFromParent();
    this.heldItem = item;
    if (!this.itemSocket) return;
    item.traverse((object) => object.layers.set(PLAYER_BODY_LAYER));
    this.itemSocket.add(item);
  }

  step(delta, input, solids) {
    this.yaw = input.yaw;
    this.root.rotation.y = this.yaw;
    this.running = input.sprint && input.forward > 0;
    const topSpeed = this.running ? RUN_SPEED : WALK_SPEED;
    this.wish.set(input.side, 0, -input.forward);
    if (this.wish.lengthSq() > 1) this.wish.normalize();
    this.wish.applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw).multiplyScalar(topSpeed);

    const acceleration = this.grounded ? 21 : 5;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, this.wish.x, acceleration, delta);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, this.wish.z, acceleration, delta);

    if (input.jump && this.grounded) {
      this.velocity.y = 6.1;
      this.grounded = false;
    }

    const startX = this.position.x;
    const startZ = this.position.z;
    this.moveAlong('x', 'z', this.velocity.x * delta, solids);
    this.moveAlong('z', 'x', this.velocity.z * delta, solids);
    this.moveVertically(delta, solids);
    this.speed = Math.hypot(this.position.x - startX, this.position.z - startZ) / delta;
    this.updateBody(delta);
  }

  moveAlong(axis, other, distance, solids) {
    if (Math.abs(distance) < EPSILON) return;

    const position = this.position;
    const candidate = position[axis] + distance;
    let end = candidate;
    let stepTo = position.y;
    for (const box of solids) {
      if (position[other] <= box.min[other] - RADIUS || position[other] >= box.max[other] + RADIUS ||
          position.y >= box.max.y - EPSILON || position.y + BODY_HEIGHT <= box.min.y + EPSILON) {
        continue;
      }

      const min = box.min[axis] - RADIUS;
      const max = box.max[axis] + RADIUS;
      if (Math.max(position[axis], candidate) <= min || Math.min(position[axis], candidate) >= max) continue;

      if (this.grounded && box.max.y - position.y <= STEP_HEIGHT) {
        stepTo = Math.max(stepTo, box.max.y);
        continue;
      }

      end = distance > 0 ? Math.min(end, min) : Math.max(end, max);
    }

    if (stepTo > position.y && end === candidate) {
      const blockedAbove = solids.some((box) =>
        end > box.min[axis] - RADIUS && end < box.max[axis] + RADIUS &&
        position[other] > box.min[other] - RADIUS && position[other] < box.max[other] + RADIUS &&
        stepTo < box.max.y - EPSILON && stepTo + BODY_HEIGHT > box.min.y + EPSILON,
      );
      if (blockedAbove) {
        this.velocity[axis] = 0;
        return;
      }
      position.y = stepTo;
    }

    position[axis] = end;
    if (end !== candidate) this.velocity[axis] = 0;
  }

  moveVertically(delta, solids) {
    const position = this.position;
    const oldY = position.y;
    this.velocity.y -= 17.5 * delta;
    let y = oldY + this.velocity.y * delta;
    this.grounded = false;

    for (const box of solids) {
      if (position.x <= box.min.x - RADIUS || position.x >= box.max.x + RADIUS ||
          position.z <= box.min.z - RADIUS || position.z >= box.max.z + RADIUS) {
        continue;
      }

      if (this.velocity.y <= 0 && oldY >= box.max.y - EPSILON && y <= box.max.y) {
        y = box.max.y;
        this.grounded = true;
      } else if (this.velocity.y > 0 && oldY + BODY_HEIGHT <= box.min.y + EPSILON && y + BODY_HEIGHT >= box.min.y) {
        y = box.min.y - BODY_HEIGHT;
      }
    }

    if (y !== oldY + this.velocity.y * delta) this.velocity.y = 0;
    position.y = y;
  }

  updateBody(delta) {
    if (!this.mixer) {
      const stride = this.grounded ? Math.min(this.speed / WALK_SPEED, 1) * .55 : .2;
      this.gait += this.speed * delta * 2.4;
      for (const { leg, arm, side } of this.placeholderLimbs) {
        const swing = Math.sin(this.gait) * stride * side;
        leg.rotation.x = swing;
        arm.rotation.x = -swing * .7;
      }
      return;
    }

    const state = !this.grounded ? 'jump' : this.speed > 4.6 ? 'run' : this.speed > .18 ? 'walk' : 'idle';
    const action = this.actions.get(state) ??
      (state === 'run' ? this.actions.get('walk') : null) ??
      this.actions.get('idle');
    if (action !== this.activeAction) {
      this.activeAction?.fadeOut(.16);
      action?.reset().fadeIn(.16).play();
      this.activeAction = action;
    }
    this.mixer.update(delta);
  }
}

export class FirstPersonCamera {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(74, aspect, .05, 215);
    this.camera.rotation.order = 'YXZ';
    this.eyeHeight = 1.63;
    this.stride = 0;
    this.bob = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  reset(player, pitch) {
    this.camera.fov = 74;
    this.camera.updateProjectionMatrix();
    this.eyeHeight = player.position.y + 1.63;
    this.stride = 0;
    this.bob = 0;
    this.update(player, pitch, 0);
  }

  update(player, pitch, delta) {
    const camera = this.camera;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, player.position.y + 1.63, 29, delta);
    this.stride += player.speed * delta * 2.6;
    const bob = this.reducedMotion || !player.grounded ? 0 : Math.sin(this.stride) * Math.min(player.speed / 140, .038);
    this.bob = THREE.MathUtils.damp(this.bob, bob, 14, delta);
    camera.position.set(player.position.x, this.eyeHeight + this.bob, player.position.z);
    camera.rotation.set(pitch, player.yaw, 0);

    const fov = THREE.MathUtils.damp(camera.fov, player.speed > 4.6 && !this.reducedMotion ? 80 : 74, 8, delta);
    if (Math.abs(fov - camera.fov) > .015) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }
}
