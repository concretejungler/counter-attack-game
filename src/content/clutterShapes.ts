import type { ClutterShape } from '../sim/types';

/** Tetromino clutter — maze wall AND tower real estate, all of it chewable. */
export const SHAPE_DEFS: Record<string, ClutterShape> = {
  'cereal-i': {
    id: 'cereal-i', name: 'Cereal Box',
    cells: [[0, 0], [1, 0], [2, 0], [3, 0]],
    hp: 70, mountSlots: 1, look: 'cereal',
  },
  'books-l': {
    id: 'books-l', name: 'Book Stack',
    cells: [[0, 0], [0, 1], [0, 2], [1, 2]],
    hp: 95, mountSlots: 1, look: 'books',
  },
  'pasta-j': {
    id: 'pasta-j', name: 'Pasta Box',
    cells: [[1, 0], [1, 1], [1, 2], [0, 2]],
    hp: 80, mountSlots: 1, look: 'pasta',
  },
  'tupper-o': {
    id: 'tupper-o', name: 'Tupperware',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
    hp: 120, mountSlots: 2, look: 'tupper',
  },
  'sponge-s': {
    id: 'sponge-s', name: 'Sponge Wall',
    cells: [[1, 0], [2, 0], [0, 1], [1, 1]],
    hp: 60, mountSlots: 1, look: 'sponge',
  },
  'spatula-t': {
    id: 'spatula-t', name: 'Utensil Pile',
    cells: [[0, 0], [1, 0], [2, 0], [1, 1]],
    hp: 85, mountSlots: 1, look: 'utensils',
  },
  'soap-i': {
    id: 'soap-i', name: 'Soap Bar Stack',
    cells: [[0, 0], [1, 0], [2, 0], [3, 0]],
    hp: 60, mountSlots: 1, look: 'bathroom-soap',
  },
  'toolbox-o': {
    id: 'toolbox-o', name: 'Toolbox',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
    hp: 130, mountSlots: 2, look: 'garage-toolbox',
  },
  'wine-l': {
    id: 'wine-l', name: 'Wine Crate',
    cells: [[0, 0], [0, 1], [0, 2], [1, 2]],
    hp: 115, mountSlots: 1, look: 'basement-wine-crate',
  },
  'flowerpot-t': {
    id: 'flowerpot-t', name: 'Flowerpot Cluster',
    cells: [[0, 0], [1, 0], [2, 0], [1, 1]],
    hp: 90, mountSlots: 2, look: 'backyard-flowerpots',
  },
  // ---- Addendum 2 §3: extra static shapes (additive; inert until placed via the belt/store) ----
  'napkin-i3': {
    id: 'napkin-i3', name: 'Napkin Stack',
    cells: [[0, 0], [1, 0], [2, 0]],
    hp: 55, mountSlots: 1, look: 'kitchen-napkins',
  },
  'jars-o': {
    id: 'jars-o', name: 'Mason Jars',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
    hp: 110, mountSlots: 2, look: 'pantry-jars',
  },
  'ladder-i': {
    id: 'ladder-i', name: 'Step Ladder',
    cells: [[0, 0], [0, 1], [0, 2], [0, 3]],
    hp: 100, mountSlots: 1, look: 'garage-ladder',
  },
  // ---- Addendum 2 §3: the SHUTTLE — a 1x2 block that patrols its long axis (2 out, 2 back). ----
  'shuttle-drawer': {
    id: 'shuttle-drawer', name: 'Sliding Drawer',
    cells: [[0, 0], [1, 0]],
    hp: 90, mountSlots: 1, look: 'kitchen-drawer',
    patrol: { range: 2, speed: 0.8, pause: 0.5 },
  },
};
