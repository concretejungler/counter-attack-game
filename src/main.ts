import './style.css';
import { Game, exposeDebug } from './game';
import type { RendererKind } from './render/view';
import { autoUiScale, toggleFullscreen, hasShellFullscreen } from './core/device';

// AUTO UI-SCALE (Steam PC pivot, decision 3): compute the resolution-driven base zoom and write it
// to `--ui-auto-scale`. style.css multiplies it by the user's `--ui-scale` preference on #ui, so the
// overlay stays right-sized from 720p to 4K while the settings slider still tweaks it on top. Set
// before the game mounts (so the first frame is already scaled) and kept live on resize/zoom.
function applyAutoUiScale(): void {
  document.documentElement.style.setProperty('--ui-auto-scale', String(autoUiScale()));
}
applyAutoUiScale();
window.addEventListener('resize', applyAutoUiScale);
window.visualViewport?.addEventListener('resize', applyAutoUiScale);

// F11 fullscreen (Steam PC pivot, decision 5). Web build only: in Electron the shell owns F11 at the
// window/menu level, so we defer to it and don't double-toggle. The Fullscreen API request rides the
// keydown user gesture. game.ts's key handler ignores F11, so there's no conflict with V/P/R/Esc.
window.addEventListener('keydown', (e) => {
  if (e.key === 'F11' && !hasShellFullscreen()) {
    e.preventDefault();
    toggleFullscreen();
  }
});

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
// Renderer switch: the game is 2D by default (Canvas-2D). `?renderer=3d` selects the three.js
// backend as the debug fallback; anything else (or no param) stays on the 2D renderer.
const rendererKind: RendererKind = new URLSearchParams(location.search).get('renderer') === '3d' ? '3d' : '2d';
const game = new Game(canvas, rendererKind);
exposeDebug(game);
game.showTitle();
