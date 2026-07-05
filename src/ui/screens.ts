import type { ContentDB, LevelDef, RecapData, SimState, RoomTheme } from '../sim/types';
import type { SaveData } from '../meta/save';
import { LEVEL_ICONS, CRITTER_ICONS, TOWER_ICONS, MUTATION_ICONS } from './icons';
import { FridgeMagnets, type MagnetsCallbacks } from './magnets';
import {
  ROOM_COLOR, ROOM_LABEL, worldsGrouped, isLevelUnlocked, isWorldUnlocked,
  starsFor, prerequisiteRoomLabel, furthestUnlockedLevel,
  critterdexOrder, isCritterSeen, killCount, jarCount, shinyCount, critterdexCompletionPct,
  SECRET_LEVELS, isSecretUnlocked, secretLockHint, type SecretLevelId,
} from '../meta/progress';
import { JUNK_DRAWER_ITEMS, isPurchased, currentBP, canAfford, type JunkDrawerItem } from '../meta/achievements';
import {
  RELICS_BY_ID, DECK_MAX, currentFloorNodes, reachableNodeIndices, shopPrice, rollShopWares,
  dayNumber, type RunState, type NodeDef, type NodeKind,
} from '../meta/infestation';
import { levelById } from '../content';
import { buildHouseMap } from './houseMap';
import { buildStatusRibbon } from './statusRibbon';
import { getSprite } from '../render2d/spriteCache';
import { autoUiScale, isFullscreen, toggleFullscreen, isFinePointer } from '../core/device';

const dayNumberLocal = (): number => dayNumber(Date.now());

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const TITLE_COLORS = ['#e8504f', '#3f5d7d', '#d8a020', '#3c8a5e', '#8a4a9c', '#d87f2e'];

/** A tiny canvas painted with a real critter sprite (via the render2d cache — read-only) for the
 *  title diorama's peek-a-boo bug. Falls back to an emoji if the painter isn't registered yet. */
function buildCritterPeek(): HTMLElement {
  const wrap = el('div', 't2-critter');
  const size = 74;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const spr = getSprite('critter', 'ant-worker', size, 0, {}) ?? getSprite('critter', 'housefly', size, 0, {});
  if (spr) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    const ctx = cv.getContext('2d');
    if (ctx) { ctx.scale(dpr, dpr); ctx.drawImage(spr, 0, 0, size, size); }
    wrap.append(cv);
  } else {
    wrap.append(el('div', 't2-critter-emoji', '🐜'));
  }
  return wrap;
}

/** One compact secondary destination tile for the title menu grid. */
function titleTile(icon: string, label: string, sub: string, locked = false): HTMLButtonElement {
  return el(
    'button',
    `t2-tile${locked ? ' locked' : ''}`,
    `<span class="t2-tile-ico">${icon}</span><span class="t2-tile-label">${label}</span><span class="t2-tile-sub">${sub}</span>`,
  ) as HTMLButtonElement;
}

/** TITLE — the LIVING DIORAMA (mobile-store revamp §A2). A shallow-parallax kitchen scene (back
 *  wall+window / counter+toaster+fridge / drifting motes) with a critter that peeks from behind
 *  the toaster, a dominant "DEFEND THE CAKE!" crayon CTA in the bottom thumb-band, a compact row
 *  of secondary tiles, a light-switch Settings control, and the shared status ribbon up top. The
 *  fridge-poetry magnets egg + OPEN SESAME note are relocated onto the diorama's fridge. Parallax
 *  and the peek freeze under prefers-reduced-motion (handled in CSS). All callbacks / unlock states
 *  / kid-voice casing are preserved verbatim from the old fridge menu. */
