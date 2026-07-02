import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';
import { CONTENT, levelById } from '../src/content';
import { autoPlay, BALANCE_SEEDS, type Step } from './harness/autoplay';

/**
 * World 1 balance gates. The shared par-player harness lives in tests/harness/autoplay.ts;
 * per-world suites (balance-w*.test.ts) reuse it.
 */

// ---------- par strategies ----------
const PAR: Record<string, Step[]> = {
  'kitchen-1': [
    { wave: 0, clutter: [[5, 0]], towers: [['sgt-spritz', 5, 0]] },
    { wave: 1, clutter: [[7, 1]], towers: [['old-smacky', 7, 1]] },
    { wave: 2, clutter: [[2, 1, 1]] },
    { wave: 3, towers: [['sgt-spritz', 2, 1, 1]] },
    { wave: 4, clutter: [[5, 1, 1]], towers: [['old-smacky', 5, 1, 1]] },
  ],
  'kitchen-2': [
    { wave: 0, clutter: [[6, 6]], towers: [['sgt-spritz', 6, 6]] },
    { wave: 1, clutter: [[8, 7]], towers: [['old-smacky', 8, 7]] },
    { wave: 2, clutter: [[0, 0, 2]], towers: [['sir-toastsalot', 0, 0, 2]] },
    { wave: 4, clutter: [[10, 4]], towers: [['sgt-spritz', 10, 4]] },
  ],
  'kitchen-3': [
    // cake lives on the stove — anti-air must live up there with it
    { wave: 0, clutter: [[5, 1, 1]], towers: [['sgt-spritz', 5, 1, 1]] },
    { wave: 1, clutter: [[5, 3, 1]], towers: [['old-smacky', 5, 3, 1]] },
    { wave: 2, clutter: [[6, 7]], towers: [['sir-toastsalot', 6, 7]] },
    { wave: 3, towers: [['stick-rick', 4, 8]] },
    { wave: 4, clutter: [[2, 2, 1]], towers: [['sgt-spritz', 2, 2, 1]] },
    { wave: 5, towers: [['stick-rick', 8, 8]] },
    { wave: 6, clutter: [[9, 8]], towers: [['old-smacky', 9, 8]] },
  ],
  'kitchen-4': [
    { wave: 0, clutter: [[3, 0, 1]], towers: [['sgt-spritz', 3, 0, 1]] },
    { wave: 1, clutter: [[5, 1, 1]], towers: [['the-coldfather', 5, 1, 1]] },
    { wave: 2, towers: [['gnomeo', 9, 5]] },
    { wave: 3, clutter: [[10, 6]], towers: [['sir-toastsalot', 10, 6]] },
    { wave: 4, clutter: [[1, 1, 1]], towers: [['old-smacky', 1, 1, 1]] },
    { wave: 6, towers: [['stick-rick', 5, 4]] },
  ],
  'kitchen-5': [
    // banquet cake at (4,2): spritz guards it from the vent flight corridor day one
    { wave: 0, clutter: [[6, 1, 1]], towers: [['sgt-spritz', 6, 1, 1]] },
    { wave: 1, clutter: [[2, 1, 1]], towers: [['sgt-spritz', 2, 1, 1]] },
    { wave: 2, clutter: [[7, 3, 1]], towers: [['old-smacky', 7, 3, 1]] },
    { wave: 3, clutter: [[6, 7]], towers: [['sir-toastsalot', 6, 7]] },
    { wave: 4, towers: [['stick-rick', 4, 9], ['stick-rick', 10, 9]] },
    { wave: 5, clutter: [[5, 3, 1]], towers: [['the-coldfather', 5, 3, 1]] },
    { wave: 6, clutter: [[12, 8]], towers: [['bandolero', 12, 8]] },
    { wave: 7, clutter: [[3, 3, 1]], towers: [['sgt-spritz', 3, 3, 1], ['gnomeo', 5, 9]] },
    { wave: 8, clutter: [[9, 7]], towers: [['old-smacky', 9, 7], ['sir-toastsalot', 9, 7]] },
  ],
};

describe('Balance: par player beats every kitchen level on houseguest', () => {
  for (const levelId of Object.keys(PAR)) {
    it(`${levelId}: wins ≥2/3 seeds with ≤6 avg bites`, () => {
      const results = BALANCE_SEEDS.map((s) => autoPlay(levelId, PAR[levelId], 'houseguest', s));
      const wins = results.filter((r) => r.won).length;
      const avgBites = results.reduce((a, r) => a + r.bites, 0) / results.length;
      const detail = results.map((r) => `${r.won ? 'W' : 'L'}(${r.bites}b,w${r.wavesSurvived})`).join(' ');
      console.log(`  ${levelId}: ${detail} avgBites=${avgBites.toFixed(1)}`);
      expect(wins, `${levelId} wins: ${detail}`).toBeGreaterThanOrEqual(2);
      expect(avgBites, `${levelId} avg bites`).toBeLessThanOrEqual(6);
    });
  }
});

describe('Balance: the game is HARD', () => {
  it('kitchen-1 with a single unupgraded spritz (no spells): the cake falls', () => {
    const minimal: Step[] = [{ wave: 0, clutter: [[5, 0]], towers: [['sgt-spritz', 5, 0]] }];
    const results = BALANCE_SEEDS.map((s) => autoPlay('kitchen-1', minimal, 'houseguest', s, { upgrades: false, spells: false }));
    const losses = results.filter((r) => !r.won).length;
    expect(losses, 'single-tower runs should lose').toBeGreaterThanOrEqual(2);
  });

  it('kitchen-5 par strategy crumbles on condemned difficulty', () => {
    const results = BALANCE_SEEDS.map((s) => autoPlay('kitchen-5', PAR['kitchen-5'], 'condemned', s));
    const losses = results.filter((r) => !r.won).length;
    expect(losses, 'condemned should punish par play').toBeGreaterThanOrEqual(2);
  });
});

describe('Performance: stress sim', () => {
  it('300 concurrent critters tick under 8ms average', () => {
    const level = levelById('kitchen-5');
    const sim = new Sim(level, { seed: 99, difficulty: 'houseguest', content: CONTENT });
    for (let i = 0; i < 300; i++) {
      sim.debugSpawn(['ant-worker', 'roach', 'fly-house', 'slug'][i % 4], { s: 0, c: (i % 13) + 1, r: (i % 9) + 1 });
    }
    expect(sim.state.critters.size).toBe(300);
    const t0 = performance.now();
    for (let i = 0; i < 150; i++) sim.tick();
    const avg = (performance.now() - t0) / 150;
    console.log(`  stress: ${avg.toFixed(2)}ms/tick with 300 critters`);
    expect(avg).toBeLessThan(8);
  });
});
