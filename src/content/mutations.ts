import type { MutationDef } from '../sim/types';

/** The swarm evolves — and YOU pick how. Lesser of three evils, every time. */
export const MUTATION_DEFS: Record<string, MutationDef> = {
  'thick-shells': {
    id: 'thick-shells', name: 'Thick Shells',
    desc: 'Every critter gains +25% health. They heard about your swatter.',
    mod: { allHpPct: 0.25 },
  },
  'hyper-legs': {
    id: 'hyper-legs', name: 'Hyper Legs',
    desc: 'Every critter moves +15% faster. They skipped leg day to do MORE leg day.',
    mod: { allSpeedPct: 0.15 },
  },
  'lean-times': {
    id: 'lean-times', name: 'Lean Times',
    desc: 'Critters drop 15% fewer crumbs. They started budgeting.',
    mod: { bountyPct: -0.15 },
  },
  'double-dead': {
    id: 'double-dead', name: 'Double Dead',
    desc: 'Roaches play dead TWICE. You will fall for it twice.',
    mod: { roachExtraPlayDead: 1 },
  },
  'gym-membership': {
    id: 'gym-membership', name: 'Gym Membership',
    desc: '+20% health, +5% speed. The infestation got a Costco card.',
    mod: { allHpPct: 0.2, allSpeedPct: 0.05 },
  },
  'termite-jaws': {
    id: 'termite-jaws', name: 'Termite Jaws',
    desc: 'Critters chew through your clutter 60% faster. Your walls are now snacks.',
    mod: { chewPct: 0.6 },
  },
  'top-gun': {
    id: 'top-gun', name: 'Top Gun',
    desc: 'Fliers gain +50% health. They watched the movie. Twice.',
    mod: { flierHpPct: 0.5 },
  },
  'marathon-training': {
    id: 'marathon-training', name: 'Marathon Training',
    desc: 'Every critter moves +22% faster. They are hydrated and ready.',
    mod: { allSpeedPct: 0.22 },
  },
  'armored-airspace': {
    id: 'armored-airspace', name: 'Armored Airspace',
    desc: 'Fliers gain +30% health and every critter moves +6% faster. The sky has unionized.',
    mod: { flierHpPct: 0.3, allSpeedPct: 0.06 },
  },
  'crumb-recession': {
    id: 'crumb-recession', name: 'Crumb Recession',
    desc: '+10% health, 25% fewer bounties. The swarm hired an accountant and the accountant hates you.',
    mod: { allHpPct: 0.1, bountyPct: -0.25 },
  },
  'false-finale': {
    id: 'false-finale', name: 'False Finale',
    desc: 'Roaches gain two extra fake deaths and everyone gets +5% health. Double-tap is now a lifestyle.',
    mod: { roachExtraPlayDead: 2, allHpPct: 0.05 },
  },
  'chewing-union': {
    id: 'chewing-union', name: 'Chewing Union',
    desc: 'Clutter chewing is +45% faster and the line moves +7% faster. Your maze is a lunch break.',
    mod: { chewPct: 0.45, allSpeedPct: 0.07 },
  },
  'bulk-buy-bodies': {
    id: 'bulk-buy-bodies', name: 'Bulk-Buy Bodies',
    desc: '+35% health, 10% fewer crumbs. They bought durability wholesale and passed the savings to nobody.',
    mod: { allHpPct: 0.35, bountyPct: -0.1 },
  },
  'caffeine-mandibles': {
    id: 'caffeine-mandibles', name: 'Caffeine Mandibles',
    desc: '+18% speed and +25% chewing. Something in the walls found an energy drink.',
    mod: { allSpeedPct: 0.18, chewPct: 0.25 },
  },
  'window-seat-upgrade': {
    id: 'window-seat-upgrade', name: 'Window Seat Upgrade',
    desc: 'Fliers gain +40% health but drop 8% fewer crumbs. Air travel remains unfair.',
    mod: { flierHpPct: 0.4, bountyPct: -0.08 },
  },
  'bad-generation': {
    id: 'bad-generation', name: 'Bad Generation',
    desc: '+18% health and +12% speed. The next wave grew up with no respect for frosting.',
    mod: { allHpPct: 0.18, allSpeedPct: 0.12 },
  },
};