export function buildTitle(
  save: SaveData,
  onPlay: () => void,
  onSettings: () => void,
  onJournal: () => void,
  onJunkDrawer: () => void,
  onInfestation: () => void,
  onDailyChore: () => void,
  onMagnetsSolved: () => void,
  onHowToPlay: () => void,
): HTMLElement {
  const screen = el('div', 'screen title2');

  // ---- shared persistent status ribbon (top, safe-area aware) ----
  const ribbonBar = el('div', 't2-ribbonbar');
  ribbonBar.append(buildStatusRibbon(save));
  screen.append(ribbonBar);

  // ---- Settings: a diegetic wall light-switch in the top corner ----
  const settings = el('button', 't2-settings', '<span class="t2-switch"><span class="t2-switch-nub"></span></span>');
  settings.title = 'Settings — the thermostat';
  settings.setAttribute('aria-label', 'Settings');
  settings.onclick = onSettings;
  screen.append(settings);

  // ---- living diorama: 3 drifting parallax layers + the peek-a-boo critter ----
  const scene = el('div', 'title2-scene');
  const back = el('div', 't2-layer t2-back',
    '<div class="t2-window"><span class="t2-sun"></span><span class="t2-mull t2-mull-v"></span><span class="t2-mull t2-mull-h"></span></div>');
  const counter = el('div', 't2-layer t2-counter',
    '<div class="t2-counter-top"></div><div class="t2-toaster"><span class="t2-slot"></span><span class="t2-slot"></span><span class="t2-lever"></span></div>');
  counter.append(buildCritterPeek()); // sits BEHIND the toaster (lower z within the layer) so it peeks up and ducks
  const fore = el('div', 't2-layer t2-fore');
  for (let i = 0; i < 7; i++) {
    const m = el('span', 't2-mote');
    m.style.left = `${8 + ((i * 137) % 86)}%`;
    m.style.top = `${20 + ((i * 71) % 60)}%`;
    m.style.setProperty('--sz', `${5 + (i % 3) * 3}px`);
    m.style.setProperty('--d', `${8 + (i % 4) * 1.7}s`);
    m.style.animationDelay = `${-(i * 1.3).toFixed(1)}s`;
    fore.append(m);
  }
  scene.append(back, counter, fore);
  screen.append(scene);

  // ---- brand wordmark (kept: the magnet letters) ----
  const brand = el('div', 'title2-brand');
  const title = el('div', 'magnet-title');
  let letterIdx = 0;
  for (const word of 'COUNTER ATTACK!'.split(' ')) {
    const wordWrap = el('span', 'magnet-word');
    for (const ch of word) {
      const s = el('span', '', ch);
      s.style.background = TITLE_COLORS[letterIdx % TITLE_COLORS.length];
      s.style.setProperty('--tilt', `${((letterIdx * 7919) % 9) - 4}deg`);
      wordWrap.append(s);
      letterIdx++;
    }
    title.append(wordWrap);
  }
  brand.append(title, el('div', 'subtitle', 'critters vs. housewares — a tower defense of household proportions'));
  screen.append(brand);

  // ---- fridge-poetry magnets egg + OPEN SESAME note, relocated ONTO the diorama's fridge ----
  const fridge = el('div', 't2-fridge-egg');
  fridge.append(el('div', 't2-fridge-handle'));
  fridge.append(el('div', 't2-fridge-cap', '✎ fridge poetry'));
  const magnetsCb: MagnetsCallbacks = {
    onSolved: () => {
      doorNote.classList.add('open');
      onMagnetsSolved();
    },
  };
  const magnets = new FridgeMagnets(magnetsCb, save.eggs.fridgeMagnetsSolved);
  const magnetHost = el('div', 't2-magnet-host');
  magnetHost.append(magnets.root);
  fridge.append(magnetHost);
  const doorNote = el('div', `fridge-door-note${save.eggs.fridgeMagnetsSolved ? ' open' : ''}`, `
    🔓 the magnets spelled it out... <b>OPEN SESAME</b><br>a rare relic tumbles out. <b>+50 🧁 BP!</b>
  `);
  fridge.append(doorNote);
  screen.append(fridge);

  // ---- bottom menu: one dominant CTA + a compact row of equal secondary tiles ----
  const menu = el('div', 'title2-menu');
  const cta = el('button', 't2-cta', '<span class="t2-cta-ico">🎂</span><span class="t2-cta-label">DEFEND THE CAKE!</span>');
  cta.onclick = onPlay;

  const tiles = el('div', 't2-tiles');
  const infestUnlocked = (save.stars['kitchen-5'] ?? 0) > 0;
  const inRun = !!save.infestation && !save.infestation.over;
  const infest = titleTile(
    '🐜', 'Infestation',
    infestUnlocked ? (inRun ? `resume · floor ${save.infestation!.floor}` : 'roguelike run') : 'beat the Crumb King!!',
    !infestUnlocked,
  );
  if (infestUnlocked) infest.onclick = onInfestation;

  const journal = titleTile('📔', 'My Journal', `${critterdexCompletionPct(save)}% filled`);
  journal.onclick = onJournal;

  const drawer = titleTile('🗄️', 'The Junk Drawer', `${currentBP(save)} 🧁 BP`);
  drawer.onclick = onJunkDrawer;

  const choreDone = save.lastDailyChoreDay === dayNumberLocal();
  const chore = titleTile('📅', 'Daily Chore', choreDone ? 'done today! ✔' : '+25 BP', choreDone);
  if (!choreDone) chore.onclick = onDailyChore;

  const howto = titleTile('🎓', 'How to Play', 'the house rules');
  howto.onclick = onHowToPlay;

  tiles.append(infest, journal, drawer, chore, howto);
  // menu flows top→bottom: tiles, then the dominant CTA in the thumb band, then the foot flavor.
  menu.append(tiles, cta);
  menu.append(el('div', 'title2-foot', 'the wish came true at 7:42pm. defend the birthday cake.'));
  screen.append(menu);

  return screen;
}

/** The "How to Play" tutorial (title fridge button + auto-shown once before the very first level).
 *  A paged flip-book of the house rules in the game's kid-voice — every core mechanic and every HUD
 *  button, so a first-timer knows what they're looking at before a single critter shows up.
 *  `finishLabel` differs by entry point ("Let's Play! →" pre-level vs "Got it!" from the menu). */
const TUTORIAL_PAGES: { icon: string; title: string; lines: string[] }[] = [
  {
    icon: '🎂',
    title: 'defend the cake!!',
    lines: [
      'the birthday wish came true — now bugs want the cake.',
      'critters pour in from the edges and march for the frosting.',
      "you're the <b>Hand of the house</b>: build, squish, and sweep to stop them. lose every cake slice and it's game over.",
    ],
  },
  {
    icon: '🧱',
    title: 'build, then battle',
    lines: [
      'every level swaps between a calm <b>BUILD</b> phase and a <b>WAVE</b> of critters.',
      'in build: drag <b>CLUTTER</b> from the corkboard to make walls, then drop <b>TOWERS</b> on top of it.',
      'tap <b>🔔 Call Wave</b> to start early for bonus 🍪 — or let the egg-timer do it.',
    ],
  },
  {
    icon: '➡️',
    title: 'read the path',
    lines: [
      'the glowing arrow-trail shows <b>exactly where the critters will walk</b> to reach the cake.',
      'box them in with clutter to force a longer, twistier detour — right past your towers.',
      'it re-draws live as you build. watch the route bend!',
    ],
  },
  {
    icon: '📦',
    title: 'clutter & towers',
    lines: [
      'clutter is a <b>wall AND a tower platform</b>. press <b>R</b> to rotate a piece before placing.',
      'critters can <b>chew through</b> clutter — walls buy time, not safety.',
      'towers cost 🍪. tap a placed tower to <b>Upgrade, pick a Path, Move, or Sell</b> it.',
    ],
  },
  {
    icon: '✋',
    title: 'the Hand (that\'s you)',
    lines: [
      '<b>sweep</b> spilled crumbs to bank them — crumbs are your money.',
      '<b>flick</b> or <b>squash</b> critters directly with a tap or a drag.',
      '<b>high-five</b> a tower for a burst, or pick towers up to move them.',
    ],
  },
  {
    icon: '🫙',
    title: 'crumbs, mana & spells',
    lines: [
      '🍪 <b>crumbs</b> come from squished critters and sweeping — spend them on towers.',
      'the 🫙 <b>mana jar</b> fills over time and powers <b>SPELLS</b> on the bottom shelf.',
      'each spell has a cost + cooldown (the dark sweep across it = recharging).',
    ],
  },
  {
    icon: '👃',
    title: 'watch the nose!',
    lines: [
      'the nose meter is the <b>SCENT</b> — it climbs as crumbs pile up and critters die near the cake.',
      'higher scent = <b>bigger waves</b>. sweep fast to keep it down.',
      'let it hit <b>100% and stay there</b> and <b>THE SWARM</b> arrives — an instant loss. don\'t.',
    ],
  },
  {
    icon: '⛶',
    title: 'buttons & view',
    lines: [
      '<b>⏸</b> pause &nbsp; <b>1× 2× 3×</b> speed &nbsp; <b>📸</b> photo mode',
      // second + third lines are pointer-adapted at build time — see viewControlLines().
      '{{VIEW_ACTIVATE}}',
      '{{VIEW_CONTROLS}}',
    ],
  },
];

