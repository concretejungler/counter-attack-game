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

/** True if the current viewport is phone-sized (matches the responsive breakpoint).
 *  Mirrors the CSS breakpoint in style.css: narrow portrait phones (max-width) OR
 *  short landscape phones (max-height — e.g. 844x390 is wide but short). */
export function isMobileViewport(): boolean {
  return matchMedia('(max-width: 820px), (max-height: 500px)').matches;
}

/** True if the viewport is currently taller than wide (portrait). */
export function isPortrait(): boolean {
  return matchMedia('(orientation: portrait)').matches;
}

/** Device pixel ratio cap — lower on mobile to protect fill-rate/battery. */
export function dprCap(): number {
  return isMobileViewport() || isTouchDevice() ? 1.5 : 2;
}
