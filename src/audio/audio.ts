/** WebAudio core: lazy context (first gesture), master chain, music/sfx buses. */
export class AudioMan {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  private unlocked = false;

  constructor() {
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      this.ensure();
      removeEventListener('pointerdown', unlock);
      removeEventListener('keydown', unlock);
    };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
  }

  ensure(): AudioContext | null {
    if (!this.unlocked) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setVolumes(music: number, sfx: number): void {
    if (!this.ctx) return;
    this.musicBus.gain.value = music * 0.7;
    this.sfxBus.gain.value = sfx;
  }
}