/** Pointer-adapted copy for the tutorial "buttons & view" page (decision 4): mouse says
 *  "drag to pan, scroll to zoom" / "click"; touch keeps the two-finger / pinch / tap wording. */
function viewControlLine(token: string): string {
  const fine = isFinePointer();
  switch (token) {
    case '{{VIEW_ACTIVATE}}':
      return fine
        ? '<b>⛶ see everything</b> fits the whole board on screen in one click (or press <b>V</b>).'
        : '<b>⛶ see everything</b> fits the whole board on screen in one tap (or press <b>V</b>).';
    case '{{VIEW_CONTROLS}}':
      return fine
        ? '<b>drag</b> to pan, <b>scroll</b> to zoom. survive every wave to win — fewer bites + the level challenge earn more ⭐!'
        : 'drag with two fingers to pan, scroll or pinch to zoom. survive every wave to win — fewer bites + the level challenge earn more ⭐!';
    default:
      return token;
  }
}

export function buildTutorial(onClose: () => void, finishLabel = 'Got it!'): HTMLElement {
  const wrap = el('div', 'modal-wrap');
  const modal = el('div', 'paper-modal tutorial-modal');

  modal.append(el('div', 'tutorial-head', '🎓 How to Play'));

  const stage = el('div', 'tutorial-stage');
  TUTORIAL_PAGES.forEach((p, i) => {
    const page = el('div', `tutorial-page${i === 0 ? ' active' : ''}`);
    page.append(el('div', 'tutorial-ico', p.icon));
    page.append(el('div', 'tutorial-title', p.title));
    const body = el('div', 'tutorial-lines');
    p.lines.forEach((line) => body.append(el('p', '', viewControlLine(line))));
    page.append(body);
    stage.append(page);
  });
  modal.append(stage);

  const dots = el('div', 'tutorial-dots');
  TUTORIAL_PAGES.forEach((_p, i) => {
    const dot = el('span', `tutorial-dot${i === 0 ? ' on' : ''}`);
    dots.append(dot);
  });
  modal.append(dots);

  const nav = el('div', 'tutorial-nav');
  const back = el('button', 'wood-btn small', '← Back') as HTMLButtonElement;
  const skip = el('button', 'tutorial-skip', 'skip');
  const next = el('button', 'wood-btn', 'Next →') as HTMLButtonElement;
  nav.append(back, skip, next);
  modal.append(nav);

  let idx = 0;
  const pages = Array.from(stage.querySelectorAll('.tutorial-page'));
  const dotEls = Array.from(dots.querySelectorAll('.tutorial-dot'));
  const render = (): void => {
    pages.forEach((p, i) => p.classList.toggle('active', i === idx));
    dotEls.forEach((d, i) => d.classList.toggle('on', i === idx));
    back.style.visibility = idx === 0 ? 'hidden' : 'visible';
    next.textContent = idx === TUTORIAL_PAGES.length - 1 ? finishLabel : 'Next →';
  };
  back.onclick = () => { if (idx > 0) { idx--; render(); } };
  next.onclick = () => {
    if (idx < TUTORIAL_PAGES.length - 1) { idx++; render(); }
    else onClose();
  };
  skip.onclick = onClose;
  render();

  wrap.append(modal);
  return wrap;
}

/** LEVEL SELECT — the CRAYON HOUSE CUTAWAY (mobile-store revamp §A1). The whole screen is now
 *  built by src/ui/houseMap.ts; this thin wrapper preserves the historical buildLevelSelect
 *  signature so ui.ts's showLevelSelect() (and its callback contracts) stay untouched. Pet picker,
 *  journal/junk-drawer/endless entries, and secret levels all live inside the house-map engine. */
export function buildLevelSelect(
  save: SaveData,
  onPick: (id: string) => void,
  onBack: () => void,
  onJournal: () => void,
  onPetChange: (pet: 'cat' | 'dog' | 'goldfish' | null) => void,
  onJunkDrawer: () => void,
  onEndless?: () => void,
  onPickSecret?: (id: string) => void,
): HTMLElement {
  return buildHouseMap(save, {
    onPick,
    onPickSecret,
    onPetChange,
    onBack,
    onJournal,
    onJunkDrawer,
    onEndless,
  });
}

/** The Critterdex — "a kid's field journal" (GAME-PROMPT §18/§2.5). Lined notebook paper,
 *  one index card per species (crayon-portrait emoji, kid-voice desc, kill/jar tallies),
 *  silhouette "???" cards for anything never yet seen. Bosses get a wide full-spread card. */
