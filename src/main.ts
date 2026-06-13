import './style.css';
import { Game, exposeDebug } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);
exposeDebug(game);

// Until the UI shell lands (T10), boot straight into the first level.
game.loadLevel('kitchen-1');
