// Quick audit: wave mass + economy per level (run with npx tsx tools/audit-levels.mjs)
import { KITCHEN_LEVELS } from '../src/content/levels/kitchen.ts';
import { LIVING_LEVELS } from '../src/content/levels/living.ts';
import { BATHROOM_LEVELS } from '../src/content/levels/bathroom.ts';
import { BEDROOM_LEVELS } from '../src/content/levels/bedroom.ts';
import { GARAGE_LEVELS } from '../src/content/levels/garage.ts';
import { BASEMENT_LEVELS } from '../src/content/levels/basement.ts';
import { ATTIC_LEVELS } from '../src/content/levels/attic.ts';
import { BACKYARD_LEVELS } from '../src/content/levels/backyard.ts';
import { SEWER_LEVELS } from '../src/content/levels/sewer.ts';
import { CRITTER_DEFS } from '../src/content/critters.ts';

const all = [
  ...KITCHEN_LEVELS, ...LIVING_LEVELS, ...BATHROOM_LEVELS, ...BEDROOM_LEVELS,
  ...GARAGE_LEVELS, ...BASEMENT_LEVELS, ...ATTIC_LEVELS, ...BACKYARD_LEVELS, ...SEWER_LEVELS,
];
for (const l of all) {
  const perWave = l.waves.map((w) => w.entries.reduce((a, e) => a + e.count, 0));
  const total = perWave.reduce((a, b) => a + b, 0);
  const hp = l.waves.reduce((a, w) => a + w.entries.reduce((x, e) => x + e.count * (CRITTER_DEFS[e.critter]?.hp ?? 0), 0), 0);
  console.log(
    `${l.id.padEnd(12)} waves=${String(l.waves.length).padStart(2)} critters=${String(total).padStart(4)} ` +
    `hpMass=${String(hp).padStart(6)} crumbs=${String(l.startCrumbs).padStart(3)} perWave=[${perWave.join(',')}]`,
  );
}