export function buildJournal(save: SaveData, content: ContentDB, onBack: () => void): HTMLElement {
  const screen = el('div', 'screen journal-screen');
  const book = el('div', 'journal-book');

  const ribbonWrap = el('div', 't2-ribbonbar inline');
  ribbonWrap.append(buildStatusRibbon(save));
  book.append(ribbonWrap);

  const pct = critterdexCompletionPct(save);
  const header = el('div', 'journal-header');
  header.append(
    el('div', 'journal-title', '📔 my critter journal'),
    el('div', 'journal-pct', `${pct}% filled in${pct >= 100 ? ' — THE GOLDEN JAR!! 🏆' : ''}`),
  );
  book.append(header);

  const pctBar = el('div', 'journal-bar');
  const pctFill = el('div', 'journal-bar-fill');
  pctFill.style.width = `${pct}%`;
  pctBar.append(pctFill);
  book.append(pctBar);

  const order = critterdexOrder();
  const regular = order.filter((c) => !c.boss);
  const bosses = order.filter((c) => c.boss);

  const grid = el('div', 'journal-grid');
  regular.forEach((def, i) => grid.append(journalCard(save, def, i)));
  book.append(grid);

  if (bosses.length > 0) {
    book.append(el('div', 'journal-section-label', '👑 the big ones (full-page entries)'));
    const bossGrid = el('div', 'journal-boss-grid');
    bosses.forEach((def, i) => bossGrid.append(journalCard(save, def, i, true)));
    book.append(bossGrid);
  }

  const back = el('button', 'wood-btn small', '← Fridge');
  back.style.marginTop = '16px';
  back.onclick = onBack;
  book.append(back);

  screen.append(book);
  return screen;
}

function journalCard(save: SaveData, def: import('../sim/types').CritterDef, i: number, boss = false): HTMLElement {
  const seen = isCritterSeen(save, def.id);
  const cls = `journal-card${boss ? ' boss-card' : ''}${seen ? '' : ' unseen'}`;
  const card = el('div', cls);
  card.style.setProperty('--tilt', `${((i * 17 + (boss ? 5 : 0)) % 5) - 2}deg`);

  // Boss cards lay portrait + text side-by-side (full-page-spread feel); regular cards
  // stack everything vertically. `body` holds everything after the portrait either way —
  // for regular cards it's just appended inline (flex-direction differs per .boss-card CSS).
  const body = boss ? el('div', 'journal-body') : card;

  if (!seen) {
    card.append(el('div', 'journal-portrait silhouette', '❓'));
    body.append(
      el('div', 'journal-name', '???'),
      el('div', 'journal-desc unknown-desc', 'never spotted this one yet. squish or jar one to fill in the page!'),
    );
    if (boss) card.append(body);
    return card;
  }

  const kills = killCount(save, def.id);
  const jars = jarCount(save, def.id);
  const shinies = shinyCount(save, def.id);

  card.append(el('div', 'journal-portrait', CRITTER_ICONS[def.id] ?? '❔'));
  body.append(el('div', 'journal-name', def.name));
  if (boss) body.append(el('div', 'journal-tier', 'BOSS'));
  body.append(el('div', 'journal-desc', def.desc));

  const stats = el('div', 'journal-stats');
  stats.append(el('div', 'journal-stat', `🥊 squished: <b>${kills}</b>`));
  if (jars > 0) stats.append(el('div', 'journal-stat', `🫙 jarred: <b>${jars}</b>`));
  if (shinies > 0) stats.append(el('div', 'journal-stat shiny-stat', `✨ shiny seen: <b>${shinies}</b>`));
  body.append(stats);

  if (boss) card.append(body);
  return card;
}

/** The Junk Drawer (GAME-PROMPT §18) — permanent Brownie-Point-purchased unlocks. A literal
 *  messy kitchen drawer that slides open (CSS animation on .drawer-body, replayed each time
 *  the screen builds — matches the "reachable from title" framing: every visit feels like
 *  pulling it open again). `onPurchase` re-renders the whole screen on success so newly-owned
 *  items flip state immediately and affordability recalculates against the new BP balance. */
export function buildJunkDrawer(
  save: SaveData,
  onPurchase: (id: string) => boolean,
  onBack: () => void,
): HTMLElement {
  const screen = el('div', 'screen drawer-screen');
  const wrap = el('div', 'drawer-wrap');

  const ribbonWrap = el('div', 't2-ribbonbar inline');
  ribbonWrap.append(buildStatusRibbon(save));
  wrap.append(ribbonWrap);

  const titleRow = el('div', 'drawer-title-row');
  titleRow.append(el('div', 'drawer-title', '🗄️ The Junk Drawer'));
  titleRow.append(el('div', 'drawer-bp-chip', `🧁 ${currentBP(save)} BP`));
  wrap.append(titleRow);
  wrap.append(el('div', 'drawer-sub', 'every house has one. spend Brownie Points on permanent unlocks — earned from stars and achievements.'));

  const body = el('div', 'drawer-body');

  const simItems = JUNK_DRAWER_ITEMS.filter((i) => i.kind === 'sim');
  const cosmeticItems = JUNK_DRAWER_ITEMS.filter((i) => i.kind === 'cosmetic');

  body.append(el('div', 'drawer-section-label', '🔧 Hand & Household Upgrades'));
  const simGrid = el('div', 'drawer-grid');
  simItems.forEach((item, i) => simGrid.append(drawerItemCard(save, item, i, onPurchase, () => rerender())));
  body.append(simGrid);

  body.append(el('div', 'drawer-section-label', '✨ Cosmetics'));
  const cosGrid = el('div', 'drawer-grid');
  cosmeticItems.forEach((item, i) => cosGrid.append(drawerItemCard(save, item, i, onPurchase, () => rerender())));
  body.append(cosGrid);

  wrap.append(body);

  const backRow = el('div', 'drawer-back-row');
  const back = el('button', 'wood-btn small', '← Fridge');
  back.onclick = onBack;
  backRow.append(back);
  wrap.append(backRow);

  screen.append(wrap);

  // in-place re-render on purchase: swap the drawer-wrap contents so the BP chip and every
  // item's owned/affordable state refresh without losing scroll position on the parent screen.
  function rerender(): void {
    const fresh = buildJunkDrawer(save, onPurchase, onBack);
    screen.replaceWith(fresh);
  }

  return screen;
}

