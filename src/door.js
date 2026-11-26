import * as THREE from 'three';

const EPSILON = .0001;
const PLAYER_RADIUS = .31;
const PLAYER_HEIGHT = 1.76;
const MAX_ANGULAR_STEP = .018;

// The game uses Y-up player and wall collisions. Doors rotate about that same
// vertical axis and expose small boxes to the existing character controller.
export class Door {
  constructor(scene, options) {
    this.config = {
      hinge: [0, 0, 0], axis: [0, 1, 0], yaw: 0, width: 1.1, height: 2.35,
      thickness: .09, mass: 35, minAngle: -1.48, maxAngle: 1.48,
      openingDirection: 0, openingSpeed: 1.2, closingSpeed: 1.35,
      friction: .12, damping: 2.7, interactionDistance: 2.35,
      handleRotation: .48, locked: false,
      latch: true, collision: true, audio: {}, color: 0x69543e,
      ...options,
    };
    const c = this.config;
    if (c.axis[0] !== 0 || Math.abs(c.axis[1]) !== 1 || c.axis[2] !== 0) {
      throw new Error('Door rotation axis must be vertical in this Y-up world.');
    }
    if (!Number.isFinite(c.width) || c.width <= 0 || !Number.isFinite(c.height) || c.height <= 0 ||
        !Number.isFinite(c.mass) || c.mass <= 0 || c.minAngle > 0 || c.maxAngle < 0) {
      throw new Error('Door dimensions, mass, and angle limits are invalid.');
    }
    this.axisSign = Math.sign(c.axis[1]);
    this.pivot = new THREE.Group();
    this.pivot.position.set(...c.hinge);
    this.frame = new THREE.Group();
    this.frame.rotation.y = c.yaw;
    this.frame.add(this.pivot);
    // Hinge coordinates are in world space, with yaw applied only to the door.
    this.frame.position.copy(this.pivot.position);
    this.pivot.position.set(0, 0, 0);
    scene.add(this.frame);
    this.panel = new THREE.Group();
    this.pivot.add(this.panel);
    const wood = new THREE.MeshStandardMaterial({ color: c.color, roughness: .87, metalness: c.metalness ?? 0 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x323a36, roughness: .62, metalness: .5 });
    const addBox = (parent, size, position, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    this.hitMesh = addBox(this.panel, [c.width, c.height, c.thickness],
      [c.width / 2, c.height / 2, 0], wood);
    for (let i = 1; i < 5; i++) {
      addBox(this.panel, [.014, c.height - .08, .012],
        [i * c.width / 5, c.height / 2, c.thickness / 2 + .006], metal);
    }
    for (const y of [.24, c.height - .24]) {
      for (const side of [-1, 1]) {
        addBox(this.panel, [c.width - .06, .07, .018],
          [c.width / 2, y, side * (c.thickness / 2 + .01)], metal);
      }
    }
    this.handles = [];
    for (const side of [-1, 1]) {
      const handle = new THREE.Group();
      handle.position.set(c.width - .18, 1.02, side * (c.thickness / 2 + .015));
      this.panel.add(handle);
      addBox(handle, [.06, .12, .022], [0, 0, 0], metal);
      const lever = new THREE.Group();
      handle.add(lever);
      addBox(lever, [.16, .025, .035], [-.065, 0, side * .028], metal);
      this.handles.push(lever);
    }
    this.segments = Array.from({ length: Math.ceil(c.width / .16) }, () => new THREE.Box3());
    this.local = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.reset();
  }

  reset() {
    this.angle = 0;
    this.velocity = 0;
    this.locked = this.config.locked;
    this.latched = this.config.latch;
    this.handle = 0;
    this.handleTimer = Infinity;
    this.releaseDelay = 0;
    this.target = null;
    this.blocked = false;
    this.creakTimer = 0;
    this.updateTransform();
  }

  emit(type, intensity = 1) {
    const position = this.worldPoint(this.config.width * .5, 0);
    position.y = this.config.hinge[1] + this.config.height * .5;
    this.config.audio.onEvent?.({
      type, position, angularVelocity: this.velocity,
      intensity: THREE.MathUtils.clamp(intensity, 0, 1), door: this,
    });
  }

  updateTransform() {
    const c = this.config;
    this.pivot.rotation.y = this.angle * this.axisSign;
    this.frame.updateMatrixWorld(true);
    for (const handle of this.handles) handle.rotation.z = this.handle;
    const count = this.segments.length;
    for (let index = 0; index < count; index++) {
      const start = index * c.width / count;
      const end = (index + 1) * c.width / count;
      const a = this.worldPoint(start, 0);
      const b = this.worldPoint(end, 0);
      const pad = c.thickness / 2 + .006;
      this.segments[index].set(
        new THREE.Vector3(Math.min(a.x, b.x) - pad, c.hinge[1], Math.min(a.z, b.z) - pad),
        new THREE.Vector3(Math.max(a.x, b.x) + pad, c.hinge[1] + c.height, Math.max(a.z, b.z) + pad),
      );
    }
  }

  worldPoint(distance, normal) {
    const c = this.config;
    const angle = c.yaw + this.angle * this.axisSign;
    return new THREE.Vector3(
      c.hinge[0] + Math.cos(angle) * distance + Math.sin(angle) * normal,
      c.hinge[1],
      c.hinge[2] - Math.sin(angle) * distance + Math.cos(angle) * normal,
    );
  }

  localPoint(point) {
    const c = this.config;
    const angle = c.yaw + this.angle * this.axisSign;
    const x = point.x - c.hinge[0];
    const z = point.z - c.hinge[2];
    return this.local.set(Math.cos(angle) * x - Math.sin(angle) * z,
      point.y - c.hinge[1], Math.sin(angle) * x + Math.cos(angle) * z);
  }

  distanceTo(point) {
    const local = this.localPoint(point);
    const x = THREE.MathUtils.clamp(local.x, 0, this.config.width);
    const y = THREE.MathUtils.clamp(local.y, 0, this.config.height);
    return Math.hypot(local.x - x, local.y - y, local.z);
  }

  rayDistance(camera) {
    this.frame.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    return this.raycaster.intersectObject(this.hitMesh, false)[0]?.distance ?? Infinity;
  }

  interact(player) {
    this.handleTimer = 0;
    if (this.locked) {
      this.emit('locked', .5);
      return;
    }
    this.releaseDelay = this.latched ? .1 : 0;
    this.emit('handle', .4);
    if (!this.latched) this.emit('latch', .2);
    const side = this.localPoint(player.position).z;
    const direction = side >= 0 ? 1 : -1;
    this.openDirection = this.config.openingDirection || direction * this.axisSign;
    const c = this.config;
    const open = this.target !== null ? Math.abs(this.target) > .03 : Math.abs(this.angle) > .015;
    this.target = open ? 0 : THREE.MathUtils.clamp(this.openDirection * 1.25, c.minAngle, c.maxAngle);
  }

  push(previous, player) {
    if (this.locked || this.latched) return;
    const before = this.localPoint(previous).clone();
    const after = this.localPoint(player.position).clone();
    if (after.y >= this.config.height || after.y + PLAYER_HEIGHT <= 0 ||
        after.x < -.10 || after.x > this.config.width + .10) return;
    const move = after.z - before.z;
    if (Math.abs(after.z) < PLAYER_RADIUS + this.config.thickness / 2 + .08 &&
        Math.sign(move) === -Math.sign(before.z) && Math.abs(move) > .001) {
      this.velocity += -move * this.axisSign * Math.max(.25, after.x / this.config.width) * 20 / Math.sqrt(this.config.mass / 35);
      this.velocity = THREE.MathUtils.clamp(this.velocity, -2.6, 2.6);
      this.target = null;
    }
  }

  intersectsPlayer(position, margin = PLAYER_RADIUS) {
    const p = this.localPoint(position);
    if (p.y >= this.config.height || p.y + PLAYER_HEIGHT <= 0) return false;
    const nearest = THREE.MathUtils.clamp(p.x, 0, this.config.width);
    return Math.hypot(p.x - nearest, Math.max(0, Math.abs(p.z) - this.config.thickness / 2)) < margin;
  }

  blockedAt(angle, solids, player) {
    const old = this.angle;
    this.angle = angle;
    const c = this.config;
    const yaw = c.yaw + angle * this.axisSign;
    const ux = Math.cos(yaw);
    const uz = -Math.sin(yaw);
    const vx = Math.sin(yaw);
    const vz = Math.cos(yaw);
    const centerX = c.hinge[0] + ux * c.width / 2;
    const centerZ = c.hinge[2] + uz * c.width / 2;
    let blocked = this.intersectsPlayer(player.position, PLAYER_RADIUS - .002);
    if (!blocked && c.collision) {
      for (const box of solids) {
        if (box.max.y <= c.hinge[1] + .03 || box.min.y >= c.hinge[1] + c.height - .03) continue;
        const halfX = (box.max.x - box.min.x) / 2;
        const halfZ = (box.max.z - box.min.z) / 2;
        const dx = (box.min.x + box.max.x) / 2 - centerX;
        const dz = (box.min.z + box.max.z) / 2 - centerZ;
        const halfWidth = c.width / 2 - .045;
        const halfDepth = c.thickness / 2;
        if (Math.abs(dx) >= halfX + halfWidth * Math.abs(ux) + halfDepth * Math.abs(vx) - EPSILON ||
            Math.abs(dz) >= halfZ + halfWidth * Math.abs(uz) + halfDepth * Math.abs(vz) - EPSILON ||
            Math.abs(dx * ux + dz * uz) >= halfWidth + halfX * Math.abs(ux) + halfZ * Math.abs(uz) - EPSILON ||
            Math.abs(dx * vx + dz * vz) >= halfDepth + halfX * Math.abs(vx) + halfZ * Math.abs(vz) - EPSILON) continue;
        blocked = true;
        break;
      }
    }
    this.angle = old;
    return blocked;
  }

  step(delta, player, solids) {
    if (this.releaseDelay > 0) {
      this.releaseDelay = Math.max(0, this.releaseDelay - delta);
      if (this.releaseDelay === 0 && !this.locked) {
        this.latched = false;
        this.emit('latch', .4);
      }
    }
    const c = this.config;
    this.handleTimer += delta;
    const desiredHandle = this.handleTimer < (this.locked ? .65 : .16) || this.releaseDelay > 0
      ? -c.handleRotation : 0;
    const rattle = this.locked && this.handleTimer < .65 ? Math.sin(this.handleTimer * 38) * .16 : 0;
    this.handle = THREE.MathUtils.damp(this.handle, desiredHandle + rattle, 15, delta);
    if (this.locked || this.latched) {
      this.velocity = 0;
      this.updateTransform();
      return;
    }

    if (this.target !== null) {
      const error = this.target - this.angle;
      const speed = Math.abs(this.target) < .03 ? c.closingSpeed : c.openingSpeed;
      const desired = THREE.MathUtils.clamp(error * 4, -speed, speed);
      const response = 7 / Math.sqrt(c.mass / 35);
      this.velocity = THREE.MathUtils.damp(this.velocity, desired, response, delta);
    }
    this.velocity *= Math.exp(-(c.damping + c.friction) * delta * (this.target === null ? 1 : .15));
    this.velocity = THREE.MathUtils.clamp(this.velocity, -2.6, 2.6);
    let travel = this.velocity * delta;
    const steps = Math.max(1, Math.ceil(Math.abs(travel) / MAX_ANGULAR_STEP));
    travel /= steps;
    let collision = false;
    for (let i = 0; i < steps; i++) {
      let next = THREE.MathUtils.clamp(this.angle + travel, c.minAngle, c.maxAngle);
      if (this.target !== null && (this.target - this.angle) * (this.target - next) <= 0) next = this.target;
      if (c.latch && this.angle * next < 0) next = 0;
      if (this.blockedAt(next, solids, player)) {
        collision = true;
        break;
      }
      this.angle = next;
      if ((next === c.minAngle && travel < 0) || (next === c.maxAngle && travel > 0) ||
          (next === this.target && this.target !== null) || (next === 0 && Math.abs(travel) > EPSILON)) {
        if (next === 0 && Math.abs(travel) > EPSILON) {
          this.latched = c.latch;
          this.emit(Math.abs(this.velocity) > 1.1 ? 'slam' : 'close', Math.abs(this.velocity) / 2);
        }
        if (next === 0 && this.target === 0) this.latched = c.latch;
        this.velocity = 0;
        this.target = null;
        break;
      }
    }
    if (collision) {
      if (!this.blocked && Math.abs(this.velocity) > .08) this.emit('collision', Math.abs(this.velocity) / 2);
      this.velocity = 0;
    }
    this.blocked = collision;
    if (!collision && Math.abs(this.velocity) > .08) {
      this.creakTimer = (this.creakTimer ?? 0) + delta;
      if (this.creakTimer > .45) {
        this.emit('creak', Math.abs(this.velocity) / 2.6);
        if (this.angle * this.velocity > 0) this.emit('open', Math.abs(this.velocity) / 2.6);
        this.creakTimer = 0;
      }
    }
    this.updateTransform();
  }
}

export class DoorInteraction {
  constructor(doors, solids) {
    this.doors = doors;
    this.solids = solids;
    this.ray = new THREE.Ray();
    this.hit = new THREE.Vector3();
  }

  focus(camera, player) {
    camera.updateMatrixWorld();
    const origin = camera.position;
    camera.getWorldDirection(this.hit);
    this.ray.set(origin, this.hit.clone());
    let distance = Infinity;
    for (const solid of this.solids) {
      const hit = this.ray.intersectBox(solid, this.hit);
      if (hit) distance = Math.min(distance, origin.distanceTo(hit));
    }
    let selected = null;
    const eye = player.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    for (const door of this.doors) {
      if (door.distanceTo(eye) > door.config.interactionDistance) continue;
      const hitDistance = door.rayDistance(camera);
      if (hitDistance < distance + .03 && hitDistance < (selected?.distance ?? Infinity)) {
        selected = { door, distance: hitDistance };
      }
    }
    return selected?.door ?? null;
  }

  step(delta, player) {
    for (const door of this.doors) {
      const otherDoors = this.doors.filter(other => other !== door && other.config.collision);
      door.step(delta, player, [...this.solids, ...otherDoors.flatMap(other => other.segments)]);
    }
  }

  get collisionBoxes() {
    return this.doors.filter(door => door.config.collision).flatMap(door => door.segments);
  }
}
