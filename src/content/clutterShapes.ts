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
};