function drawerItemCard(
  save: SaveData,
  item: JunkDrawerItem,
  i: number,
  onPurchase: (id: string) => boolean,
  onPurchased: () => void,
): HTMLElement {
  const owned = isPurchased(save, item.id);
  const affordable = canAfford(save, item);
  const lockedByReq = !!item.requires && !isPurchased(save, item.requires);
  const cls = `drawer-item${owned ? ' owned' : ''}${!owned && (lockedByReq || !affordable) ? ' locked' : ''}`;
  const card = el('div', cls);
  card.style.setProperty('--tilt', `${((i * 13) % 5) - 2}deg`);

  const head = el('div', 'drawer-item-head');
  head.append(el('div', 'drawer-item-ico', item.kind === 'sim' ? '🔧' : '✨'));
  head.append(el('div', 'drawer-item-name', item.name));
  card.append(head);
  card.append(el('div', 'drawer-item-desc', item.desc));

  if (item.requires) {
    const req = JUNK_DRAWER_ITEMS.find((x) => x.id === item.requires);
    card.append(el('div', 'drawer-item-req', `requires: ${req?.name ?? item.requires}`));
  }

  const foot = el('div', 'drawer-item-foot');
  if (owned) {
    foot.append(el('div', 'drawer-item-owned-tag', '✔ owned'));
  } else {
    foot.append(el('div', 'drawer-item-cost', `🧁 ${item.cost} BP`));
    const btn = el('button', 'wood-btn small', lockedByReq ? 'locked' : 'buy') as HTMLButtonElement;
    btn.disabled = lockedByReq || !affordable;
    btn.onclick = () => {
      if (onPurchase(item.id)) onPurchased();
    };
    foot.append(btn);
  }
  card.append(foot);

  return card;
}

export interface RecapInfo {
  won: boolean;
  lossReason?: string;
  level: LevelDef;
  state: SimState;
  recap: RecapData;
  stars: number;
  starDetail: [boolean, boolean, boolean];
  /** Pantry Panic (§16): generated waves survived — recap shows depth instead of stars. */
  endlessDepth?: number;
}

