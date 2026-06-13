import type { CritterDef } from '../sim/types';

/**
 * The Infestation — Phase 1 bestiary (Kitchen campaign).
 * desc fields are Critterdex entries, written in the kid's field-journal voice.
 */
export const CRITTER_DEFS: Record<string, CritterDef> = {
  'ant-worker': {
    id: 'ant-worker', name: 'Worker Ant', tier: 1,
    hp: 14, speed: 2.2, size: 0.22, bounty: 4, bites: 1,
    resist: null, weak: 'spray',
    crumbHunger: 12, evolveTo: 'ant-soldier',
    desc: 'The basic unit of crime. One is nothing. One is never one. DO NOT leave crumbs out, they get IDEAS and also SHOULDERS.',
  },
  'ant-soldier': {
    id: 'ant-soldier', name: 'Soldier Ant', tier: 2,
    hp: 34, speed: 2.0, size: 0.3, bounty: 7, bites: 1,
    resist: 'gas', weak: 'spray', armor: 1,
    desc: 'A worker ant that ate its vegetables (our crumbs). Has a helmet now?? Where did it get a helmet.',
  },
  'ant-bullet': {
    id: 'ant-bullet', name: 'Bullet Ant', tier: 2,
    hp: 10, speed: 4.2, size: 0.2, bounty: 5, bites: 1,
    resist: null, weak: 'cold',
    desc: 'NyoooOOOOM. Blink and it\'s in the pantry. Cold makes it grumpy and slow, like dad before coffee.',
  },
  'fly-house': {
    id: 'fly-house', name: 'Housefly', tier: 1,
    hp: 16, speed: 2.8, size: 0.28, bounty: 6, bites: 1,
    resist: 'spray', weak: 'swat', flying: true,
    traits: ['dodgeFirst'],
    desc: 'Dodges the first swing EVERY TIME like it\'s showing off. The second swing is personal.',
  },
  'fly-fruit': {
    id: 'fly-fruit', name: 'Fruit Fly', tier: 1,
    hp: 3, speed: 3.2, size: 0.15, bounty: 1, bites: 1,
    resist: null, weak: 'gas', flying: true,
    desc: 'Individually: nothing. Collectively: a weather system with opinions about bananas.',
  },
  'roach': {
    id: 'roach', name: 'Cockroach', tier: 3,
    hp: 60, speed: 1.7, size: 0.42, bounty: 12, bites: 1,
    resist: 'swat', weak: 'gas', armor: 1,
    traits: ['playDead'],
    desc: 'Plays dead and you WILL fall for it. Grandpa says they\'ll outlive the sun. The sun should watch its back.',
  },
  'mouse-thief': {
    id: 'mouse-thief', name: 'Mouse Thief', tier: 3,
    hp: 90, speed: 3.6, size: 0.55, bounty: 20, bites: 0,
    resist: 'cold', weak: 'zap',
    traits: ['thief'], chewDps: 12,
    desc: 'Does NOT nibble. Takes the WHOLE SLICE and runs like it has a getaway car. GET IT BEFORE THE EXIT!!',
  },
  'slug': {
    id: 'slug', name: 'Slug', tier: 2,
    hp: 50, speed: 0.8, size: 0.38, bounty: 10, bites: 1,
    resist: 'spray', weak: 'heat',
    desc: 'Slow. SO slow. But it never stops. It\'s probably behind you right now. (Check tomorrow.)',
  },
  'snail': {
    id: 'snail', name: 'Snail', tier: 3,
    hp: 80, speed: 0.6, size: 0.4, bounty: 14, bites: 1,
    resist: 'swat', weak: 'heat', armor: 4,
    desc: 'A slug that found ARMOR. The shell counts as a house, which makes this a home invasion BY a home.',
  },
  'moth': {
    id: 'moth', name: 'Moth', tier: 2,
    hp: 22, speed: 2.4, size: 0.35, bounty: 8, bites: 1,
    resist: 'cold', weak: 'heat', flying: true,
    desc: 'Like a butterfly that gave up. Obsessed with the lamp. The lamp does not feel the same way.',
  },
  'dust-bunny': {
    id: 'dust-bunny', name: 'Dust Bunny', tier: 2,
    hp: 26, speed: 1.4, size: 0.45, bounty: 6, bites: 1,
    resist: 'swat', weak: 'spray',
    splitInto: { def: 'dust-bunnette', count: 2 },
    desc: 'From the Under-Couch Dimension. Hit it and it becomes TWO smaller problems. Math is against us.',
  },
  'dust-bunnette': {
    id: 'dust-bunnette', name: 'Dust Bunnette', tier: 1,
    hp: 8, speed: 1.8, size: 0.25, bounty: 2, bites: 1,
    resist: null, weak: 'spray',
    desc: 'A dust bunny\'s revenge. Smaller, faster, somehow angrier.',
  },
  'stinkbug': {
    id: 'stinkbug', name: 'Stink Bug', tier: 3,
    hp: 45, speed: 1.5, size: 0.4, bounty: 12, bites: 1,
    resist: 'gas', weak: 'swat',
    traits: ['deathGas'],
    desc: 'A walking dare. Pop it near your towers and they ALL take a smell break. Pop it far away. FAR. AWAY.',
  },
  'crumb-king': {
    id: 'crumb-king', name: 'The Crumb King', tier: 5,
    hp: 1400, speed: 0.55, size: 1.1, bounty: 150, bites: 3,
    resist: 'spray', weak: null, boss: true, chewDps: 30,
    traits: ['crumbShed', 'crumbHeal'],
    desc: 'A royal wad of every crumb ever lost behind the toaster. Drops crumbs. EATS crumbs. HEALS with crumbs. SWEEP DURING THE FIGHT or he never ever falls. His first words were "let them eat cake — let ME eat cake."',
  },
};
