import * as THREE from 'three';
import { ANKLE_HEIGHT, createSurvivorBody, HIP_HEIGHT, SHIN_LENGTH, THIGH_LENGTH } from './character-model.js';

export const PLAYER_BODY_LAYER = 1;
const BODY_HEIGHT = 1.76;
const RADIUS = 0.31;
const STEP_HEIGHT = 0.24;
const FIRST_PERSON_SPEEDS = Object.freeze({ walk: 3.8, sprint: 6.5 });
const THIRD_PERSON_SPEEDS = Object.freeze({ walk: 2.2, sprint: 5.6 });
const MAX_VISUAL_HEIGHT_OFFSET = .12;
const EPSILON = 0.0001;

export function movementSpeeds(thirdPerson) {
  return thirdPerson ? THIRD_PERSON_SPEEDS : FIRST_PERSON_SPEEDS;
}

function placeFoot(leg, shin, foot, forward, down, toeTilt) {
  const reach = Math.min(Math.hypot(forward, down), THIGH_LENGTH + SHIN_LENGTH - .001);
  const knee = Math.acos(THREE.MathUtils.clamp(
    (reach ** 2 - THIGH_LENGTH ** 2 - SHIN_LENGTH ** 2) / (2 * THIGH_LENGTH * SHIN_LENGTH), -1, 1,
  ));
  const bend = Math.atan2(forward, down) +
    Math.atan2(SHIN_LENGTH * Math.sin(knee), THIGH_LENGTH + SHIN_LENGTH * Math.cos(knee));
  leg.rotation.set(bend, 0, 0);
  shin.rotation.x = -knee;
  foot.rotation.set(toeTilt - bend + knee, 0, 0);
}

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
    const { body, limbs, upperBody } = createSurvivorBody();
    this.setBody(body);
    this.placeholderLimbs = limbs;
    this.upperBody = upperBody;
    this.reset();
  }

  reset() {
    this.position.set(this.spawn.x, this.spawn.y, this.spawn.z);
    this.velocity.set(0, 0, 0);
    this.yaw = this.spawn.yaw;
    this.grounded = true;
    this.running = false;
    this.speed = 0;
    this.gait = 0;
    this.motion = 0;
    this.airPose = 0;
    this.visual.position.y = 0;
    this.upperBody?.rotation.set(0, 0, 0);
    this.root.rotation.y = this.yaw;
    this.updateBody(0);
  }

  setBody(body, clips = [], names = {}) {
    this.visual.clear();
    this.visual.add(body);
    this.placeholderLimbs = [];
    this.upperBody = null;
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
    if (!this.itemSocket || !item) return;
    item.traverse((object) => object.layers.set(PLAYER_BODY_LAYER));
    this.itemSocket.add(item);
  }

  step(delta, input, solids, cameraYaw = null) {
    const thirdPerson = cameraYaw !== null;
    this.running = input.sprint && (thirdPerson ? Boolean(input.forward || input.side) : input.forward > 0);
    const speeds = movementSpeeds(thirdPerson);
    const topSpeed = this.running ? speeds.sprint : speeds.walk;
    this.wish.set(input.side, 0, -input.forward);
    if (this.wish.lengthSq() > 1) this.wish.normalize();
    this.wish.applyAxisAngle(THREE.Object3D.DEFAULT_UP, cameraYaw ?? input.yaw).multiplyScalar(topSpeed);

    const acceleration = this.grounded ? (thirdPerson ? 10.5 : 21) : 5;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, this.wish.x, acceleration, delta);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, this.wish.z, acceleration, delta);

    if (input.jump && this.grounded) {
      this.velocity.y = 6.1;
      this.grounded = false;
    }

    const startX = this.position.x;
    const startZ = this.position.z;
    const visibleHeight = this.position.y + this.visual.position.y;
    this.moveAlong('x', 'z', this.velocity.x * delta, solids);
    this.moveAlong('z', 'x', this.velocity.z * delta, solids);
    this.moveVertically(delta, solids);
    // Ease the rendered body toward the collision height.
    const heightOffset = THREE.MathUtils.damp(visibleHeight - this.position.y, 0, 30, delta);
    this.visual.position.y = THREE.MathUtils.clamp(heightOffset, -MAX_VISUAL_HEIGHT_OFFSET, MAX_VISUAL_HEIGHT_OFFSET);
    const dx = this.position.x - startX;
    const dz = this.position.z - startZ;
    this.speed = Math.hypot(dx, dz) / delta;
    if (!thirdPerson) {
      this.yaw = input.yaw;
    } else if (this.speed > .16 && this.wish.lengthSq() > EPSILON) {
      const facing = Math.atan2(-dx, -dz);
      const turn = THREE.MathUtils.euclideanModulo(facing - this.yaw + Math.PI, 2 * Math.PI) - Math.PI;
      this.yaw += turn * (1 - Math.exp(-13 * delta));
      this.yaw = THREE.MathUtils.euclideanModulo(this.yaw + Math.PI, 2 * Math.PI) - Math.PI;
    }
    this.root.rotation.y = this.yaw;
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
      if (this.upperBody) this.updateGait(delta);
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

  updateGait(delta) {
    const { damp, lerp, smoothstep } = THREE.MathUtils;
    this.motion = damp(this.motion, Math.min(this.speed / 1.85, 1), 12, delta);
    this.airPose = damp(this.airPose, Number(!this.grounded), 14, delta);
    const run = smoothstep(this.speed, 2.5, 5.4);
    if (this.grounded) this.gait = (this.gait + this.speed * delta / lerp(1.26, 2.18, run)) % 1;
    const stride = lerp(.255, .325, run) * this.motion;
    const stance = lerp(.63, .55, run);
    const bob = Math.sin(this.gait * 2 * Math.PI) ** 2;
    const hips = lerp(HIP_HEIGHT - this.motion * (.058 + .010 * run - .019 * bob), HIP_HEIGHT, this.airPose);
    this.upperBody.position.y = .89 + hips - HIP_HEIGHT;
    const lean = -this.motion * lerp(.028, .14, run) + .025 * this.airPose;
    this.upperBody.rotation.x = damp(this.upperBody.rotation.x, lean, 12, delta);
    this.upperBody.rotation.y = Math.cos(this.gait * 2 * Math.PI) * .105 * this.motion * (1 - this.airPose);
    this.upperBody.rotation.z = Math.sin(this.gait * 2 * Math.PI) * .038 * this.motion * (1 - this.airPose);

    for (const { leg, shin, foot, arm, elbow, side } of this.placeholderLimbs) {
      const phase = (this.gait + (side < 0 ? .5 : 0)) % 1;
      const swing = smoothstep(phase, stance, 1);
      const forward = phase < stance ? lerp(stride, -stride, phase / stance) : lerp(-stride, stride, swing);
      const lift = Math.sin(swing * Math.PI) * lerp(.135, .25, run) * this.motion;
      const armSwing = -Math.cos(phase * 2 * Math.PI) * this.motion * lerp(.34, .57, run);
      leg.position.y = hips;
      placeFoot(leg, shin, foot, lerp(forward, side * .13, this.airPose),
        hips - ANKLE_HEIGHT - lerp(lift, side > 0 ? .24 : .18, this.airPose),
        lerp(Math.sin(swing * 2 * Math.PI) * .22 * this.motion, .23, this.airPose));
      arm.rotation.x = lerp(armSwing, .32 + side * .20, this.airPose);
      elbow.rotation.x = lerp(.15 + this.motion * (.13 + run * .40), .63, this.airPose);
    }
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

  update(player, pitch, delta, yaw = player.yaw) {
    const camera = this.camera;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, player.position.y + 1.63, 29, delta);
    this.stride += player.speed * delta * 2.6;
    const bob = this.reducedMotion || !player.grounded ? 0 : Math.sin(this.stride) * Math.min(player.speed / 140, .038);
    this.bob = THREE.MathUtils.damp(this.bob, bob, 14, delta);
    camera.position.set(player.position.x, this.eyeHeight + this.bob, player.position.z);
    camera.rotation.set(pitch, yaw, 0);

    const fov = THREE.MathUtils.damp(camera.fov, player.speed > 4.6 && !this.reducedMotion ? 80 : 74, 8, delta);
    if (Math.abs(fov - camera.fov) > .015) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }
}
