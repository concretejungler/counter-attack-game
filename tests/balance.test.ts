import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { DifficultyId, SimCommand } from '../src/sim/types';
import { CONTENT, levelById } from '../src/content';

/**
 * The par player: executes a scripted build order, then plays diligently —
 * sweeps the richest crumb pile every 2s, casts spells at clusters, auto-upgrades.
 * Balance gates live here: every level winnable by par play, never trivially.
 */

interface Step {
  wave: number; // build phase BEFORE this wave index starts (0 = initial build)
  clutter?: [number, number, number?][]; // anchor c, r, surface (default 0) — filled from hand in order
  towers?: [string, number, number, number?][];
}

interface Result {
  won: boolean;
  bites: number;
  wavesSurvived: number;
  simSeconds: number;
}

function autoPlay(levelId: string, strategy: Step[], difficulty: DifficultyId, seed: number, opts: { upgrades?: boolean; spells?: boolean; log?: boolean } = {}): Result {
  const level = levelById(levelId);
  const sim = new Sim(level, { seed, difficulty, content: CONTENT });
  const upgrades = opts.upgrades ?? true;
  const spells = opts.spells ?? true;
  const cmd = (c: SimCommand) => sim.command(c);

  let lastSweep = 0;
  let done: Result | null = null;
  const maxTicks = Math.round(1500 / SIM_DT);
  const pendingTowers: [string, number, number, number][] = []; // couldn't afford yet — retry next build phase

  // A human sees where the piece actually lands; the script must too.
  // Try each shape in hand × rotations × small anchor nudges until one sticks.
  const placeClutterSmart = (c: number, r: number, s: number): boolean => {
    const before = sim.state.clutter.size;
    for (const shape of [...sim.state.clutterHand]) {
      for (const rot of [0, 1, 2, 3] as const) {
        for (const [dc, dr] of [[0, 0], [-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1]]) {
          cmd({ type: 'placeClutter', shape, rot, at: { s, c: c + dc, r: r + dr } });
          sim.tick();
          if (sim.state.clutter.size > before) return true;
        }
      }
    }
    if (opts.log) console.log(`    [${levelId}] clutter FAILED at ${c},${r} s${s} (hand: ${sim.state.clutterHand.join(',')})`);
    return false;
  };

  // Mount towers on a real clutter cell with a free slot, nearest the requested tile.
  const placeTowerSmart = (def: string, c: number, r: number, s: number): boolean => {
    const td = CONTENT.towers[def];
    if (!td) return false;
    if (td.tiers[0].cost > sim.state.crumbs) {
      pendingTowers.push([def, c, r, s]);
      return false;
    }
    const before = sim.state.towers.size;
    const candidates: { s: number; c: number; r: number }[] = [];
    if (td.attack === 'trap' || td.floorMount) {
      for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        candidates.push({ s, c: c + dc, r: r + dr });
      }
    } else {
      const cells: { s: number; c: number; r: number; d: number }[] = [];
      for (const piece of sim.state.clutter.values()) {
        const shape = CONTENT.shapes[piece.shape];
        if (piece.mounted.length >= shape.mountSlots) continue;
        for (const cell of piece.cells) {
          if (cell.s !== s) continue;
          cells.push({ ...cell, d: Math.abs(cell.c - c) + Math.abs(cell.r - r) });
        }
      }
      cells.sort((a, b) => a.d - b.d);
      candidates.push(...cells);
    }
    for (const at of candidates) {
      cmd({ type: 'placeTower', def, at });
      sim.tick();
      if (sim.state.towers.size > before) return true;
    }
    if (opts.log) console.log(`    [${levelId}] tower ${def} FAILED near ${c},${r} s${s} (crumbs ${sim.state.crumbs}, clutter ${sim.state.clutter.size})`);
    return false;
  };

  const doBuildPhase = (waveIdx: number) => {
    const step = strategy.find((s) => s.wave === waveIdx);
    const retries = pendingTowers.splice(0, pendingTowers.length);
    for (const [def, c, r, s] of retries) placeTowerSmart(def, c, r, s);
    if (step) {
      for (const [c, r, s] of step.clutter ?? []) placeClutterSmart(c, r, s ?? 0);
      for (const [def, c, r, s] of step.towers ?? []) placeTowerSmart(def, c, r, s ?? 0);
    }
    if (upgrades) {
      // greedy: cheapest upgrade first, then branches
      for (let i = 0; i < 6; i++) {
        let bestId = -1;
        let bestCost = Infinity;
        for (const tw of sim.state.towers.values()) {
          const def = CONTENT.towers[tw.def];
          if (tw.tier < 3) {
            const cost = def.tiers[tw.tier].cost;
            if (cost < bestCost && cost <= sim.state.crumbs) {
              bestCost = cost;
              bestId = tw.id;
            }
          } else if (!tw.branch && def.branches.length > 0) {
            const br = def.branches[0];
            if (br.cost <= sim.state.crumbs && br.cost < bestCost) {
              bestCost = br.cost;
              bestId = -tw.id; // negative marks branch
            }
          }
        }
        if (bestId === -1 || bestCost === Infinity) break;
        if (bestId > 0) cmd({ type: 'upgradeTower', id: bestId });
        else {
          const tw = sim.state.towers.get(-bestId)!;
          cmd({ type: 'branchTower', id: -bestId, branch: CONTENT.towers[tw.def].branches[0].id });
        }
        sim.tick(); // let it apply so crumbs update
      }
    }
  };

  doBuildPhase(0);
  cmd({ type: 'callWave' });

  for (let t = 0; t < maxTicks && !done; t++) {
    const events = sim.tick();
    for (const ev of events) {
      if (ev.t === 'won') done = { won: true, bites: sim.state.cakeMax - sim.state.cakeSlices, wavesSurvived: sim.state.waveIndex + 1, simSeconds: sim.state.time };
      if (ev.t === 'lost') done = { won: false, bites: sim.state.cakeMax - sim.state.cakeSlices, wavesSurvived: sim.state.waveIndex, simSeconds: sim.state.time };
      if (ev.t === 'buildPhase') {
        doBuildPhase(ev.index);
        cmd({ type: 'callWave' });
      }
      if (ev.t === 'mutationOffer') {
        cmd({ type: 'pickMutation', id: ev.options[0] });
        cmd({ type: 'callWave' });
      }
    }

    // diligent housekeeping every 2s
    if (sim.state.time - lastSweep >= 2) {
      lastSweep = sim.state.time;
      let best: { x: number; z: number; surface: number; v: number } | null = null;
      for (const ent of sim.state.crumbEnts.values()) {
        if (!best || ent.value > best.v) best = { x: ent.pos.x, z: ent.pos.z, surface: ent.surface, v: ent.value };
      }
      if (best) cmd({ type: 'sweep', surface: best.surface, x: best.x, z: best.z, radius: 1.4 });

      // spells at clusters
      const critters = [...sim.state.critters.values()];
      if (spells && critters.length >= 5) {
        const boss = critters.find((c) => CONTENT.critters[c.def]?.boss);
        if (boss && sim.state.mana >= 90 && (sim.state.spellCds['moooom'] ?? 0) <= 0) {
          cmd({ type: 'castSpell', spell: 'moooom', surface: boss.surface, x: boss.pos.x, z: boss.pos.z });
        } else if (sim.state.mana >= 25 && (sim.state.spellCds['lemon-smite'] ?? 0) <= 0) {
          const target = critters[Math.floor(critters.length / 2)];
          cmd({ type: 'castSpell', spell: 'lemon-smite', surface: target.surface, x: target.pos.x, z: target.pos.z });
        }
      }
    }
  }
  if (opts.log) {
    const twList = [...sim.state.towers.values()].map((t) => `${t.def}T${t.tier}${t.branch ? 'B' : ''}@s${t.tile.s}(${t.tile.c},${t.tile.r})k${t.kills}`).join(' ');
    console.log(`    [${levelId}] towers: ${twList}`);
    console.log(`    [${levelId}] bites: ${JSON.stringify(sim.state.recap.bitesBySource)} kills=${sim.state.recap.kills} crumbs=${sim.state.crumbs}`);
  }
  return done ?? { won: false, bites: sim.state.cakeMax - sim.state.cakeSlices, wavesSurvived: sim.state.waveIndex, simSeconds: sim.state.time };
}

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

const SEEDS = [11, 12, 13];

describe('Balance: par player beats every kitchen level on houseguest', () => {
  for (const levelId of Object.keys(PAR)) {
    it(`${levelId}: wins ≥2/3 seeds with ≤6 avg bites`, () => {
      const results = SEEDS.map((s) => autoPlay(levelId, PAR[levelId], 'houseguest', s));
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
    const results = SEEDS.map((s) => autoPlay('kitchen-1', minimal, 'houseguest', s, { upgrades: false, spells: false }));
    const losses = results.filter((r) => !r.won).length;
    expect(losses, 'single-tower runs should lose').toBeGreaterThanOrEqual(2);
  });

  it('kitchen-5 par strategy crumbles on condemned difficulty', () => {
    const results = SEEDS.map((s) => autoPlay('kitchen-5', PAR['kitchen-5'], 'condemned', s));
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