export function buildRecap(
  info: RecapInfo,
  onRetry: () => void,
  onLevels: () => void,
  onNext: (() => void) | null,
): HTMLElement {
  const wrap = el('div', 'modal-wrap');
  const modal = el('div', 'paper-modal');
  const r = info.recap;

  const endless = info.endlessDepth !== undefined;
  const headline = endless
    ? `🥫 PANTRY PANIC — wave ${info.state.waveIndex + 1}`
    : info.won
      ? `🎉 The Cake Survives!`
      : info.lossReason === 'theSwarm'
        ? `🐜🐜🐜 THE SWARM CAME`
        : `😭 The Cake... is Gone`;
  const sub = endless
    ? `You survived ${info.endlessDepth} endless wave${info.endlessDepth === 1 ? '' : 's'} past the recipe book. The pantry sends its regards.`
    : info.won
      ? `${info.level.name} — defended with ${info.state.cakeSlices}/${info.state.cakeMax} slices left`
      : info.lossReason === 'theSwarm'
        ? 'You let the scent hit 100% and STAY there. They smelled everything.'
        : 'The wish flickers out. The towers slump. Somewhere, an ant burps.';

  let html = `<h2>${headline}</h2><div class="sub">${sub}</div>`;

  if (info.won) {
    const [s1, s2, s3] = info.starDetail;
    html += `<div class="recap-stars">${s1 ? '★' : '<span class="off">★</span>'}${s2 ? '★' : '<span class="off">★</span>'}${s3 ? '★' : '<span class="off">★</span>'}</div>
      <div style="text-align:center;font-size:13px;margin-bottom:8px">
        beat it &nbsp;·&nbsp; ≤2 bites (${info.state.cakeMax - info.state.cakeSlices} taken) &nbsp;·&nbsp; ${info.level.challenge?.text ?? '—'}
      </div>`;
  }

  // scent history graph
  html += `<canvas class="recap-graph" width="540" height="90"></canvas>`;

  const bites = Object.entries(r.bitesBySource).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const towers = Object.entries(r.killsByTower).sort((a, b) => b[1] - a[1]).slice(0, 5);
  html += `<div class="recap-cols">
    <div><h4>😬 Who ate the cake</h4><ul>${bites.length ? bites.map(([k, v]) => `<li>${k}: ${v} bite${v > 1 ? 's' : ''}</li>`).join('') : '<li>nobody!! 😎</li>'}</ul></div>
    <div><h4>🏆 Top defenders</h4><ul>${towers.length ? towers.map(([k, v]) => `<li>${k}: ${v}</li>`).join('') : '<li>—</li>'}</ul></div>
    <div><h4>📋 Chores</h4><ul>
      <li>kills: ${r.kills}</li>
      <li>sweeps: ${r.sweeps}</li>
      <li>crumbs banked: ${r.crumbsBanked}</li>
      <li>crumbs fed to enemy: ${r.crumbsWasted} ${r.crumbsWasted > 30 ? '😱' : ''}</li>
    </ul></div>
  </div>`;

  html += `<div class="recap-actions" style="display:flex;gap:10px;justify-content:center;margin-top:16px">
    <button class="wood-btn" data-act="retry">↻ ${info.won ? 'Replay' : 'One More Try'}</button>
    ${onNext ? '<button class="wood-btn" data-act="next">Next Level →</button>' : ''}
    <button class="wood-btn small" data-act="levels">Corkboard</button>
  </div>`;

  modal.innerHTML = html;
  wrap.append(modal);

  (modal.querySelector('[data-act=retry]') as HTMLElement).onclick = onRetry;
  (modal.querySelector('[data-act=levels]') as HTMLElement).onclick = onLevels;
  const nextBtn = modal.querySelector('[data-act=next]') as HTMLElement | null;
  if (nextBtn && onNext) nextBtn.onclick = onNext;

  // draw scent history
  const canvas = modal.querySelector('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const hist = r.scentHistory.length > 1 ? r.scentHistory : [0, 0];
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 540, 90);
  for (const threshold of [25, 50, 75]) {
    ctx.strokeStyle = '#eee0c8';
    ctx.beginPath();
    ctx.moveTo(0, 88 - (threshold / 100) * 84);
    ctx.lineTo(540, 88 - (threshold / 100) * 84);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c85838';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  hist.forEach((v, i) => {
    const x = (i / (hist.length - 1)) * 536 + 2;
    const y = 88 - (v / 100) * 84;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#7a6a55';
  ctx.font = '11px sans-serif';
  ctx.fillText('scent over time — high scent = bigger waves', 8, 14);

  return wrap;
}

/** The thermostat (§23 UI/UX + §20.15 accessibility suite). Three diegetic sections: SOUND
 *  (the volume dials), FEEL (screen shake/flash/UI scale — "how intense does this house feel"),
 *  ACCESSIBILITY (colorblind patterns, arachnophobia, difficulty). Mobile-friendly: reuses the
 *  existing .paper-modal scroll/shrink rules, all rows share the same .thermo-row flex layout
 *  that already collapses gracefully at small widths. */
export function buildSettings(
  save: SaveData,
  onChange: (s: SaveData['settings']) => void,
  onClose: () => void,
): HTMLElement {
  const wrap = el('div', 'modal-wrap');
  const modal = el('div', 'paper-modal thermo-modal');

  const rangeRow = (icon: string, label: string, key: string, min: number, max: number, step: number, value: number): string => `
    <div class="thermo-row"><label>${icon} ${label}</label><input type="range" min="${min}" max="${max}" step="${step}" data-k="${key}" value="${value}"><span class="thermo-val" data-val="${key}">${value.toFixed(2)}</span></div>
  `;
  const toggleRow = (icon: string, label: string, key: string, on: boolean, hint = ''): string => `
    <div class="thermo-row"><label>${icon} ${label}${hint ? `<small class="thermo-hint">${hint}</small>` : ''}</label><button class="toggle ${on ? 'on' : ''}" data-k="${key}"></button></div>
  `;

  modal.innerHTML = `
    <h2>🌡️ The Thermostat</h2>
    <div class="sub">house settings — adjust to taste</div>

    <div class="thermo-section"><h3>🔊 Sound</h3></div>
    ${rangeRow('🎵', 'Music', 'musicVol', 0, 1, 0.05, save.settings.musicVol)}
    ${rangeRow('🔊', 'Sounds', 'sfxVol', 0, 1, 0.05, save.settings.sfxVol)}

    <div class="thermo-section"><h3>💥 Feel</h3></div>
    ${rangeRow('📳', 'Screen shake', 'shakeIntensity', 0, 1, 0.05, save.settings.shakeIntensity)}
    ${rangeRow('⚡', 'Flash intensity', 'flashIntensity', 0, 1, 0.05, save.settings.flashIntensity)}

    <div class="thermo-section"><h3>🖥️ Display</h3></div>
    <div class="thermo-row"><label>⛶ Fullscreen<small class="thermo-hint">or press F11 anytime</small></label><button class="toggle ${isFullscreen() ? 'on' : ''}" data-k="fullscreen"></button></div>
    <div class="thermo-row"><label>🔍 UI scale<small class="thermo-hint">auto base ×${autoUiScale().toFixed(2)} for this screen — slider fine-tunes on top</small></label><input type="range" min="0.85" max="1.3" step="0.05" data-k="uiScale" value="${save.settings.uiScale}"><span class="thermo-val" data-val="uiScale">${save.settings.uiScale.toFixed(2)}</span></div>

    <div class="thermo-section"><h3>♿ Accessibility</h3></div>
    ${toggleRow('🎨', 'Colorblind-safe patterns', 'colorblind', save.settings.colorblind)}
    ${toggleRow('🕷️', 'Arachnophobia mode', 'arachnophobia', save.settings.arachnophobia, 'spiders become googly-eyed roombas — takes effect next level')}
    <div class="thermo-row"><label>💀 Difficulty</label>
      <select data-k="difficulty" style="font-family:inherit;font-size:16px;padding:4px 8px">
        ${(['houseguest', 'homeowner', 'landlord', 'condemned'] as const)
          .map((d) => `<option value="${d}" ${save.settings.difficulty === d ? 'selected' : ''}>${d}</option>`)
          .join('')}
      </select>
    </div>

    <div class="modal-done-row" style="text-align:center;margin-top:16px"><button class="wood-btn" data-act="close">Done</button></div>
  `;
  wrap.append(modal);

  modal.querySelectorAll('input[type=range]').forEach((input) => {
    (input as HTMLInputElement).oninput = () => {
      const k = (input as HTMLElement).dataset.k as 'musicVol' | 'sfxVol' | 'shakeIntensity' | 'flashIntensity' | 'uiScale';
      const v = parseFloat((input as HTMLInputElement).value);
      save.settings[k] = v;
      const valEl = modal.querySelector(`[data-val="${k}"]`) as HTMLElement | null;
      if (valEl) valEl.textContent = v.toFixed(2);
      // legacy bool kept in sync so any code still reading settings.shake sees a sane value
      if (k === 'shakeIntensity') save.settings.shake = v > 0;
      onChange(save.settings);
    };
  });
  (['colorblind', 'arachnophobia'] as const).forEach((key) => {
    const toggle = modal.querySelector(`[data-k=${key}]`) as HTMLElement;
    toggle.onclick = () => {
      save.settings[key] = !save.settings[key];
      toggle.classList.toggle('on', save.settings[key]);
      onChange(save.settings);
    };
  });
  // Fullscreen is a live display action, not a persisted save setting — toggle the browser/shell
  // fullscreen state and reflect it back on the switch. Kept in sync with F11/Esc via a
  // fullscreenchange listener scoped to the modal's lifetime (removed when Done closes it).
  const fsToggle = modal.querySelector('[data-k=fullscreen]') as HTMLElement | null;
  if (fsToggle) {
    const syncFs = (): void => { fsToggle.classList.toggle('on', isFullscreen()); };
    fsToggle.onclick = () => { toggleFullscreen(); requestAnimationFrame(syncFs); };
    document.addEventListener('fullscreenchange', syncFs);
    // stash the remover on the element so the Done handler can detach it (see below)
    (fsToggle as HTMLElement & { _detachFs?: () => void })._detachFs =
      () => document.removeEventListener('fullscreenchange', syncFs);
  }
  (modal.querySelector('[data-k=difficulty]') as HTMLSelectElement).onchange = (e) => {
    save.settings.difficulty = (e.target as HTMLSelectElement).value as SaveData['settings']['difficulty'];
    onChange(save.settings);
  };
  (modal.querySelector('[data-act=close]') as HTMLElement).onclick = () => {
    (fsToggle as (HTMLElement & { _detachFs?: () => void }) | null)?._detachFs?.();
    onClose();
  };
  return wrap;
}

// =========================================================================
// INFESTATION MODE (GAME-PROMPT §15) — the roguelike run layer.
// A hand-drawn house cross-section path (run map), polaroid card draft, a
// lawn-table Garage Sale shop, and a run-over recap. Reuses the same paper /
// wood-btn / sticky / card visual vocabulary as the campaign screens above.
// =========================================================================

const NODE_ICON: Record<NodeKind, string> = {
  fight: '🥊', elite: '👑', shop: '🛒', rest: '🛋️', boss: '💀',
};
const NODE_LABEL: Record<NodeKind, string> = {
  fight: 'Fight', elite: 'Elite', shop: 'Garage Sale', rest: 'Couch Nap', boss: 'Floor Boss',
};

/** The run map: a branching path drawn like a kid's cross-section of the current floor, node
 *  icons showing kind + clear state, reachable nodes clickable. */
export function buildInfestationMap(
  run: RunState,
  content: ContentDB,
  onPickNode: (index: number) => void,
  onAbandon: () => void,
): HTMLElement {
  const screen = el('div', 'screen infest-screen');
  const wrap = el('div', 'infest-wrap');

  const header = el('div', 'infest-header');
  header.append(el('div', 'infest-title', `🐜 INFESTATION — Floor ${run.floor} of 3`));
  const chips = el('div', 'infest-chips');
  chips.append(el('div', 'infest-chip', `🎂 ${run.slices} slices`));
  chips.append(el('div', 'infest-chip', `🔩 ${run.scraps} scraps`));
  chips.append(el('div', 'infest-chip', `🃏 ${run.deck.length}/${DECK_MAX} deck`));
  header.append(chips);
  wrap.append(header);

  if (run.relics.length > 0) {
    const relicRow = el('div', 'infest-relic-row');
    for (const id of run.relics) {
      const r = RELICS_BY_ID[id];
      if (!r) continue;
      const chip = el('div', 'infest-relic-chip', r.item.split(' ')[0]);
      chip.title = `${r.name} — ${r.desc}`;
      relicRow.append(chip);
    }
    wrap.append(relicRow);
  }

  const nodes = currentFloorNodes(run);
  const reachable = new Set(reachableNodeIndices(run));
  const board = el('div', 'infest-board');

  // group nodes by column for a branching-path layout (col 0 = entry, 1 = branch, 2 = funnel, 3 = boss)
  const maxCol = Math.max(...nodes.map((n) => n.col));
  for (let c = 0; c <= maxCol; c++) {
    const laneNodes = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.col === c);
    const lane = el('div', 'infest-lane');
    laneNodes.forEach(({ n, i }) => {
      const isCurrent = run.nodeIndex === i;
      const isReachable = reachable.has(i) && !n.cleared;
      const cls = `infest-node infest-node-${n.kind}${n.cleared ? ' cleared' : ''}${isReachable ? ' reachable' : ''}${isCurrent ? ' current' : ''}`;
      const lvl = n.levelId ? levelById(n.levelId) : null;
      const btn = el('button', cls, `
        <div class="infest-node-ico">${NODE_ICON[n.kind]}</div>
        <div class="infest-node-label">${NODE_LABEL[n.kind]}</div>
        ${lvl ? `<div class="infest-node-sub">${lvl.name}</div>` : ''}
        ${n.cleared ? '<div class="infest-node-check">✔</div>' : ''}
      `) as HTMLButtonElement;
      btn.disabled = !isReachable;
      if (isReachable) btn.onclick = () => onPickNode(i);
      lane.append(btn);
    });
    board.append(lane);
  }
  wrap.append(board);

  const footer = el('div', 'infest-footer');
  // Two-step "arm" confirm (no native browser dialogs anywhere else in this diegetic UI) — first
  // click reveals a "really??" state, second click within the window actually abandons.
  const abandon = el('button', 'wood-btn small danger', 'Abandon Run') as HTMLButtonElement;
  let armed = false;
  let armTimer: ReturnType<typeof setTimeout> | null = null;
  abandon.onclick = () => {
    if (armed) { onAbandon(); return; }
    armed = true;
    abandon.textContent = 'really?? click again';
    abandon.classList.add('armed');
    if (armTimer) clearTimeout(armTimer);
    armTimer = setTimeout(() => {
      armed = false;
      abandon.textContent = 'Abandon Run';
      abandon.classList.remove('armed');
    }, 2600);
  };
  footer.append(abandon);
  wrap.append(footer);

  screen.append(wrap);
  return screen;
}

