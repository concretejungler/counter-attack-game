// Renderer factory — the single place game.ts constructs its view. Keeps the concrete renderer
// choice (and the `?renderer=` switch) behind one function so game.ts depends only on `GameView`.
import type { GameView, RendererKind } from './view';
import { GameRenderer } from './renderer';

/** Build the view backend for `kind`. Default is the three.js `GameRenderer`.
 *
 *  '2d' is not integrated yet — packet P2-I plugs the Canvas-2D renderer in here with a 2-line
 *  change (import it, and return it in the branch below); until then we warn and fall back to 3D
 *  so `?renderer=2d` never hard-crashes the boot. */
export function createGameView(canvas: HTMLCanvasElement, kind: RendererKind): GameView {
  if (kind === '2d') {
    // P2-I: uncomment the next two lines (and the import) to make 2D the real backend.
    //   import { Renderer2D } from '../render2d/renderer2d';
    //   return new Renderer2D(canvas);
    console.warn('[view] 2D renderer not integrated yet (packet P2-I) — falling back to 3D.');
  }
  return new GameRenderer(canvas);
}
