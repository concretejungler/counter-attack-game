import './style.css';
import { Game, exposeDebug } from './game';
import type { RendererKind } from './render/view';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
// Renderer switch: the game is 2D by default (Canvas-2D). `?renderer=3d` selects the three.js
// backend as the debug fallback; anything else (or no param) stays on the 2D renderer.
const rendererKind: RendererKind = new URLSearchParams(location.search).get('renderer') === '3d' ? '3d' : '2d';
const game = new Game(canvas, rendererKind);
exposeDebug(game);
game.showTitle();
