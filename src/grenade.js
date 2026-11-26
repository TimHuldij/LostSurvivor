import * as THREE from 'three';
import { EquippableItem } from './equippable-item.js';

const MAX_USES = 2;
const THROW_TIME = .32;
const FUSE_TIME = 1.8;
const BLAST_RADIUS = 5;
const BLAST_DAMAGE = 120;
const EFFECT_DURATION = .36;

function createGrenadeModel() {
  const model = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x48523d, roughness: .7, metalness: .35 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x777b6b, roughness: .42, metalness: .72 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 9), shell);
  model.add(body);

  const band = new THREE.Mesh(new THREE.TorusGeometry(.082, .012, 5, 12), metal);
  band.rotation.x = Math.PI / 2;
  band.position.y = .018;
  model.add(band);

  const lever = new THREE.Mesh(new THREE.BoxGeometry(.035, .12, .012), metal);
  lever.position.set(.079, .008, 0);
  lever.rotation.z = -.16;
  model.add(lever);

  const pin = new THREE.Mesh(new THREE.TorusGeometry(.024, .004, 4, 8), metal);
  pin.position.set(.105, .055, 0);
  model.add(pin);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  return model;
}

export class GrenadeItem extends EquippableItem {
  constructor(reducedMotion = false) {
    const viewModel = createGrenadeModel();
    const worldModel = viewModel.clone(true);
    worldModel.scale.setScalar(.62);
    super({
      worldModel,
      viewModel,
      restPosition: [.36, -.23, -.82],
      restRotation: [-.08, .08, -.12],
      equipOffset: [0, -.38, .2],
      walkSway: .011,
      idleSway: .002,
      useDuration: .72,
      reducedMotion,
    });
    this.maxUses = MAX_USES;
    this.uses = 0;
    this.throwTime = THROW_TIME;
    this.throwPending = false;
  }

  reset() {
    super.reset();
    this.uses = 0;
    this.throwPending = false;
  }

  setEquipped(equipped) {
    super.setEquipped(equipped);
    if (!equipped) this.throwPending = false;
  }

  collect(amount = 1) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const count = Math.min(this.maxUses - this.uses, Math.floor(amount));
    this.uses += count;
    return count;
  }

  use() {
    if (!this.equipped || this.uses <= 0 || !this.beginUse()) return false;
    this.throwPending = false;
    return true;
  }

  update(delta, speed, aspect = 1.38) {
    const previousElapsed = this.useElapsed;
    const wasUsing = this.using;
    super.update(delta, speed, aspect);
    const updatedElapsed = Math.min(previousElapsed + delta, this.useDuration);
    if (wasUsing && previousElapsed < this.throwTime && updatedElapsed >= this.throwTime) {
      this.uses--;
      this.throwPending = true;
    }

    if (this.viewModel.visible) {
      const progress = this.using ? this.useElapsed / this.useDuration : 0;
      const throwPose = Math.sin(Math.PI * progress);
      this.viewModel.rotation.x -= throwPose * .52;
      this.viewModel.rotation.z += throwPose * .28;
    }
  }

  consumeThrow() {
    const pending = this.throwPending;
    this.throwPending = false;
    return pending;
  }
}

function normalAt(point, box) {
  const faces = [
    [Math.abs(point.x - box.min.x), new THREE.Vector3(-1, 0, 0)],
    [Math.abs(point.x - box.max.x), new THREE.Vector3(1, 0, 0)],
    [Math.abs(point.y - box.min.y), new THREE.Vector3(0, -1, 0)],
    [Math.abs(point.y - box.max.y), new THREE.Vector3(0, 1, 0)],
    [Math.abs(point.z - box.min.z), new THREE.Vector3(0, 0, -1)],
    [Math.abs(point.z - box.max.z), new THREE.Vector3(0, 0, 1)],
  ];
  return faces.reduce((nearest, face) => face[0] < nearest[0] ? face : nearest)[1];
}

