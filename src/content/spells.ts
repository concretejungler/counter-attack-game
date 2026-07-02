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
  'five-second-rule': {
    id: 'five-second-rule', name: 'Five-Second Rule',
    cost: 45, cooldown: 35, kind: 'timestop', power: 5,
    desc: 'Everything freezes long enough to decide if floor candy counts as strategy.',
  },
  'new-lemon-scent': {
    id: 'new-lemon-scent', name: 'New Lemon Scent',
    cost: 30, cooldown: 25, kind: 'cleanse', power: 0,
    desc: 'Scrubs the battlefield until even the smells have to wear little socks.',
  },
  'mystery-leftovers': {
    id: 'mystery-leftovers', name: 'Mystery Leftovers',
    cost: 25, cooldown: 30, kind: 'gamble', power: 0,
    desc: 'Could be treasure. Could be trouble. It is definitely moving.',
  },
  'insurance-claim': {
    id: 'insurance-claim', name: 'Insurance Claim',
    cost: 40, cooldown: 45, kind: 'repair', power: 0,
    desc: 'A clipboard appears, sighs professionally, and fixes everything with paperwork.',
  },
  'static-discharge': {
    id: 'static-discharge', name: 'Static Discharge',
    cost: 55, cooldown: 40, kind: 'handBuff', power: 8,
    desc: 'Turns your hand into winter socks on carpet. Bugs learn conductivity.',
  },
};
