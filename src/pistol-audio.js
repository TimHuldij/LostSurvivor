const SOUNDS = {
  fire: { noise: [[1260, .17, .50], [330, .20, .26, .012]], tone: [[126, 47, .12, .41]] },
  dry: { noise: [[2600, .026, .27]], tone: [[880, 460, .025, .14]] },
  cloth: { noise: [[730, .13, .17]] },
  release: { noise: [[2190, .037, .34]], tone: [[660, 250, .040, .16]] },
  swap: { noise: [[1420, .093, .26], [2800, .044, .18, .027]] },
  seat: { noise: [[1780, .054, .42]], tone: [[290, 93, .073, .29]] },
  settle: { noise: [[3060, .029, .28], [1200, .039, .19, .018]] },
};

export class PistolAudio {
  unlock() {
    if (!globalThis.AudioContext) return;
    try {
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        this.output = context.createGain();
        this.output.gain.value = .48;
        this.output.connect(context.destination);
        this.noise = context.createBuffer(1, Math.ceil(context.sampleRate / 4), context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (this.context.state !== 'running') this.context.resume().catch(() => {});
    } catch {
      // The game can still run on a browser or device without audio output.
    }
  }

  envelope(start, duration, volume) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .004);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    gain.connect(this.output);
    return gain;
  }

  play(name) {
    if (this.context?.state !== 'running' || !this.noise) return;
    const { context } = this;
    const { noise = [], tone = [] } = SOUNDS[name];
    const now = context.currentTime;
    for (const [frequency, duration, volume, delay = 0] of noise) {
      const start = now + delay;
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      source.buffer = this.noise;
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = .65;
      const gain = this.envelope(start, duration, volume);
      source.connect(filter).connect(gain);
      source.start(start);
      source.stop(start + duration);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }

    for (const [frequency, endFrequency, duration, volume] of tone) {
      const source = context.createOscillator();
      source.frequency.setValueAtTime(frequency, now);
      source.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
      const gain = this.envelope(now, duration, volume);
      source.connect(gain);
      source.start(now);
      source.stop(now + duration);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
    }
  }
}
