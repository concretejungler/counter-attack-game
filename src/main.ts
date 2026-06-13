import './style.css';
import { Game, exposeDebug } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);
exposeDebug(game);
game.showTitle();
