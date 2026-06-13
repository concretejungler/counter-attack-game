import type { WaveDef } from './types';

export interface SpawnRequest {
  critter: string;
  spawn: string;
}

interface EntryRuntime {
  critter: string;
  spawn: string;
  remaining: number;
  interval: number;
  nextAt: number;   // wave-time of next spawn
}

/** Schedules one wave's spawns. Scent scaling is applied to counts at construction. */
export class WaveRuntime {
  private t = 0;
  private entries: EntryRuntime[];

  constructor(wave: WaveDef, countScale: number) {
    this.entries = wave.entries.map((e) => ({
      critter: e.critter,
      spawn: e.spawn,
      remaining: Math.max(1, Math.ceil(e.count * countScale)),
      interval: e.interval,
      nextAt: e.delay,
    }));
  }

  update(dt: number): SpawnRequest[] {
    this.t += dt;
    const out: SpawnRequest[] = [];
    for (const e of this.entries) {
      while (e.remaining > 0 && this.t >= e.nextAt) {
        out.push({ critter: e.critter, spawn: e.spawn });
        e.remaining--;
        e.nextAt += e.interval;
      }
    }
    return out;
  }

  get done(): boolean {
    return this.entries.every((e) => e.remaining === 0);
  }
}
