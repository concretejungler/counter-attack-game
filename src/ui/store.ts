/**
 * THE TOWER STORE (Addendum 2 §2, packet M-2). A diegetic "supply catalog" screen reachable from
 * the title ("🛒 Tower Store" tile) and the house map (corner button). Three tabs — Towers /
 * Building Blocks / Power-Ups — each a belt strip (the equipped loadout, ≤ BELT_LIMITS) atop a grid
 * of catalog cards. Cards show a sprite/emoji icon, kid-voice blurb, LIVE stats pulled straight from
 * the content defs (never hand-typed), a 🧁 BP price, and per-state controls: Buy (spends BP via the
 * Junk-Drawer-style earned/spent ledger) when unowned+affordable, or an Equip/Unequip belt toggle
 * when owned. Owns NO game state beyond `save`: it mutates save.store + persists, then re-renders its
 * own body in place (mirrors buildJunkDrawer's rerender pattern). No game.ts callback needed.
 */
import type { SaveData } from '../meta/save';
import { persistSave } from '../meta/save';
import { TOWER_ICONS, SHAPE_ICONS, SPELL_ICONS } from './icons';
import { getSprite } from '../render2d/spriteCache';
import { buildStatusRibbon } from './statusRibbon';
import { currentBP } from '../meta/achievements';
import {
  type StoreCategory, BELT_LIMITS,
  allTowerIds, allBlockIds, allSpellIds,
  storeItemName, storeItemBlurb, storeItemPrice,
  ownsStoreItem, canBuyStoreItem, buyStoreItem, isEquipped, toggleBelt, beltFor,
  towerLiveStats, blockLiveStats, spellLiveStats, type SpellLiveStats,
} from './storeData';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const TAB_META: { cat: StoreCategory; icon: string; label: string }[] = [
  { cat: 'tower', icon: '🗼', label: 'Towers' },
  { cat: 'block', icon: '📦', label: 'Building Blocks' },
  { cat: 'spell', icon: '✨', label: 'Power-Ups' },
];

/** Lightweight self-contained toast (the store isn't wired to UI.toast). */
function storeToast(host: HTMLElement, text: string): void {
  const t = el('div', 'toast-msg', text);
  host.append(t);
  setTimeout(() => t.remove(), 2000);
}

/** Icon element for a catalog item: a real painted tower sprite when a painter is registered,
 *  else the emoji glyph from icons.ts (always available). Blocks/spells use their emoji. */
function itemIcon(cat: StoreCategory, id: string, size: number): HTMLElement {
  if (cat === 'tower') {
    const spr = getSprite('tower', id, size, 0, {});
    if (spr) {
      const wrap = el('div', 'store-icon-canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cv = document.createElement('canvas');
      cv.width = Math.round(size * dpr);
      cv.height = Math.round(size * dpr);
      cv.style.width = `${size}px`;
      cv.style.height = `${size}px`;
      const ctx = cv.getContext('2d');
      if (ctx) { ctx.scale(dpr, dpr); ctx.drawImage(spr, 0, 0, size, size); }
      wrap.append(cv);
      return wrap;
    }
    return el('div', 'store-icon-emoji', TOWER_ICONS[id] ?? '🔧');
  }
  if (cat === 'block') return el('div', 'store-icon-emoji', SHAPE_ICONS[id] ?? '📦');
  return el('div', 'store-icon-emoji', SPELL_ICONS[id] ?? '✨');
}

/** Footprint mini-grid diagram for a clutter block (LIVE from the shape's `cells`). */
function blockFootprint(id: string): HTMLElement {
  const st = blockLiveStats(id);
  const grid = el('div', 'store-footprint');
  if (!st) return grid;
  grid.style.gridTemplateColumns = `repeat(${st.cols}, 1fr)`;
  const filled = new Set(st.cells.map(([c, r]) => `${c},${r}`));
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      grid.append(el('div', `store-fcell${filled.has(`${c},${r}`) ? ' on' : ''}`));
    }
  }
  return grid;
}

