/**
 * Persistent status ribbon (mobile-store revamp §A2/§A3) — one shared corkboard strip carrying
 * the player's running totals (⭐ stars, 🧁 Brownie Points) plus a daily-chore state dot. Mounted
 * by BOTH the title diorama (screens.ts) and the house-map level select (houseMap.ts) so the two
 * top-of-screen ribbons are literally the same component — U1 shipped bespoke `.h2-rib` chips in
 * its topbar; U2 extracts them here so there is one `.status-ribbon` truth.
 *
 * Pure read: totals come from meta/progress + meta/achievements; the chore dot reads
 * save.lastDailyChoreDay against the current calendar day. No callbacks, no state mutation.
 */
import type { SaveData } from '../meta/save';
import { totalStars } from '../meta/progress';
import { currentBP } from '../meta/achievements';
import { dayNumber } from '../meta/infestation';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

/** Build the shared status ribbon. `compact` tightens padding for the house-map topbar (where it
 *  shares a row with the back button + utility cluster); the title uses the roomier default. */
export function buildStatusRibbon(save: SaveData, compact = false): HTMLElement {
  const ribbon = el('div', `status-ribbon${compact ? ' compact' : ''}`);

  const stars = el('div', 'status-chip', `<span class="sc-ico">⭐</span><span class="sc-val">${totalStars(save)}</span>`);
  stars.title = 'total stars earned';

  const bp = el('div', 'status-chip', `<span class="sc-ico">🧁</span><span class="sc-val">${currentBP(save)}</span>`);
  bp.title = 'Brownie Points — spend them in the Junk Drawer';

  ribbon.append(stars, bp);

  // Daily-chore state dot: lit (green, gently pulsing) when today's chore is still available,
  // dim (grey) once it has been done. A glance-able "there's a bonus waiting" tell.
  const choreDone = save.lastDailyChoreDay === dayNumber(Date.now());
  const chore = el('div', `status-chip chore${choreDone ? ' done' : ' ready'}`, `<span class="sc-ico">📅</span><span class="chore-dot"></span>`);
  chore.title = choreDone ? 'daily chore: done for today ✔' : 'daily chore: ready! (+25 BP)';
  ribbon.append(chore);

  return ribbon;
}
