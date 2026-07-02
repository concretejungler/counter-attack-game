/**
 * Fridge poetry magnets (GAME-PROMPT §20.4): a scatter of draggable word tiles pinned to the
 * title-screen fridge. Arranging OPEN and SESAME adjacent (either order, touching horizontally)
 * pops the fridge door open with a hidden +50 BP reward — once per save (game.ts checks/sets
 * save.eggs.fridgeMagnetsSolved). Everything else is flavor: the other words don't do anything
 * mechanical, they're just charming to rearrange (GAME-PROMPT calls for "12 words total, other
 * secret words do other things" — cut to just the OPEN SESAME combo for P4; see CUTS.md).
 *
 * Pure client-side drag via Pointer Events (mirrors the existing long-press/carry pattern in
 * game.ts and the Fly's pointerdown handling) — no HTML5 native drag-and-drop, which behaves
 * inconsistently on touch.
 */
const WORDS = ['OPEN', 'SESAME', 'CAKE', 'DOOM', 'MOM', 'SOCK', 'EAT', 'WISH', 'BUG', 'CRUMB'];

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export interface MagnetsCallbacks {
  /** Fired once, the first time OPEN+SESAME land adjacent (game.ts gates the actual BP grant
   *  on save.eggs.fridgeMagnetsSolved so a solved board doesn't re-fire on every title visit). */
  onSolved(): void;
}

const TILE_W = 74;
const TILE_H = 34;
/** Adjacency tolerance in pixels — generous enough that "close enough, touching" reads as solved
 *  without requiring pixel-perfect alignment (this is a charm feature, not a puzzle). */
const ADJACENCY_PX = TILE_W * 0.75;

export class FridgeMagnets {
  readonly root: HTMLElement;
  private tiles = new Map<string, HTMLElement>();
  private positions = new Map<string, { x: number; y: number }>();
  private solvedAlready = false;

  constructor(private cb: MagnetsCallbacks, alreadySolved: boolean) {
    this.solvedAlready = alreadySolved;
    this.root = el('div', 'magnet-board');
    this.layout();
  }

  private layout(): void {
    // Deterministic-ish scatter (not seeded RNG — this is pure UI flavor, not sim state) across
    // a band under the menu notes, avoiding the fridge handle on the right edge. 5 cols x 2 rows
    // keeps the whole board short enough that it never pushes the fridge past the viewport.
    const cols = 5;
    WORDS.forEach((word, i) => {
      const tile = el('div', 'magnet-tile', word);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const jitterX = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 10 - 5;
      const jitterY = (Math.sin(i * 78.233) * 12543.123 % 1) * 8 - 4;
      const x = col * (TILE_W + 6) + jitterX;
      const y = row * (TILE_H + 12) + jitterY;
      tile.style.setProperty('--tilt', `${((i * 37) % 11) - 5}deg`);
      this.positions.set(word, { x, y });
      this.place(tile, x, y);
      this.bindDrag(tile, word);
      this.tiles.set(word, tile);
      this.root.append(tile);
    });
  }

  private place(tile: HTMLElement, x: number, y: number): void {
    tile.style.transform = `translate(${x}px, ${y}px) rotate(var(--tilt, 0deg))`;
  }

  private bindDrag(tile: HTMLElement, word: string): void {
    let dragging = false;
    let startPX = 0;
    let startPY = 0;
    let startX = 0;
    let startY = 0;

    tile.addEventListener('pointerdown', (e) => {
      dragging = true;
      tile.setPointerCapture(e.pointerId);
      tile.classList.add('dragging');
      startPX = e.clientX;
      startPY = e.clientY;
      const p = this.positions.get(word)!;
      startX = p.x;
      startY = p.y;
      e.stopPropagation();
    });
    tile.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const x = startX + (e.clientX - startPX);
      const y = startY + (e.clientY - startPY);
      this.positions.set(word, { x, y });
      this.place(tile, x, y);
      e.stopPropagation();
    });
    const end = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      tile.classList.remove('dragging');
      try { tile.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      this.checkSolved();
    };
    tile.addEventListener('pointerup', end);
    tile.addEventListener('pointercancel', end);
  }

  private checkSolved(): void {
    if (this.solvedAlready) return;
    const open = this.positions.get('OPEN');
    const sesame = this.positions.get('SESAME');
    if (!open || !sesame) return;
    const dx = Math.abs(open.x - sesame.x);
    const dy = Math.abs(open.y - sesame.y);
    // "adjacent" = roughly side-by-side on the same row band, touching-distance apart.
    if (dx <= TILE_W + ADJACENCY_PX && dx > 4 && dy <= TILE_H * 0.6) {
      this.solvedAlready = true;
      this.tiles.get('OPEN')?.classList.add('magnet-solved');
      this.tiles.get('SESAME')?.classList.add('magnet-solved');
      this.cb.onSolved();
    }
  }
}
