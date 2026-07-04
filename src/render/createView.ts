// Renderer factory — the single place game.ts constructs its view. Keeps the concrete renderer
// choice (and the `?renderer=` switch) behind one function so game.ts depends only on `GameView`.
import type { GameView, RendererKind } from './view';
import { Renderer2D } from '../render2d/renderer2d';
import { GameRenderer } from './renderer';

/** Build the view backend for `kind`. Default (post P2-I) is the Canvas-2D `Renderer2D`;
 *  `?renderer=3d` selects the three.js `GameRenderer` as the debug fallback. Both satisfy
 *  `GameView`, so game.ts is agnostic to which one it gets. */
export function createGameView(canvas: HTMLCanvasElement, kind: RendererKind): GameView {
  if (kind === '3d') return new GameRenderer(canvas);
  return new Renderer2D(canvas);
}