function createExplosion(root) {
  root.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
    else object.material.dispose();
  });
  root.clear();
  const material = new THREE.MeshBasicMaterial({
    color: 0xffa45b, transparent: true, opacity: .8, depthWrite: false,
  });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), material);
  flash.scale.setScalar(.2);
  const light = new THREE.PointLight(0xffa45b, 110, 9, 2);
  root.add(flash, light);
  return { flash, material, light };
}

export class GrenadeProjectile {
  constructor(scene, position, velocity, fuse = FUSE_TIME) {
    this.root = new THREE.Group();
    this.root.position.copy(position);
    this.position = this.root.position;
    this.velocity = velocity.clone();
    this.fuse = fuse;
    this.alive = true;
    this.exploded = false;
    this.effectElapsed = 0;
    const model = createGrenadeModel();
    model.scale.setScalar(.72);
    this.root.add(model);
    scene.add(this.root);
  }

  step(delta, obstacles) {
    if (!this.alive) return false;
    if (this.exploded) {
      this.effectElapsed += delta;
      const progress = THREE.MathUtils.clamp(this.effectElapsed / EFFECT_DURATION, 0, 1);
      this.effect.flash.scale.setScalar(.2 + progress * 2.8);
      this.effect.material.opacity = .8 * (1 - progress);
      this.effect.light.intensity = 110 * (1 - progress);
      if (progress === 1) {
        this.alive = false;
        this.root.removeFromParent();
      }
      return false;
    }

    this.fuse -= delta;
    this.velocity.y -= 9.81 * delta;
    const next = this.position.clone().addScaledVector(this.velocity, delta);
    const movement = next.clone().sub(this.position);
    const distance = movement.length();
    if (distance > 1e-5) {
      const ray = new THREE.Ray(this.position, movement.multiplyScalar(1 / distance));
      let nearest = null;
      let nearestDistance = distance;
      for (const obstacle of obstacles) {
        const point = ray.intersectBox(obstacle, new THREE.Vector3());
        if (!point) continue;
        const hitDistance = this.position.distanceTo(point);
        if (hitDistance < nearestDistance) {
          nearest = { point, normal: normalAt(point, obstacle) };
          nearestDistance = hitDistance;
        }
      }
      if (nearest) {
        this.position.copy(nearest.point).addScaledVector(nearest.normal, .015);
        this.velocity.reflect(nearest.normal).multiplyScalar(.38);
        if (this.velocity.lengthSq() < .35) this.velocity.set(0, 0, 0);
      } else {
        this.position.copy(next);
      }
    }

    if (this.position.y < .09) {
      this.position.y = .09;
      if (Math.abs(this.velocity.y) > .8) this.velocity.y = Math.abs(this.velocity.y) * .28;
      else this.velocity.y = 0;
      this.velocity.x *= .72;
      this.velocity.z *= .72;
    }

    if (this.fuse <= 0) {
      this.exploded = true;
      this.effect = createExplosion(this.root);
      return true;
    }
    return false;
  }

  dispose() {
    this.root.removeFromParent();
    this.root.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose();
    });
    this.alive = false;
  }
}

export function applyGrenadeBlast(position, targets, obstacles, attacker, {
  radius = BLAST_RADIUS,
  damage = BLAST_DAMAGE,
} = {}) {
  const origin = position.clone();
  const damaged = [];
  for (const target of targets) {
    if (target.health <= 0) continue;
    const targetPosition = target.position ?? target.root?.position;
    if (!targetPosition) continue;
    const destination = targetPosition.clone().add(new THREE.Vector3(0, .9, 0));
    const offset = destination.sub(origin);
    const distance = offset.length();
    if (distance >= radius || distance < 1e-4) continue;
    const direction = offset.multiplyScalar(1 / distance);
    const ray = new THREE.Ray(origin, direction);
    const blocked = obstacles.some(box => {
      const intersection = ray.intersectBox(box, new THREE.Vector3());
      return intersection && origin.distanceTo(intersection) < distance - .1;
    });
    if (blocked) continue;
    const amount = damage * (1 - distance / radius);
    if (target.takeDamage(amount, attacker)) damaged.push({ target, damage: amount });
  }
  return damaged;
}
