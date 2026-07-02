import type { EventDef } from '../sim/types';

/**
 * Random Events (GAME-PROMPT §11) + Oh-Crap Scenarios (§12), mapped onto the small set of
 * sim-consumable effect keys the engine implements directly (see EventEffectKind in types.ts).
 * Choice events (antDiplomacy / overloadChoice / crumbAvalanche / sockStrike) wire into the
 * Oh-Crap pendingChoice machinery — option 1 is always the passive/decline default that the
 * 5-second deadline auto-picks.
 *
 * Not every §11/§12 entry maps cleanly onto the effect set; unmappable ones are logged in
 * CUTS.md rather than half-implemented (see that file for the full list + return points).
 */
export const EVENT_DEFS: Record<string, EventDef> = {
  // ---------- instant, non-choice ----------
  'doorbell-package': {
    id: 'doorbell-package',
    name: 'Doorbell Package',
    text: 'Ding-dong! A package on the porch, nudged open — crumbs spill everywhere.',
    weight: 3,
    kind: 'instant',
    effect: 'crumbRain',
  },
  'leftover-night': {
    id: 'leftover-night',
    name: 'Leftover Night',
    text: "Someone left plates out. Fresh crumb piles, right there for the taking (or the smelling).",
    weight: 3,
    kind: 'instant',
    effect: 'leftoverNight',
  },
  'someone-dropped-a-chip': {
    id: 'someone-dropped-a-chip',
    name: 'Someone Dropped a Chip',
    text: 'A whole chip, gone. The scent hits the swarm like a dinner bell.',
    weight: 2,
    kind: 'instant',
    effect: 'scentSpike',
  },
  'spin-cycle-quake': {
    id: 'spin-cycle-quake',
    name: 'Spin Cycle Quake',
    text: 'The washer hits spin cycle. The whole room shudders — towers stagger, crumbs scatter.',
    weight: 2,
    worlds: [6, 7, 9],
    kind: 'instant',
    effect: 'quake',
  },

  // ---------- timed, non-choice ----------
  'power-outage': {
    id: 'power-outage',
    name: 'Power Outage',
    text: 'The breaker trips. Every electronic tower in the house goes dark.',
    weight: 3,
    kind: 'timed',
    durationSec: 12,
    effect: 'powerOutage',
  },
  'open-window-gust': {
    id: 'open-window-gust',
    name: 'Open Window Gust',
    text: 'Someone left a window open. The fliers catch a tailwind.',
    weight: 3,
    kind: 'timed',
    durationSec: 15,
    effect: 'gust',
  },
  'tv-time-truce': {
    id: 'tv-time-truce',
    name: 'TV Time Truce',
    text: 'Everybody — critters AND towers — stops to watch TV. It will not last.',
    weight: 2,
    kind: 'timed',
    durationSec: 5,
    effect: 'tvTruce',
  },

  // ---------- Oh-Crap choice scenarios (§12) ----------
  'ant-diplomacy': {
    id: 'ant-diplomacy',
    name: 'Ant Diplomacy',
    text: 'An ant envoy waves a tiny white flag at the door. They want to talk terms.',
    weight: 2,
    worlds: [1, 2, 3, 4],
    kind: 'instant',
    effect: 'antDiplomacy',
    choice: {
      prompt: 'Ant envoy offers a 3-wave ceasefire for 50% of your crumbs. Accept?',
      options: ['Pay the tribute (ceasefire)', 'Decline — no deal'],
    },
  },
  'the-overload-choice': {
    id: 'the-overload-choice',
    name: 'The Overload Choice',
    text: 'A storm surge crackles through the outlets. Every electronic tower could go into overdrive.',
    weight: 2,
    kind: 'instant',
    effect: 'overloadChoice',
    choice: {
      prompt: 'Overclock all zap/light/sonic towers: +100% fire rate for 20s, but each risks a 10s burnout. Overclock?',
      options: ['Overclock (risky power spike)', 'Play it safe'],
    },
  },
  'crumb-avalanche': {
    id: 'crumb-avalanche',
    name: 'The Crumb Avalanche',
    text: 'A shelf tips. 500 crumbs worth of snacks hit the floor at once.',
    weight: 2,
    kind: 'instant',
    effect: 'crumbAvalanche',
    choice: {
      prompt: '500 crumbs just spilled. Brace for a sweep jackpot, or call MOOOOM for an instant (safer) refund?',
      options: ['Brace — sweep it yourself', 'MOOOOM! (instant partial refund)'],
    },
  },
  'sock-strike': {
    id: 'sock-strike',
    name: 'The Sock Strike',
    text: 'Old Stinky unionizes mid-wave. Every tower downs tools unless hazard pay is met.',
    weight: 2,
    worlds: [1, 2, 3, 4, 5],
    kind: 'instant',
    effect: 'sockStrike',
    choice: {
      prompt: 'Old Stinky demands 100 crumbs in hazard pay, or every tower stops for 10 seconds. Pay up?',
      options: ['Pay 100 crumbs', 'Let them strike (10s tower stoppage)'],
    },
  },
};
