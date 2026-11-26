import * as THREE from 'three';
import { createSurvivorBody } from './character-model.js';
import { traceHitscan } from './hitscan.js';
import { createRifleModel } from './rifle-model.js';

const HITBOX_SIZE = new THREE.Vector3(.65, 1.8, .65);
const HITBOX_OFFSET = new THREE.Vector3(0, .9, 0);
const EYE_OFFSET = new THREE.Vector3(0, 1.48, 0);
const AIM_OFFSET = new THREE.Vector3(0, .9, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class NPC {
  constructor(scene, navigation, {
    position, route, yaw = 0, disposition = 'neutral', color = 0x6a7356,
    visionRange = 14, visionFov = 110,
    weapon = { damage: 8, range: 14, interval: 1.15 },
  }) {
    const { body, limbs, upperBody } = createSurvivorBody();
    this.root = new THREE.Group();
    this.root.position.set(...position);
    this.root.add(body);
    scene.add(this.root);
    body.traverse(object => {
      if (!object.isMesh) return;
      object.material = object.material.clone();
      object.material.color.lerp(new THREE.Color(color), .24);
      object.castShadow = true;
    });
    this.limbs = limbs;
    this.upperBody = upperBody;
    this.weaponSocket = body.getObjectByName('ItemSocket');
    this.navigation = navigation;
    this.route = route.map(point => new THREE.Vector3(...point));
    this.spawnYaw = yaw;
    this.disposition = disposition;
    this.initialDisposition = disposition;
    this.visionRange = visionRange;
    this.visionCosine = Math.cos(THREE.MathUtils.degToRad(visionFov / 2));
    this.weapon = { ...weapon };
    if (disposition === 'hostile') this.equipWeapon();
    this.spawn = new THREE.Vector3(...position);
    this.reset();
  }

  equipWeapon() {
    if (this.weaponModel) {
      this.weaponModel.visible = true;
      return;
    }
    if (!this.weaponSocket) return;
    this.weaponModel = createRifleModel().body;
    this.weaponModel.scale.setScalar(.58);
    this.weaponSocket.add(this.weaponModel);
  }

  reset() {
    this.root.position.copy(this.spawn);
    this.root.rotation.set(0, this.spawnYaw, 0);
    this.routeIndex = 0;
    this.path = [];
    this.wait = 1;
    this.gait = 0;
    this.elapsed = 0;
    this.state = 'patrol';
    this.disposition = this.initialDisposition;
    if (this.weaponModel) this.weaponModel.visible = this.disposition === 'hostile';
    this.health = 100;
    this.investigation = null;
    this.goal = null;
    this.doorRetry = 0;
    this.lastSeen = null;
    this.lostSight = 0;
    this.attackCooldown = 0;
    this.repathTimer = 0;
  }

  takeDamage(amount, attacker = null) {
    if (this.health <= 0 || !Number.isFinite(amount) || amount <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    if (attacker?.position && this.disposition !== 'hostile') {
      this.disposition = 'hostile';
      this.equipWeapon();
      this.lastSeen = attacker.position.clone();
      this.goal = this.lastSeen.clone();
      this.lostSight = 0;
      this.state = 'combat';
      this.path = [];
    }
    if (this.health === 0) {
      this.state = 'dead';
      this.path = [];
    }
    return true;
  }

  getHitbox(target = new THREE.Box3()) {
    return target.setFromCenterAndSize(this.root.position, HITBOX_SIZE).translate(HITBOX_OFFSET);
  }

  canSee(target, obstacles = []) {
    if (!target || target.health <= 0) return false;
    const origin = this.root.position.clone().add(EYE_OFFSET);
    const destination = target.position.clone().add(AIM_OFFSET);
    const direction = destination.sub(origin);
    const distance = direction.length();
    if (distance > this.visionRange || distance < .001) return false;
    direction.multiplyScalar(1 / distance);
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(WORLD_UP, this.root.rotation.y);
    if (forward.dot(direction) < this.visionCosine) return false;
    const ray = new THREE.Ray(origin, direction);
    return !obstacles.some(box => {
      const intersection = ray.intersectBox(box, new THREE.Vector3());
      return intersection && origin.distanceTo(intersection) < distance - .1;
    });
  }

  navigationObstacles(doors, avoidOpenDoors = false) {
    return doors.filter(door => door.config?.collision !== false &&
      (door.locked || (avoidOpenDoors && Math.abs(door.angle) > .15)))
      .flatMap(door => door.segments);
  }

  face(direction, delta) {
    if (direction.lengthSq() < 1e-8) return;
    const facing = Math.atan2(-direction.x, -direction.z);
    const turn = THREE.MathUtils.euclideanModulo(facing - this.root.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    this.root.rotation.y += turn * (1 - Math.exp(-7 * delta));
  }

  animateLocomotion(delta, travel, aiming = false) {
    this.gait += travel * 5;
    for (const { leg, shin, foot, arm, elbow, side } of this.limbs) {
      const swing = Math.sin(this.gait) * side;
      leg.rotation.x = swing * .40;
      shin.rotation.x = -Math.max(0, -swing) * .35;
      foot.rotation.x = -leg.rotation.x - shin.rotation.x;
      arm.rotation.x = aiming ? THREE.MathUtils.damp(arm.rotation.x, -.10, 8, delta) : -swing * .3;
      elbow.rotation.x = aiming ? THREE.MathUtils.damp(elbow.rotation.x, .58, 8, delta) : .20;
    }
  }

  advancePath(delta, doors) {
    if (!this.path.length) return { direction: new THREE.Vector3(), distance: 0, travel: 0 };
    const direction = this.path[0].clone().sub(this.root.position);
    direction.y = 0;
    const distance = direction.length();
    let travel = Math.min(distance, 1.25 * delta);
    if (distance > 0) {
      const next = this.root.position.clone().addScaledVector(direction, travel / distance);
      const blockingDoor = doors.find(door => door.intersectsPlayer
        ? door.intersectsPlayer(next, .30)
        : door.segments.some(box =>
          next.x > box.min.x - .30 && next.x < box.max.x + .30 &&
          next.z > box.min.z - .30 && next.z < box.max.z + .30));
      if (blockingDoor) {
        travel = 0;
        if (blockingDoor.locked ||
            (blockingDoor.target === null && Math.abs(blockingDoor.angle) > .15)) {
          this.path = this.navigation.findPath(this.root.position, this.goal ?? this.path[0],
            this.navigationObstacles(doors, true));
        } else if (this.doorRetry === 0 &&
            (blockingDoor.latched || (blockingDoor.target === null && Math.abs(blockingDoor.angle) < .15))) {
          blockingDoor.interact({ position: this.root.position });
          this.doorRetry = 2;
        }
      } else this.root.position.copy(next);
    }
    if (distance <= travel + .001) {
      this.path.shift();
      if (!this.path.length) {
        this.goal = null;
        if (this.state !== 'combat') this.wait = 1.5;
      }
    }
    return { direction, distance, travel };
  }

  updateCombat(delta, player, visible, doors, obstacles) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.repathTimer = Math.max(0, this.repathTimer - delta);
    if (visible) {
      this.lastSeen = player.position.clone();
      this.lostSight = 0;
    } else {
      this.lostSight += delta;
      if (this.lostSight >= 5) {
        this.state = 'investigate';
        this.investigation = this.lastSeen?.clone() ?? null;
        this.goal = this.investigation;
        this.path = this.goal
          ? this.navigation.findPath(this.root.position, this.goal, this.navigationObstacles(doors))
          : [];
        return;
      }
    }

    const target = visible ? player.position : this.lastSeen;
    if (!target) {
      this.state = 'patrol';
      this.path = [];
      return;
    }
    const direction = target.clone().sub(this.root.position);
    direction.y = 0;
    const distance = direction.length();
    this.face(direction, delta);

    if (visible && distance <= this.weapon.range && this.attackCooldown === 0) {
      const origin = this.root.position.clone().add(EYE_OFFSET);
      const aim = player.position.clone().add(AIM_OFFSET);
      const hit = traceHitscan(origin, aim.sub(origin), [player], obstacles);
      if (hit) player.takeDamage(this.weapon.damage);
      this.attackCooldown = this.weapon.interval;
    }

    const shouldMove = !visible || distance > this.weapon.range * .82;
    if (shouldMove && this.repathTimer === 0) {
      this.goal = target.clone();
      this.path = this.navigation.findPath(this.root.position, this.goal, this.navigationObstacles(doors));
      this.repathTimer = .65;
    } else if (!shouldMove) {
      this.path = [];
    }

    const movement = this.advancePath(delta, doors);
    this.face(shouldMove ? movement.direction : direction, delta);
    this.animateLocomotion(delta, movement.travel, true);
  }

  hear(position, radius, obstacles = [], doors = []) {
    if (this.health <= 0) return false;
    const origin = this.root.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const sound = position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const difference = sound.clone().sub(origin);
    const distance = difference.length();
    if (distance > radius || distance < .001) return false;
    const ray = new THREE.Ray(origin, difference.normalize());
    const blocked = obstacles.some(box => {
      const intersection = ray.intersectBox(box, new THREE.Vector3());
      return intersection && origin.distanceTo(intersection) < distance - .05;
    });
    if (blocked && distance > radius * .45) return false;
    this.investigation = position.clone();
    this.goal = this.investigation.clone();
    this.state = 'investigate';
    this.path = this.navigation.findPath(this.root.position, this.goal, this.navigationObstacles(doors));
    this.wait = 0;
    return true;
  }

  update(delta, doors = [], player = null, obstacles = []) {
    this.doorRetry = Math.max(0, this.doorRetry - delta);
    if (this.health <= 0) {
      this.root.rotation.x = THREE.MathUtils.damp(this.root.rotation.x, Math.PI / 2, 5, delta);
      return;
    }
    this.elapsed += delta;
    const visible = this.disposition === 'hostile' && player?.health > 0 &&
      this.canSee(player, obstacles);
    if (visible) this.state = 'combat';
    if (this.state === 'combat') {
      this.updateCombat(delta, player, visible, doors, obstacles);
      return;
    }
    if (this.wait > 0) {
      this.wait -= delta;
      this.upperBody.rotation.z = Math.sin(this.elapsed * 1.5) * .012;
      for (const { leg, shin, foot, arm, elbow } of this.limbs) {
        for (const joint of [leg, shin, foot, arm, elbow]) joint.rotation.x = THREE.MathUtils.damp(joint.rotation.x, 0, 8, delta);
      }
      return;
    }
    if (!this.path.length) {
      if (this.state === 'investigate') {
        this.state = 'patrol';
        this.investigation = null;
        this.goal = null;
        this.wait = 2;
        return;
      }
      this.goal = this.route[this.routeIndex];
      this.path = this.navigation.findPath(this.root.position, this.goal, this.navigationObstacles(doors));
      this.routeIndex = (this.routeIndex + 1) % this.route.length;
      if (!this.path.length) {
        this.wait = 2;
        return;
      }
    }
    const movement = this.advancePath(delta, doors);
    this.face(movement.direction, delta);
    this.animateLocomotion(delta, movement.travel);
  }
}
