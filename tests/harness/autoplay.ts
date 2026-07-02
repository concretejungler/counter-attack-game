import { Sim, SIM_DT } from '../../src/sim/sim';
import type { DifficultyId, LevelDef, SimCommand } from '../../src/sim/types';
import { CONTENT, levelById } from '../../src/content';

/**
 * Shared balance harness: a scripted "par player" that builds a per-level strategy,
 * sweeps the richest crumb pile every 2s, casts spells at clusters, auto-upgrades.
 * Placement is human-like: shapes are tried across rotations and nudges, towers mount
 * on real placed clutter cells; unaffordable towers retry next build phase.
 */

export interface Step {
  wave: number; // build phase BEFORE this wave index starts (0 = initial build)
  clutter?: [number, number, number?][]; // desired anchor c, r, surface (default 0)
  towers?: [string, number, number, number?][];
}

export interface Result {
  won: boolean;
  bites: number;
  wavesSurvived: number;
  simSeconds: number;
}

export function autoPlay(
  levelOrId: LevelDef | string,
  strategy: Step[],
  difficulty: DifficultyId,
  seed: number,
  opts: { upgrades?: boolean; spells?: boolean; log?: boolean } = {},
): Result {
  const level = typeof levelOrId === 'string' ? levelById(levelOrId) : levelOrId;
  const levelId = level.id;
  const sim = new Sim(level, { seed, difficulty, content: CONTENT });
  const upgrades = opts.upgrades ?? true;
  const spells = opts.spells ?? true;
  const cmd = (c: SimCommand) => sim.command(c);

  let lastSweep = 0;
  let done: Result | null = null;
  const maxTicks = Math.round(1500 / SIM_DT);
  const pendingTowers: [string, number, number, number][] = [];

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
      for (let i = 0; i < 6; i++) {
        let bestId = -1;
        let bestCost = Infinity;
        for (const tw of sim.state.towers.values()) {
          const def = CONTENT.towers[tw.def];
          if (tw.tier === 1 || tw.tier === 2) {
            const cost = def.tiers[tw.tier].cost;
            if (cost < bestCost && cost <= sim.state.crumbs) {
              bestCost = cost;
              bestId = tw.id;
            }
          } else if (!tw.branch && def.branches.length > 0) {
            const br = def.branches[0];
            if (br.cost <= sim.state.crumbs && br.cost < bestCost) {
              bestCost = br.cost;
              bestId = -tw.id;
            }
          }
        }
        if (bestId === -1 || bestCost === Infinity) break;
        if (bestId > 0) cmd({ type: 'upgradeTower', id: bestId });
        else {
          const tw = sim.state.towers.get(-bestId)!;
          cmd({ type: 'branchTower', id: -bestId, branch: CONTENT.towers[tw.def].branches[0].id });
        }
        sim.tick();
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

    if (sim.state.time - lastSweep >= 2) {
      lastSweep = sim.state.time;
      let best: { x: number; z: number; surface: number; v: number } | null = null;
      for (const ent of sim.state.crumbEnts.values()) {
        if (!best || ent.value > best.v) best = { x: ent.pos.x, z: ent.pos.z, surface: ent.surface, v: ent.value };
      }
      if (best) cmd({ type: 'sweep', surface: best.surface, x: best.x, z: best.z, radius: 1.4 });

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

export const BALANCE_SEEDS = [11, 12, 13];
