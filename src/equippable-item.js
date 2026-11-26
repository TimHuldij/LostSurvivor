import * as THREE from 'three';

export class EquippableItem {
  constructor({
    worldModel,
    viewModel,
    restPosition = [.34, -.24, -1.05],
    restRotation = [0, 0, 0],
    equipOffset = [0, -.42, .20],
    walkSway = .012,
    idleSway = .003,
    equipSpeed = 14,
    strideRate = 2.7,
    useDuration = .72,
    reducedMotion = false,
  }) {
    this.worldModel = worldModel;
    this.viewModel = viewModel;
    this.restPosition = new THREE.Vector3(...restPosition);
    this.restRotation = new THREE.Euler(...restRotation);
    this.equipOffset = new THREE.Vector3(...equipOffset);
    this.walkSway = walkSway;
    this.idleSway = idleSway;
    this.equipSpeed = equipSpeed;
    this.strideRate = strideRate;
    this.useDuration = useDuration;
    this.reducedMotion = reducedMotion;
    this.equipped = false;
    this.equipBlend = 0;
    this.clock = 0;
    this.stride = 0;
    this.useElapsed = 0;
    this.useBlend = 0;
    this.using = false;
    this.viewModel.visible = false;
  }

  reset() {
    this.equipped = false;
    this.equipBlend = 0;
    this.clock = 0;
    this.stride = 0;
    this.useElapsed = 0;
    this.useBlend = 0;
    this.using = false;
    this.viewModel.visible = false;
  }

  setEquipped(equipped) {
    this.equipped = equipped;
    if (equipped) this.viewModel.visible = true;
    else {
      this.using = false;
      this.useElapsed = 0;
      this.useBlend = 0;
    }
  }

  beginUse() {
    if (!this.equipped || this.using) return false;
    this.using = true;
    this.useElapsed = 0;
    return true;
  }

  use() {
    return false;
  }

  update(delta, speed, aspect = 1.38) {
    this.clock += delta;
    this.stride += speed * delta * this.strideRate;
    this.equipBlend = THREE.MathUtils.damp(this.equipBlend, Number(this.equipped), this.equipSpeed, delta);
    if (this.using) {
      this.useElapsed += delta;
      const progress = this.useElapsed / this.useDuration;
      this.useBlend = Math.sin(Math.PI * THREE.MathUtils.clamp(progress, 0, 1));
      if (progress >= 1) {
        this.using = false;
        this.useElapsed = 0;
        this.useBlend = 0;
      }
    }
    if (!this.equipped && this.equipBlend < .002) this.viewModel.visible = false;
    if (!this.viewModel.visible) return;

    const walk = this.reducedMotion ? 0 : Math.min(speed / 5, 1);
    const idle = this.reducedMotion ? 0 : 1 - walk;
    const lowered = 1 - this.equipBlend;
    const aspectScale = THREE.MathUtils.clamp(aspect / 1.38, .6, 1.15);
    this.viewModel.position.set(
      this.restPosition.x * aspectScale + Math.sin(this.stride) * this.walkSway * walk,
      this.restPosition.y + lowered * this.equipOffset.y +
        Math.cos(this.stride * 2) * this.walkSway * .7 * walk +
        Math.sin(this.clock * .86) * this.idleSway * idle +
        this.useBlend * .16,
      this.restPosition.z + lowered * this.equipOffset.z - this.useBlend * .12,
    );
    this.viewModel.rotation.set(
      this.restRotation.x + lowered * .24 - this.useBlend * .48,
      this.restRotation.y,
      this.restRotation.z + Math.sin(this.stride) * this.walkSway * 1.6 * walk +
        Math.sin(this.clock * .76) * this.idleSway * idle,
    );
  }
}