/** Card draft modal — reuses the polaroid .card look from the build bar, at a larger scale
 *  with tower role/desc text so a pick actually feels informed. */
export function buildInfestationDraft(
  content: ContentDB,
  options: string[],
  onPick: (towerId: string) => void,
): HTMLElement {
  const wrap = el('div', 'modal-wrap');
  const modal = el('div', 'paper-modal');
  modal.innerHTML = `<h2>🃏 Pick a Tower</h2><div class="sub">victory spoils — one joins the deck:</div>`;
  const row = el('div', 'draft-row');
  for (const id of options) {
    const t = content.towers[id];
    if (!t) continue;
    const card = el('div', 'draft-card', `
      <div class="face">${TOWER_ICONS[id] ?? '🔧'}</div>
      <b>${t.name}</b>
      <div class="draft-role">${t.role}</div>
      <p>${t.desc}</p>
    `);
    card.onclick = () => onPick(id);
    row.append(card);
  }
  modal.append(row);
  wrap.append(modal);
  return wrap;
}

/** Garage Sale — a lawn-table shop (§23 aesthetic): buy a random tower card, remove a curse,
 *  buy a random relic, or top up slices. Prices reflect any Expired-Coupons-style discount
 *  already baked into `shopPrice()`. */
export function buildGarageSale(
  run: RunState,
  content: ContentDB,
  floor: number,
  nodeIndex: number,
  onBuyTower: (id: string) => void,
  onBuyRelic: (id: string) => void,
  onRemoveCurse: (id: string) => void,
  onBuySlices: () => void,
  onLeave: () => void,
): HTMLElement {
  const screen = el('div', 'screen infest-screen shop-screen');
  const wrap = el('div', 'shop-wrap');

  wrap.append(el('div', 'shop-header', '🛒 GARAGE SALE'));
  wrap.append(el('div', 'shop-sub', 'everything must go. cash or crumbs, no refunds.'));
  wrap.append(el('div', 'infest-chip shop-scraps-chip', `🔩 ${run.scraps} scraps`));

  const { towerCards, relicOffer } = rollShopWares(run, floor, nodeIndex);
  const table = el('div', 'shop-table');

  towerCards.forEach((id) => {
    const t = content.towers[id];
    if (!t) return;
    const price = shopPrice(run, 'towerCard');
    const affordable = run.scraps >= price && run.deck.length < DECK_MAX;
    const item = el('div', `shop-item${affordable ? '' : ' locked'}`, `
      <div class="face">${TOWER_ICONS[id] ?? '🔧'}</div>
      <b>${t.name}</b>
      <p>${t.role}</p>
      <div class="shop-price">🔩 ${price}</div>
    `);
    const btn = el('button', 'wood-btn small', run.deck.length >= DECK_MAX ? 'deck full' : 'buy') as HTMLButtonElement;
    btn.disabled = !affordable;
    btn.onclick = () => onBuyTower(id);
    item.append(btn);
    table.append(item);
  });

  if (relicOffer) {
    const r = RELICS_BY_ID[relicOffer];
    const price = shopPrice(run, 'relic');
    const affordable = run.scraps >= price;
    const item = el('div', `shop-item shop-item-relic${affordable ? '' : ' locked'}`, `
      <div class="face">${r.item.split(' ')[0]}</div>
      <b>${r.name}</b>
      <p>${r.desc}</p>
      <div class="shop-price">🔩 ${price}</div>
    `);
    const btn = el('button', 'wood-btn small', 'buy') as HTMLButtonElement;
    btn.disabled = !affordable;
    btn.onclick = () => onBuyRelic(relicOffer);
    item.append(btn);
    table.append(item);
  }

  if (run.curses.length > 0) {
    const curseId = run.curses[0];
    const curseDef = content.mutations[curseId];
    const price = shopPrice(run, 'removeCurse');
    const affordable = run.scraps >= price;
    const item = el('div', `shop-item shop-item-curse${affordable ? '' : ' locked'}`, `
      <div class="face">${MUTATION_ICONS[curseId] ?? '🧬'}</div>
      <b>Remove: ${curseDef?.name ?? curseId}</b>
      <p>${curseDef?.desc ?? ''}</p>
      <div class="shop-price">🔩 ${price}</div>
    `);
    const btn = el('button', 'wood-btn small', 'cleanse') as HTMLButtonElement;
    btn.disabled = !affordable;
    btn.onclick = () => onRemoveCurse(curseId);
    item.append(btn);
    table.append(item);
  }

  {
    const price = shopPrice(run, 'slices');
    const affordable = run.scraps >= price;
    const item = el('div', `shop-item${affordable ? '' : ' locked'}`, `
      <div class="face">🎂</div>
      <b>+2 Cake Slices</b>
      <p>patch the cake up before the next fight.</p>
      <div class="shop-price">🔩 ${price}</div>
    `);
    const btn = el('button', 'wood-btn small', 'buy') as HTMLButtonElement;
    btn.disabled = !affordable;
    btn.onclick = () => onBuySlices();
    item.append(btn);
    table.append(item);
  }

  wrap.append(table);

  const leave = el('button', 'wood-btn', 'Leave the Sale →');
  leave.style.marginTop = '16px';
  leave.onclick = onLeave;
  wrap.append(leave);

  screen.append(wrap);
  return screen;
}

