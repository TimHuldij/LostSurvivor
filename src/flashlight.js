import * as THREE from 'three';
import { EquippableItem } from './equippable-item.js';

function createFlashlightModel() {
  const body = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x252a28, roughness: .48, metalness: .58 });
  const grip = new THREE.MeshStandardMaterial({ color: 0x414640, roughness: .9 });
  const lens = new THREE.MeshStandardMaterial({
    color: 0xe9d8a1, emissive: 0xffd77e, emissiveIntensity: .12,
    roughness: .25, metalness: .1,
  });
  const cylinder = (material, radiusTop, radiusBottom, length, z) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 12), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = z;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    body.add(mesh);
    return mesh;
  };
  cylinder(grip, .042, .046, .25, -.07);
  cylinder(dark, .073, .054, .095, -.245);
  cylinder(dark, .083, .073, .024, -.29);
  cylinder(lens, .053, .053, .008, -.304);
  return { body, lens };
}

export class Flashlight extends EquippableItem {
  constructor(scene, reducedMotion = false) {
    const { body, lens } = createFlashlightModel();
    const worldModel = body.clone(true);
    worldModel.scale.setScalar(.52);
    super({
      worldModel,
      viewModel: body,
      restPosition: [.36, -.22, -.92],
      restRotation: [-.08, 0, -.03],
      equipOffset: [0, -.36, .18],
      walkSway: .009,
      idleSway: .002,
      reducedMotion,
    });
    this.lens = lens;
    this.isOn = false;
    this.direction = new THREE.Vector3();
    this.target = new THREE.Object3D();
    this.light = new THREE.SpotLight(0xffe6bc, 110, 22, .39, .42, 1.4);
    this.light.castShadow = false;
    this.light.visible = false;
    this.light.target = this.target;
    scene.add(this.light, this.target);
  }

  reset() {
    super.reset();
    this.isOn = false;
    this.lens.emissiveIntensity = .12;
    this.light.visible = false;
  }

  setEquipped(equipped) {
    super.setEquipped(equipped);
    this.light.visible = equipped && this.isOn;
  }

  use() {
    if (!this.equipped) return false;
    this.isOn = !this.isOn;
    this.lens.emissiveIntensity = this.isOn ? 2.4 : .12;
    this.light.visible = this.isOn;
    return this.isOn;
  }

  updateLight(camera, selected) {
    this.light.visible = selected && this.isOn;
    if (!this.light.visible || !camera) return;
    camera.getWorldDirection(this.direction);
    this.light.position.copy(camera.position);
    this.target.position.copy(camera.position).addScaledVector(this.direction, 12);
    this.light.updateMatrixWorld();
    this.target.updateMatrixWorld();
  }
}
