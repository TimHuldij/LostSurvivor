import { movementSpeeds } from './player.js';

const SAMPLE_INTERVAL = 250;

export class DebugPanel {
  constructor(panel) {
    this.panel = panel;
    this.fields = Object.fromEntries(
      [...panel.querySelectorAll('[data-debug]')].map(field => [field.dataset.debug, field]),
    );
    this.resetTiming();
  }

  toggle() {
    this.panel.hidden = !this.panel.hidden;
    if (!this.panel.hidden) this.resetTiming();
  }

  resetTiming() {
    this.sampleStart = null;
    this.frames = 0;
    this.fields.fps.textContent = '—';
    this.fields.frameTime.textContent = '—';
  }

  update(now, player, thirdPerson) {
    if (this.panel.hidden) return;
    if (this.sampleStart === null) {
      this.sampleStart = now;
    } else {
      this.frames++;
      const elapsed = now - this.sampleStart;
      if (elapsed < SAMPLE_INTERVAL) return;
      this.fields.fps.textContent = (this.frames * 1000 / elapsed).toFixed(0);
      this.fields.frameTime.textContent = `${(elapsed / this.frames).toFixed(1)} ms`;
      this.sampleStart = now;
      this.frames = 0;
    }

    const { position, speed, velocity, grounded, running } = player;
    const limits = movementSpeeds(thirdPerson);
    this.fields.x.textContent = position.x.toFixed(2);
    this.fields.y.textContent = position.y.toFixed(2);
    this.fields.z.textContent = position.z.toFixed(2);
    this.fields.speed.textContent = `${speed.toFixed(2)} m/s`;
    this.fields.vertical.textContent = `${velocity.y.toFixed(2)} m/s`;
    this.fields.walk.textContent = `${limits.walk.toFixed(1)} m/s`;
    this.fields.sprint.textContent = `${limits.sprint.toFixed(1)} m/s`;
    this.fields.state.textContent = !grounded ? 'Airborne' : speed < .12 ? 'Idle' : running ? 'Sprinting' : 'Walking';
    this.fields.camera.textContent = thirdPerson ? 'Third person' : 'First person';
  }
}
