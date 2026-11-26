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
