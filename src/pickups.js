import * as THREE from 'three';

export class AmmoPickup {
  constructor(scene, position, { amount = 30, ammoType = 'rifle', limit = 180 } = {}) {
    this.position = new THREE.Vector3(...position);
    this.amount = amount;
    this.initialAmount = amount;
    this.ammoType = ammoType;
    this.limit = limit;
    this.root = new THREE.Group();
    this.root.position.copy(this.position);
    const box = new THREE.Mesh(new THREE.BoxGeometry(.42, .25, .28),
      new THREE.MeshStandardMaterial({ color: 0x586047, roughness: .85 }));
    box.position.y = .125;
    box.castShadow = true;
    this.root.add(box);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.32, .012, .035),
      new THREE.MeshStandardMaterial({ color: 0xc6a766, roughness: .8 }));
    stripe.position.set(0, .256, 0);
    this.root.add(stripe);
    scene.add(this.root);
  }

  reset() { this.amount = this.initialAmount; this.root.visible = true; }

  collect(inventory) {
    const weapon = this.ammoType === 'rifle' ? inventory.rifle : null;
    if (!weapon || this.amount <= 0) return 0;
    const count = Math.max(0, Math.min(this.amount, this.limit - weapon.reserve));
    weapon.reserve += count;
    this.amount -= count;
    if (!this.amount) this.root.visible = false;
    return count;
  }

  get prompt() { return 'Collect rifle ammunition'; }

  focus(camera, player, obstacles) {
    if (!this.amount || this.position.distanceTo(player.position) > 2.4) return false;
    const origin = camera.position;
    const target = this.position.clone().add(new THREE.Vector3(0, .13, 0));
    const delta = target.sub(origin);
    const distance = delta.length();
    const direction = camera.getWorldDirection(new THREE.Vector3());
    if (delta.normalize().dot(direction) < .94) return false;
    const ray = new THREE.Ray(origin, delta);
    return !obstacles.some(box => {
      const hit = ray.intersectBox(box, new THREE.Vector3());
      return hit && origin.distanceTo(hit) < distance - .12;
    });
  }
}

export class MedicalPickup extends AmmoPickup {
  constructor(scene, position, { amount = 1 } = {}) {
    super(scene, position, { amount, ammoType: 'medical', limit: 2 });
    this.root.children[0].material = new THREE.MeshStandardMaterial({ color: 0x777b5c, roughness: .88 });
    const marking = new THREE.MeshStandardMaterial({ color: 0xa94435, roughness: .75 });
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(.045, .014, .12), marking);
    vertical.position.set(0, .26, 0);
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(.14, .014, .045), marking);
    horizontal.position.set(0, .26, 0);
    this.root.add(vertical, horizontal);
  }

  get prompt() { return 'Collect medical supplies'; }

  collect(inventory) {
    const count = inventory.medical.collect(this.amount);
    this.amount -= count;
    if (!this.amount) this.root.visible = false;
    return count;
  }
}

export class GrenadePickup extends AmmoPickup {
  constructor(scene, position, { amount = 1 } = {}) {
    super(scene, position, { amount, ammoType: 'grenade', limit: 2 });
    this.root.children[0].material = new THREE.MeshStandardMaterial({ color: 0x48523d, roughness: .78 });
    this.root.children[1].material = new THREE.MeshStandardMaterial({ color: 0xc28b46, roughness: .72 });
  }

  get prompt() { return 'Collect grenade'; }

  collect(inventory) {
    const count = inventory.grenade.collect(this.amount);
    this.amount -= count;
    if (!this.amount) this.root.visible = false;
    return count;
  }
}