/** A tiny 3-4 shape schematic per spell kind (Addendum 2 §2: power-up cards get an example diagram). */
function spellSchematic(kind: SpellLiveStats['kind']): HTMLElement {
  const wrap = el('div', 'store-schematic');
  const ink = '#4a2f1a';
  let svg = '';
  switch (kind) {
    case 'bolt':
      svg = `<rect x="24" y="30" width="16" height="8" rx="2" fill="#d8a020"/>`
        + `<polyline points="34,2 28,18 36,18 30,34" fill="none" stroke="#3f5d7d" stroke-width="3"/>`
        + `<circle cx="32" cy="34" r="5" fill="#e8504f" opacity="0.6"/>`;
      break;
    case 'lane':
      svg = `<rect x="4" y="14" width="56" height="12" rx="3" fill="#efe0c0" stroke="${ink}" stroke-width="1.5"/>`
        + `<line x1="8" y1="20" x2="50" y2="20" stroke="#e8504f" stroke-width="3"/>`
        + `<polygon points="50,14 60,20 50,26" fill="#e8504f"/>`
        + `<ellipse cx="18" cy="20" rx="7" ry="4" fill="#8a4a9c"/>`;
      break;
    case 'momHand':
      svg = `<rect x="6" y="26" width="52" height="10" rx="3" fill="#efe0c0" stroke="${ink}" stroke-width="1.5"/>`
        + `<rect x="24" y="10" width="16" height="16" rx="5" fill="#f0c090" stroke="${ink}" stroke-width="1.5"/>`
        + `<rect x="26" y="2" width="3" height="10" rx="1.5" fill="#f0c090"/>`
        + `<rect x="31" y="1" width="3" height="11" rx="1.5" fill="#f0c090"/>`
        + `<rect x="36" y="2" width="3" height="10" rx="1.5" fill="#f0c090"/>`;
      break;
    case 'timestop':
      svg = `<circle cx="32" cy="20" r="14" fill="#cfe3ee" stroke="${ink}" stroke-width="2"/>`
        + `<line x1="32" y1="20" x2="32" y2="10" stroke="${ink}" stroke-width="2"/>`
        + `<line x1="32" y1="20" x2="40" y2="24" stroke="${ink}" stroke-width="2"/>`
        + `<text x="50" y="16" font-size="12" fill="#3f5d7d">❄</text>`;
      break;
    case 'cleanse':
      svg = `<text x="10" y="18" font-size="14" fill="#3c8a5e">✦</text>`
        + `<text x="26" y="30" font-size="18" fill="#d8a020">✦</text>`
        + `<text x="44" y="16" font-size="12" fill="#3c8a5e">✦</text>`
        + `<line x1="8" y1="34" x2="56" y2="34" stroke="${ink}" stroke-width="2" stroke-dasharray="3 3"/>`;
      break;
    case 'gamble':
      svg = `<rect x="20" y="12" width="24" height="22" rx="3" fill="#d8a020" stroke="${ink}" stroke-width="2"/>`
        + `<path d="M32 6 L44 12 L20 12 Z" fill="#c88a10" stroke="${ink}" stroke-width="1.5"/>`
        + `<text x="27" y="30" font-size="16" fill="${ink}">?</text>`;
      break;
    case 'repair':
      svg = `<rect x="8" y="16" width="20" height="18" rx="2" fill="#c89a62" stroke="${ink}" stroke-width="1.5"/>`
        + `<line x1="8" y1="25" x2="28" y2="25" stroke="${ink}" stroke-width="1.5"/>`
        + `<path d="M40 10 l8 8 -6 6 -8 -8 z" fill="#9aa7ad" stroke="${ink}" stroke-width="1.5"/>`
        + `<text x="44" y="34" font-size="14" fill="#e8504f">＋</text>`;
      break;
    case 'handBuff':
      svg = `<rect x="24" y="16" width="16" height="18" rx="5" fill="#f0c090" stroke="${ink}" stroke-width="1.5"/>`
        + `<rect x="26" y="8" width="3" height="10" rx="1.5" fill="#f0c090"/>`
        + `<rect x="31" y="7" width="3" height="11" rx="1.5" fill="#f0c090"/>`
        + `<rect x="36" y="8" width="3" height="10" rx="1.5" fill="#f0c090"/>`
        + `<polyline points="12,10 8,20 14,20 10,30" fill="none" stroke="#d8a020" stroke-width="2.5"/>`
        + `<polyline points="54,10 50,20 56,20 52,30" fill="none" stroke="#d8a020" stroke-width="2.5"/>`;
      break;
    default:
      svg = '';
  }
  wrap.innerHTML = `<svg viewBox="0 0 64 40" width="64" height="40" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
  return wrap;
}

export function buildStore(save: SaveData, onBack: () => void): HTMLElement {
  const screen = el('div', 'screen store-screen');
  const wrap = el('div', 'store-wrap');

  const ribbonWrap = el('div', 't2-ribbonbar inline');
  ribbonWrap.append(buildStatusRibbon(save));
  wrap.append(ribbonWrap);

  const titleRow = el('div', 'store-title-row');
  titleRow.append(el('div', 'store-title', '🛒 Tower Store'));
  const bpChip = el('div', 'store-bp-chip', `🧁 ${currentBP(save)} BP`);
  titleRow.append(bpChip);
  wrap.append(titleRow);
  wrap.append(el('div', 'store-sub', 'buy it once, use it in every level. spend Brownie Points — then pack your belt.'));

  // ---- tab bar ----
  const tabBar = el('div', 'store-tabs');
  const tabBtns = new Map<StoreCategory, HTMLButtonElement>();
  let activeTab: StoreCategory = 'tower';
  for (const t of TAB_META) {
    const b = el('button', 'store-tab', `<span class="store-tab-ico">${t.icon}</span> ${t.label}`) as HTMLButtonElement;
    b.onclick = () => { activeTab = t.cat; renderBody(); };
    tabBtns.set(t.cat, b);
    tabBar.append(b);
  }
  wrap.append(tabBar);

  const beltStrip = el('div', 'store-belt-strip');
  wrap.append(beltStrip);
  const grid = el('div', 'store-grid');
  wrap.append(grid);

  const backRow = el('div', 'store-back-row');
  const back = el('button', 'wood-btn small', '← Back');
  back.onclick = onBack;
  backRow.append(back);
  wrap.append(backRow);

  screen.append(wrap);

  // ---- render helpers -------------------------------------------------------
  const idsFor = (cat: StoreCategory): string[] =>
    cat === 'tower' ? allTowerIds() : cat === 'block' ? allBlockIds() : allSpellIds();

  function afterMutation(): void {
    persistSave(save);
    renderBody();
  }

  function equip(id: string): void {
    const res = toggleBelt(save, id);
    if (!res.ok && res.reason === 'full') {
      const cat = activeTab;
      storeToast(screen, `belt full — ${BELT_LIMITS[cat]} ${cat === 'spell' ? 'power-ups' : cat + 's'} max. unequip one first!`);
      return;
    }
    afterMutation();
  }

  function buy(id: string): void {
    if (!buyStoreItem(save, id)) return;
    // convenience: auto-equip a fresh purchase if its belt has room (no-op silently if full).
    toggleBelt(save, id);
    afterMutation();
  }

  function renderBeltStrip(cat: StoreCategory): void {
    beltStrip.innerHTML = '';
    const belt = beltFor(save, cat);
    const limit = BELT_LIMITS[cat];
    beltStrip.append(el('div', 'store-belt-label', `🎒 Belt <b>${belt.length}/${limit}</b>`));
    const slots = el('div', 'store-belt-slots');
    belt.forEach((id) => {
      const chip = el('button', 'store-belt-chip', '') as HTMLButtonElement;
      chip.append(itemIcon(cat, id, 30));
      chip.append(el('span', 'store-belt-chip-x', '✕'));
      chip.title = `${storeItemName(id)} — click to unequip`;
      chip.onclick = () => equip(id);
      slots.append(chip);
    });
    for (let i = belt.length; i < limit; i++) slots.append(el('div', 'store-belt-empty', '+'));
    beltStrip.append(slots);
  }

  function renderCard(cat: StoreCategory, id: string): HTMLElement {
    const owned = ownsStoreItem(save, id);
    const equipped = isEquipped(save, id);
    const affordable = canBuyStoreItem(save, id);
    const price = storeItemPrice(id);
    const cls = `store-card${owned ? ' owned' : affordable ? '' : ' pricey'}${equipped ? ' equipped' : ''}`;
    const card = el('div', cls);
    card.dataset.id = id;
    card.dataset.cat = cat;

    const head = el('div', 'store-card-head');
    head.append(itemIcon(cat, id, 44));
    const titles = el('div', 'store-card-titles');
    titles.append(el('div', 'store-card-name', storeItemName(id)));
    if (equipped) titles.append(el('div', 'store-card-eqtag', '🎒 on belt'));
    head.append(titles);
    card.append(head);

    card.append(el('div', 'store-card-blurb', storeItemBlurb(id)));

    // ---- LIVE stats (never hand-typed) ----
    const stats = el('div', 'store-card-stats');
    if (cat === 'tower') {
      const s = towerLiveStats(id)!;
      stats.innerHTML = `
        <span class="store-stat">💥 <b>${s.dmg}</b></span>
        <span class="store-stat">⏱ <b>${s.rate}</b>/s</span>
        <span class="store-stat">📏 <b>${s.range}</b></span>
        <span class="store-stat">${s.dmgIcon} ${s.dmgType}</span>`;
      card.append(stats);
      if (s.special) card.append(el('div', 'store-card-special', `✦ ${s.special}`));
    } else if (cat === 'block') {
      const s = blockLiveStats(id)!;
      card.append(blockFootprint(id));
      stats.innerHTML = `
        <span class="store-stat">❤️ <b>${s.hp}</b> hp</span>
        <span class="store-stat">🗼 <b>${s.mountSlots}</b> slot${s.mountSlots === 1 ? '' : 's'}</span>
        ${s.patrol ? `<span class="store-stat">🚚 patrols ${s.patrol.range}</span>` : ''}`;
      card.append(stats);
    } else {
      const s = spellLiveStats(id)!;
      card.append(spellSchematic(s.kind));
      stats.innerHTML = `
        <span class="store-stat">🫙 <b>${s.cost}</b> charge</span>
        <span class="store-stat">🔁 <b>${s.cooldown}</b>s cd</span>`;
      card.append(stats);
      card.append(el('div', 'store-card-special', `✦ ${s.effect}`));
    }

    // ---- footer: buy / equip ----
    const foot = el('div', 'store-card-foot');
    if (!owned) {
      foot.append(el('div', 'store-card-price', price === 0 ? 'free' : `🧁 ${price} BP`));
      const btn = el('button', 'wood-btn small', 'buy') as HTMLButtonElement;
      btn.disabled = !affordable;
      if (!affordable) btn.title = 'not enough Brownie Points yet';
      btn.onclick = () => buy(id);
      foot.append(btn);
    } else {
      foot.append(el('div', 'store-card-owned', '✔ owned'));
      const btn = el('button', `wood-btn small${equipped ? ' equipped-btn' : ''}`, equipped ? '− unequip' : '+ equip') as HTMLButtonElement;
      btn.onclick = () => equip(id);
      foot.append(btn);
    }
    card.append(foot);
    return card;
  }

  function renderBody(): void {
    bpChip.innerHTML = `🧁 ${currentBP(save)} BP`;
    tabBtns.forEach((b, cat) => b.classList.toggle('active', cat === activeTab));
    renderBeltStrip(activeTab);
    grid.innerHTML = '';
    for (const id of idsFor(activeTab)) grid.append(renderCard(activeTab, id));
  }

  renderBody();
  return screen;
}
