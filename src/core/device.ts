/** Device/viewport helpers for mobile support. No three.js, no sim — pure DOM feature checks. */

/** True if the device supports touch input (phones, tablets, touch laptops). */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msMaxTouchPoints > 0
  );
}

/** Lazy live MediaQueryList singletons. `matchMedia()` allocates a fresh MQL on every call, and
 *  dprCap() sits on a per-frame path (EntityLayer.frame re-reads it each frame) — so each query is
 *  created ONCE and re-read via `.matches` (MQLs are live; they track viewport changes). Lazily
 *  initialized (not at module scope) so importing this file stays safe without a DOM. */
let mqMobile: MediaQueryList | null = null;
let mqHiRes: MediaQueryList | null = null;

/** True if the current viewport is phone-sized (matches the responsive breakpoint).
 *  Mirrors the CSS breakpoint in style.css: narrow portrait phones (max-width) OR
 *  short landscape phones (max-height — e.g. 844x390 is wide but short). Both thresholds
 *  sit below the shell's 960×600 minimum window, so the mobile layout can never fire on PC. */
export function isMobileViewport(): boolean {
  mqMobile ??= matchMedia('(max-width: 820px), (max-height: 500px)');
  return mqMobile.matches;
}

/** True if the viewport is currently taller than wide (portrait). */
export function isPortrait(): boolean {
  return matchMedia('(orientation: portrait)').matches;
}

/** True on a mouse/trackpad (fine) primary pointer — PC. False on touch (coarse) — phones /
 *  Steam Deck handheld. Drives PC-vs-touch wording in tutorial / photo-mode hints (decision 4). */
export function isFinePointer(): boolean {
  return typeof matchMedia === 'function' ? matchMedia('(pointer: fine)').matches : true;
}

/**
 * AUTO UI-SCALE (Steam PC pivot, decision 3). The whole diegetic overlay (#ui) is zoomed by
 * `autoUiScale() × the user's --ui-scale preference`. The auto term keeps text/buttons in the
 * same physical-size band from 720p up to 4K instead of shrinking to pinpricks on a big monitor:
 *
 *   autoScale = clamp( min(viewportH/900, viewportW/1600), 0.85, 2.0 )
 *
 * 900/1600 are the reference "designed-at" dimensions (≈ the 1600×900 dev viewport), so a 1600×900
 * window resolves to exactly 1.0. main.ts sets `--ui-auto-scale` from this on boot + resize; the
 * settings slider stays a preference multiplier on top (see style.css `#ui { zoom: calc(...) }`).
 */
export const UI_AUTOSCALE_MIN = 0.85;
export const UI_AUTOSCALE_MAX = 2.0;
export function autoUiScale(
  vw: number = typeof window !== 'undefined' ? window.innerWidth : 1600,
  vh: number = typeof window !== 'undefined' ? window.innerHeight : 900,
): number {
  // Phone-sized viewports keep their hand-tuned layout EXACTLY as before this feature (auto = 1):
  // the mobile breakpoint's dock/sheet metrics were sized for zoom 1.0 (44px touch minimums), and
  // the 0.85 floor below would shrink every touch target ~15%. PC is what auto-scale is for — the
  // shell's 960×600 min window keeps this branch unreachable there (decision 2).
  if (typeof window !== 'undefined' && isMobileViewport()) return 1;
  const raw = Math.min(vh / 900, vw / 1600);
  return Math.max(UI_AUTOSCALE_MIN, Math.min(UI_AUTOSCALE_MAX, raw));
}

/** ≥1440p-class desktop viewport (2560×1440, 3440×1440, 4K, …): tall enough OR an ultrawide.
 *  Used to gate the higher DPR cap so the 720p/900p/1080p perf budget is left untouched. */
export function isHiResViewport(): boolean {
  mqHiRes ??= matchMedia('(min-height: 1400px), (min-width: 2500px)');
  return mqHiRes.matches;
}

/**
 * Device-pixel-ratio cap for the Canvas board (used both to size the physical canvas and to
 * render the offscreen sprite cache at `size × dprCap()`):
 *   - mobile / touch: 1.5 (protect fill-rate + battery)
 *   - desktop < 1440p: 2.0 (unchanged — the 1600×900 perf budget stays put)
 *   - desktop ≥ 1440p: 2.5, so board sprites carry enough backing-store resolution to stay crisp
 *     on the dense 1440p/4K screens the auto UI-scale zooms up to. The sprite cache reads this
 *     directly, so raising the cap at high res IS the "sprite render size follows the zoom" plumbing.
 *
 * EVERY consumer (renderer2d canvas sizing, entities/board draw transforms, sprite cache) reads this
 * one function, so the value stays in lockstep across them — that's why the ultrawide/4K guard below
 * lives HERE rather than in renderer2d: capping the canvas ratio anywhere else would desync the
 * transforms. The guard bounds the physical long edge at 7680 (the width the pre-2.5 code already
 * produced at 4K — known-good, shipped) so 2.5 lands fully at 1440p, ultrawide/4K trims back toward
 * the old ceiling instead of ballooning to a ~9600px canvas, and desktop never drops below 2.0.
 */
const MAX_CANVAS_EDGE = 7680;
export function dprCap(): number {
  if (isMobileViewport() || isTouchDevice()) return 1.5;
  const desired = isHiResViewport() ? 2.5 : 2;
  if (typeof window === 'undefined') return desired;
  const longCss = Math.max(1, window.innerWidth, window.innerHeight);
  return Math.max(2, Math.min(desired, MAX_CANVAS_EDGE / longCss));
}

/**
 * FULLSCREEN (Steam PC pivot, decision 4 / display settings). Prefers the Electron shell bridge
 * (`window.gameShell.setFullscreen`, injected by the shell packet) when present — that drives a real
 * borderless-fullscreen window and plays nicely with the Steam overlay — and falls back to the web
 * Fullscreen API otherwise. F11 is wired as a fallback in main.ts (web only; the shell owns it in
 * Electron). All calls are user-gesture-initiated (settings toggle / keydown), so requestFullscreen
 * is allowed. Typed locally so game src needs no `window.gameShell` declaration (owned by S-B).
 */
interface GameShellBridge {
  setFullscreen?: (on: boolean) => void;
  isFullscreen?: () => boolean;
}
function gameShell(): GameShellBridge | undefined {
  return (globalThis as unknown as { gameShell?: GameShellBridge }).gameShell;
}

/** True when the app is currently presented fullscreen (shell-reported if available, else web API). */
export function isFullscreen(): boolean {
  const s = gameShell();
  if (s?.isFullscreen) {
    try { return !!s.isFullscreen(); } catch { /* fall through to web API */ }
  }
  return typeof document !== 'undefined' && !!document.fullscreenElement;
}

/** True if the Electron shell exposes a fullscreen bridge (so F11-in-JS should defer to the shell). */
export function hasShellFullscreen(): boolean {
  return !!gameShell()?.setFullscreen;
}

/** Toggle (or force) fullscreen via the shell bridge when present, else the web Fullscreen API. */
export function toggleFullscreen(force?: boolean): void {
  const want = force ?? !isFullscreen();
  const s = gameShell();
  if (s?.setFullscreen) {
    try { s.setFullscreen(want); return; } catch { /* fall through to web API */ }
  }
  if (typeof document === 'undefined') return;
  if (want) void document.documentElement.requestFullscreen?.().catch(() => { /* denied — ignore */ });
  else if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => { /* ignore */ });
}
