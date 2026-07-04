import './style.css';
import { Game, exposeDebug } from './game';
import type { RendererKind } from './render/view';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
// Renderer switch: `?renderer=2d` selects the (WIP) Canvas-2D backend, anything else = three.js.
// Default stays '3d' until packet P2-I integrates the 2D renderer.
const rendererKind: RendererKind = new URLSearchParams(location.search).get('renderer') === '2d' ? '2d' : '3d';
const game = new Game(canvas, rendererKind);
exposeDebug(game);
game.showTitle();
