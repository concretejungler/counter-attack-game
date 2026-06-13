import type { SpellDef } from '../sim/types';

/** Household Sorcery — Phase 1 grimoire. Mana ("Static Charge") builds from kills and sweeping. */
export const SPELL_DEFS: Record<string, SpellDef> = {
  'lemon-smite': {
    id: 'lemon-smite', name: 'Lemon Fresh Smite',
    cost: 32, cooldown: 11, kind: 'bolt', power: 45, radius: 1.6,
    desc: 'Citrus lightning. Smells amazing. Hurts considerably.',
  },
  'forbidden-slipper': {
    id: 'forbidden-slipper', name: 'The Forbidden Slipper',
    cost: 50, cooldown: 22, kind: 'lane', power: 120, radius: 1.0,
    desc: 'The universal mom-weapon, launched down an entire lane. Physics apologize afterward.',
  },
  'moooom': {
    id: 'moooom', name: 'MOOOOM!',
    cost: 90, cooldown: 150, kind: 'momHand', power: 99999, radius: 1.2,
    desc: 'The ultimate escalation. Mom\'s hand descends from on high and a lane simply stops existing.',
  },
};