export interface RunOverInfo {
  won: boolean;
  run: RunState;
}

/** Run-over recap (won the floor-3 boss, or died) — kills/floors/relics collected. */
export function buildRunOver(info: RunOverInfo, onReturn: () => void): HTMLElement {
  const wrap = el('div', 'modal-wrap');
  const modal = el('div', 'paper-modal');
  const { run, won } = info;
  const headline = won ? '🏆 THE HOUSE IS CLEAN' : '💀 THE RUN ENDS HERE';
  const sub = won
    ? 'Three floors. Every boss. The infestation is over — for now.'
    : `Made it to floor ${run.floor}, ${run.floorsCleared} floor${run.floorsCleared === 1 ? '' : 's'} fully cleared.`;
  let html = `<h2>${headline}</h2><div class="sub">${sub}</div>`;
  html += `<div class="recap-cols">
    <div><h4>📋 Run Stats</h4><ul>
      <li>kills: ${run.kills}</li>
      <li>floors cleared: ${run.floorsCleared}</li>
      <li>deck size: ${run.deck.length}</li>
      <li>scraps left: ${run.scraps}</li>
    </ul></div>
    <div><h4>🏺 Relics Collected</h4><ul>${run.relics.length ? run.relics.map((id) => `<li>${RELICS_BY_ID[id]?.name ?? id}</li>`).join('') : '<li>none this run</li>'}</ul></div>
    <div><h4>🃏 Final Deck</h4><ul>${run.deck.map((id) => `<li>${TOWER_ICONS[id] ?? '🔧'} ${id}</li>`).join('')}</ul></div>
  </div>`;
  html += `<div style="text-align:center;margin-top:16px"><button class="wood-btn" data-act="return">Back to the Fridge</button></div>`;
  modal.innerHTML = html;
  wrap.append(modal);
  (modal.querySelector('[data-act=return]') as HTMLElement).onclick = onReturn;
  return wrap;
}
