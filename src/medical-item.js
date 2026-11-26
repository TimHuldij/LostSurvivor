import * as THREE from 'three';
import { EquippableItem } from './equippable-item.js';

function createMedicalKitModel() {
  const body = new THREE.Group();
  const fabric = new THREE.MeshStandardMaterial({ color: 0x62694e, roughness: .9 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xb5b18d, roughness: .78 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9c4635, roughness: .72 });
  const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(.31, .19, .23), fabric);
  caseMesh.castShadow = true;
  body.add(caseMesh);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(.33, .035, .24), trim);
  strap.position.y = .008;
  body.add(strap);
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(.043, .115, .012), red);
  vertical.position.set(0, .012, -.126);
  body.add(vertical);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(.115, .043, .012), red);
  horizontal.position.set(0, .012, -.126);
  body.add(horizontal);
  return body;
}

export class MedicalItem extends EquippableItem {
  constructor(reducedMotion = false) {
    const viewModel = createMedicalKitModel();
    const worldModel = viewModel.clone(true);
    worldModel.scale.setScalar(.52);
    super({
      worldModel,
      viewModel,
      restPosition: [.30, -.25, -.91],
      restRotation: [-.10, 0, -.06],
      equipOffset: [0, -.34, .18],
      walkSway: .008,
      idleSway: .002,
      useDuration: 1,
      reducedMotion,
    });
    this.maxUses = 2;
    this.healAmount = 40;
    this.uses = 0;
  }

  reset() {
    super.reset();
    this.uses = 0;
  }

  collect(amount = 1) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const count = Math.min(this.maxUses - this.uses, Math.floor(amount));
    this.uses += count;
    return count;
  }

  use(player) {
    if (!this.equipped || this.uses <= 0 || this.using || !this.beginUse()) return false;
    const restored = player?.heal?.(this.healAmount) ?? 0;
    if (!restored) {
      this.using = false;
      this.useElapsed = 0;
      return false;
    }
    this.uses--;
    return true;
  }
}
