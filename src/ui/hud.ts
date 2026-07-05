import type { LevelDef, SimState, Tower } from '../sim/types';
import type { ContentDB } from '../sim/types';
import { SHAPE_ICONS, SPELL_ICONS, TOWER_ICONS } from './icons';
import { persistSave, type SaveData } from '../meta/save';

export interface HudCallbacks {
  onSelectTower(def: string): void;
  onSelectClutter(shape: string): void;
  onSelectSpell(id: string): void;
  onCallWave(): void;
  onSpeed(mult: 1 | 2 | 3): void;
  onPause(): void;
  /** PHOTO MODE (§18): the small camera button in the HUD corner. */
  onPhotoMode(): void;
  /** Overhead "see everything" camera toggle. */
  onTopDown(): void;
}

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const nextSpeed = (m: 1 | 2 | 3): 1 | 2 | 3 => (m === 3 ? 1 : ((m + 1) as 1 | 2 | 3));

/** The in-level HUD: chips, nose meter, corkboard build bar, egg timer, speed cluster.
 *  On mobile (see style.css's mobile media query), the build bar + speed cluster are hidden
 *  and replaced by an always-visible bottom `.dock` — a hammer button that opens the build bar
 *  as a swipe-up sheet, three pinned quick-spell slots, and speed/pause/topdown buttons. Desktop
 *  is untouched (the dock is display:none there). */
export class Hud {
  root = el('div');
  private cakeChip!: HTMLElement;
  private crumbChip!: HTMLElement;
  private waveChip!: HTMLElement;
  private noseFill!: HTMLElement;
  private nosePct!: HTMLElement;
  private noseMeter!: HTMLElement;
  private manaFill!: HTMLElement;
  private manaNum!: HTMLElement;
  private forecast!: HTMLElement;
  private eggTimer!: HTMLElement;
  private callBtn!: HTMLButtonElement;
  private callCluster!: HTMLElement;
  private towerCards = new Map<string, HTMLElement>();
  private clutterRow!: HTMLElement;
  private spellBtns = new Map<string, HTMLElement>();
  private spellPins = new Map<string, HTMLElement>();
  private speedBtns: HTMLButtonElement[] = [];
  private topDownB!: HTMLButtonElement;
  /** Both the desktop cluster's ⛶ button and the mobile dock's ⛶ button — setTopDownActive()
   *  updates every entry so the two surfaces never disagree. */
  private topDownBtns: HTMLButtonElement[] = [];
  selectedCard: { kind: 'tower' | 'clutter' | 'spell'; id: string } | null = null;

  // ---------- mobile dock + build sheet ----------
  private dock!: HTMLElement;
  private bar!: HTMLElement;
  private spellSec!: HTMLElement;
  private sheetScrim!: HTMLElement;
  private sheetOpen = false;
  private dockBuildIcon!: HTMLElement;
  private dockBuildBadge!: HTMLElement;
  private quickSlotBtns: HTMLButtonElement[] = [];
  private dockSpeedBtn!: HTMLButtonElement;
  private currentSpeed: 1 | 2 | 3 = 1;

  constructor(
    private content: ContentDB,
    private level: LevelDef,
    private cb: HudCallbacks,
    private save: SaveData,
  ) {
    this.build();
  }

  private build(): void {
    // top chips
    const top = el('div', 'hud-top');
    const left = el('div', 'hud-cluster hud-cluster-left');
    this.cakeChip = el('div', 'chip', '<span class="ico">🎂</span><span class="v"></span>');
    this.waveChip = el('div', 'chip wave-chip', '<span class="v"></span>');
    this.forecast = el('div', 'forecast hidden');
    left.append(this.cakeChip, this.waveChip, this.forecast);

    const right = el('div', 'hud-cluster');
    this.crumbChip = el('div', 'chip', '<span class="ico">🍪</span><span class="v"></span>');
    const jar = el('div', 'mana-jar');
    this.manaFill = el('div', 'fill');
    this.manaNum = el('div', 'num');
    jar.append(this.manaFill, this.manaNum);
    this.noseMeter = el('div', 'nose-meter');
    this.noseFill = el('div', 'fill');
    this.nosePct = el('div', 'pct');
    this.noseMeter.append(this.noseFill, el('div', 'nose-ico', '👃'), this.nosePct);
    right.append(this.crumbChip, jar, this.noseMeter);
    top.append(left, right);

    // call wave cluster
    this.callCluster = el('div', 'call-cluster');
    this.eggTimer = el('div', 'egg-timer');
    this.callBtn = el('button', 'wood-btn small', '🔔 Call Wave') as HTMLButtonElement;
    this.callBtn.onclick = () => this.cb.onCallWave();
    this.callCluster.append(this.eggTimer, this.callBtn);

    // build bar — tower/clutter/spell cards live in a horizontally-scrollable
    // inner strip so they never have to shrink below a usable touch size;
    // the speed/pause cluster is a separate non-scrolling section pinned after it.
    // On mobile this whole bar instead becomes a hidden bottom sheet (see style.css) opened
    // from the dock's hammer/⋯ buttons built further down.
    const bar = el('div', 'build-bar');
    this.bar = bar;
    const scroll = el('div', 'build-bar-scroll');
    const towerSec = el('div', 'bar-section');
    const allowed = this.level.allowedTowers ?? Object.keys(this.content.towers).filter((t) => !t.startsWith('test-'));
    for (const def of allowed) {
      const t = this.content.towers[def];
      if (!t) continue;
      const card = el('div', 'card', `
        <div class="face">${TOWER_ICONS[def] ?? '🔧'}</div>
        <div class="nm">${t.name}</div>
        <div class="cost">🍪${t.tiers[0].cost}</div>
      `);
      card.style.setProperty('--tilt', `${(Math.random() * 3 - 1.5).toFixed(1)}deg`);
      card.title = `${t.name} — ${t.role}\n${t.desc}`;
      card.onclick = () => {
        this.cb.onSelectTower(def);
        this.closeSheetIfMobile();
      };
      this.towerCards.set(def, card);
      towerSec.append(card);
    }

    this.clutterRow = el('div', 'bar-section');

    const spellSec = el('div', 'bar-section');
    this.spellSec = spellSec;
    for (const id of Object.keys(this.content.spells).filter((s) => !s.startsWith('test-'))) {
      const sp = this.content.spells[id];
      const btn = el('button', 'spell-btn', `${SPELL_ICONS[id] ?? '✨'}<div class="cd"></div><span class="cost-tag">${sp.cost}</span>`);
      btn.title = `${sp.name} (${sp.cost} charge)\n${sp.desc}`;
      btn.onclick = () => {
        this.cb.onSelectSpell(id);
        this.closeSheetIfMobile();
      };
      // MOBILE UX quick-slots (§4): a small corner pin toggle (★ pinned / ☆ not). Hidden on
      // desktop via style.css. Lives in a sibling wrapper (not a child of .spell-btn) so it
      // isn't clipped by the button's own overflow:hidden (needed for the circular cd wash).
      const pin = el('span', 'spell-pin', this.save.settings.quickSpells.includes(id) ? '★' : '☆');
      pin.title = 'pin to quick slots';
      pin.addEventListener('pointerdown', (e) => e.stopPropagation());
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePin(id);
      });
      this.spellPins.set(id, pin);
      const wrap = el('div', 'spell-slot-wrap');
      wrap.append(btn, pin);
      this.spellBtns.set(id, btn);
      spellSec.append(wrap);
    }

    const towerGroup = el('div', 'bar-group');
    towerGroup.append(el('div', 'bar-section-label', 'the defense force'), towerSec);
    const clutterGroup = el('div', 'bar-group');
    clutterGroup.append(el('div', 'bar-section-label', 'junk to place'), this.clutterRow);
    const spellGroup = el('div', 'bar-group');
    spellGroup.append(el('div', 'bar-section-label', 'sorcery'), spellSec);

    scroll.append(towerGroup, el('div', 'bar-divider'), clutterGroup, el('div', 'bar-divider'), spellGroup);

    // sheet footer (mobile-only): photo mode's function moves here since the desktop cluster's
    // camera button is hidden on mobile.
    const sheetFooter = el('div', 'sheet-footer');
    const sheetPhotoBtn = el('button', 'sheet-photo-btn', '📸 photo mode') as HTMLButtonElement;
    sheetPhotoBtn.onclick = () => {
      this.cb.onPhotoMode();
      this.closeSheet();
    };
    sheetFooter.append(sheetPhotoBtn);

    bar.append(scroll, sheetFooter);

    // scrim behind the sheet (mobile-only) — tapping it closes the sheet.
    this.sheetScrim = el('div', 'sheet-scrim');
    this.sheetScrim.onclick = () => this.closeSheet();

    // speed cluster (desktop)
    const speed = el('div', 'speed-cluster');
    ([1, 2, 3] as const).forEach((mult) => {
      const b = el('button', 'speed-btn', `${mult}×`) as HTMLButtonElement;
      b.onclick = () => this.cb.onSpeed(mult);
      this.speedBtns.push(b);
      speed.append(b);
    });
    const pauseB = el('button', 'speed-btn', '⏸') as HTMLButtonElement;
    pauseB.onclick = () => this.cb.onPause();
    speed.append(pauseB);
    this.topDownB = el('button', 'speed-btn topdown-btn', '⛶') as HTMLButtonElement;
    this.topDownB.title = 'Overhead view — fit everything on screen (V)';
    this.topDownB.onclick = () => this.cb.onTopDown();
    speed.append(this.topDownB);
    this.topDownBtns.push(this.topDownB);
    const photoB = el('button', 'speed-btn photo-btn', '📸') as HTMLButtonElement;
    photoB.title = 'Photo Mode (P)';
    photoB.onclick = () => this.cb.onPhotoMode();
    speed.append(photoB);

    // ---------- mobile dock (hidden on desktop via style.css) ----------
    const dock = el('div', 'dock');
    this.dock = dock;
    const buildToggle = el('button', 'dock-btn build-toggle') as HTMLButtonElement;
    buildToggle.innerHTML = '<span class="dock-btn-icon">🔨</span><span class="dock-badge hidden"></span>';
    this.dockBuildIcon = buildToggle.querySelector('.dock-btn-icon') as HTMLElement;
    this.dockBuildBadge = buildToggle.querySelector('.dock-badge') as HTMLElement;
    buildToggle.title = 'build';
    buildToggle.onclick = () => this.toggleSheet();
    dock.append(buildToggle);

    for (let i = 0; i < 3; i++) {
      const qb = el('button', 'spell-btn quick-slot') as HTMLButtonElement;
      qb.onclick = () => {
        const id = this.save.settings.quickSpells[i];
        if (id) this.cb.onSelectSpell(id);
      };
      this.quickSlotBtns.push(qb);
      dock.append(qb);
    }

    const moreSpellsB = el('button', 'dock-btn more-spells', '⋯') as HTMLButtonElement;
    moreSpellsB.title = 'more spells';
    moreSpellsB.onclick = () => this.openSheet('spells');
    dock.append(moreSpellsB);

    dock.append(el('div', 'dock-spacer'));

    this.dockSpeedBtn = el('button', 'dock-btn speed-cycle', '1×') as HTMLButtonElement;
    this.dockSpeedBtn.title = 'game speed';
    this.dockSpeedBtn.onclick = () => this.cb.onSpeed(nextSpeed(this.currentSpeed));
    dock.append(this.dockSpeedBtn);

    const dockPauseB = el('button', 'dock-btn dock-pause', '⏸') as HTMLButtonElement;
    dockPauseB.onclick = () => this.cb.onPause();
    dock.append(dockPauseB);

    const dockTopDownB = el('button', 'dock-btn dock-topdown topdown-btn', '⛶') as HTMLButtonElement;
    dockTopDownB.title = 'overhead view';
    dockTopDownB.onclick = () => this.cb.onTopDown();
    dock.append(dockTopDownB);
    this.topDownBtns.push(dockTopDownB);

    this.root.append(top, this.callCluster, this.sheetScrim, bar, speed, dock);
    this.renderQuickSlots();
  }

  setSelected(sel: { kind: 'tower' | 'clutter' | 'spell'; id: string } | null): void {
    this.selectedCard = sel;
    for (const [def, card] of this.towerCards) {
      card.classList.toggle('selected', sel?.kind === 'tower' && sel.id === def);
    }
    for (const [id, btn] of this.spellBtns) {
      btn.classList.toggle('selected', sel?.kind === 'spell' && sel.id === id);
    }
    this.quickSlotBtns.forEach((btn, i) => {
      const id = this.save.settings.quickSpells[i];
      btn.classList.toggle('selected', !!id && sel?.kind === 'spell' && sel.id === id);
    });
    // mobile dock: the hammer button previews the active tower/clutter selection's icon so
    // players can tell what they're about to place without opening the sheet.
    if (sel?.kind === 'tower') this.dockBuildIcon.textContent = TOWER_ICONS[sel.id] ?? '🔨';
    else if (sel?.kind === 'clutter') this.dockBuildIcon.textContent = SHAPE_ICONS[sel.id] ?? '🔨';
    else this.dockBuildIcon.textContent = '🔨';
    this.refreshClutter(this.lastHand, sel);
  }

  private lastHand: string[] = [];

  refreshClutter(hand: string[], sel = this.selectedCard): void {
    this.lastHand = hand;
    this.clutterRow.innerHTML = '';
    const counts = new Map<string, number>();
    for (const s of hand) counts.set(s, (counts.get(s) ?? 0) + 1);
    for (const [shape, count] of counts) {
      const def = this.content.shapes[shape];
      if (!def) continue;
      const card = el('div', 'card', `
        <div class="face">${SHAPE_ICONS[shape] ?? '📦'}</div>
        <div class="nm">${def.name}</div>
        <div class="qty">${count}</div>
      `);
      card.title = `${def.name} — wall AND tower platform. R rotates. Critters can chew it.`;
      if (sel?.kind === 'clutter' && sel.id === shape) card.classList.add('selected');
      card.onclick = () => {
        this.cb.onSelectClutter(shape);
        this.closeSheetIfMobile();
      };
      this.clutterRow.append(card);
    }
    if (counts.size === 0) {
      this.clutterRow.append(el('div', 'card disabled', '<div class="face">🕳️</div><div class="nm">Out of clutter</div>'));
    }
    // mobile dock: small corner badge on the hammer button showing total pieces in hand.
    this.dockBuildBadge.textContent = hand.length > 0 ? `${hand.length}` : '';
    this.dockBuildBadge.classList.toggle('hidden', hand.length === 0);
  }

  update(state: SimState, speedMult: number): void {
    (this.cakeChip.querySelector('.v') as HTMLElement).textContent = `${state.cakeSlices}/${state.cakeMax}`;
    (this.crumbChip.querySelector('.v') as HTMLElement).textContent = `${state.crumbs}`;
    (this.waveChip.querySelector('.v') as HTMLElement).textContent =
      state.phase === 'build' ? `Wave ${state.waveIndex + 2 > state.wavesTotal ? state.wavesTotal : state.waveIndex + 2}/${state.wavesTotal} soon` : `Wave ${state.waveIndex + 1}/${state.wavesTotal}`;

    const scent = Math.round(state.scent);
    this.noseFill.style.height = `${scent}%`;
    this.nosePct.textContent = `${scent}`;
    this.noseMeter.classList.toggle('danger', scent >= 75);

    this.manaFill.style.height = `${(state.mana / state.manaMax) * 100}%`;
    this.manaNum.textContent = `${Math.floor(state.mana)}`;

    // egg timer / call button
    const inBuild = state.phase === 'build';
    this.callCluster.classList.toggle('hidden', !inBuild || state.mutationOffer !== null);
    if (inBuild) {
      if (state.buildTimer > 0) {
        this.eggTimer.innerHTML = `${Math.ceil(state.buildTimer)}<small>auto</small>`;
        this.eggTimer.classList.remove('hidden');
        this.callBtn.innerHTML = `🔔 +${Math.round(state.buildTimer * 3)}🍪`;
      } else {
        this.eggTimer.classList.add('hidden');
        this.callBtn.innerHTML = '🔔 Start Wave';
      }
    }

    // affordability
    for (const [def, card] of this.towerCards) {
      const cost = this.content.towers[def].tiers[0].cost;
      card.classList.toggle('disabled', state.crumbs < cost);
    }
    for (const [id, btn] of this.spellBtns) {
      const sp = this.content.spells[id];
      const cd = state.spellCds[id] ?? 0;
      const cdEl = btn.querySelector('.cd') as HTMLElement;
      cdEl.style.transform = `scaleY(${Math.min(1, cd / sp.cooldown)})`;
      const ready = cd <= 0 && state.mana >= sp.cost;
      btn.classList.toggle('ready', ready);
      btn.classList.toggle('disabled', !ready);
    }
    // mobile quick slots: same cd/afford treatment as the shelf buttons above, re-keyed per
    // slot index since a slot's assigned spell can change any time a pin is toggled.
    this.quickSlotBtns.forEach((btn, i) => {
      const id = this.save.settings.quickSpells[i];
      const sp = id ? this.content.spells[id] : undefined;
      if (!id || !sp) return;
      const cd = state.spellCds[id] ?? 0;
      const cdEl = btn.querySelector('.cd') as HTMLElement | null;
      if (cdEl) cdEl.style.transform = `scaleY(${Math.min(1, cd / sp.cooldown)})`;
      const ready = cd <= 0 && state.mana >= sp.cost;
      btn.classList.toggle('ready', ready);
      btn.classList.toggle('disabled', !ready);
    });

    this.speedBtns.forEach((b, i) => b.classList.toggle('active', speedMult === i + 1));
    this.currentSpeed = speedMult === 2 || speedMult === 3 ? speedMult : 1;
    this.dockSpeedBtn.textContent = `${this.currentSpeed}×`;
  }

  /** Reflect the renderer's top-down toggle on the overhead button(s) — desktop cluster AND
   *  mobile dock. In 2D (the default) the game has no 3D: the toggle shows ⛶ ("see everything")
   *  while zoomed-in and 🔍 ("zoom back in") while in the fit-everything view. The legacy ⛶/3D
   *  labels survive ONLY for the ?renderer=3d debug fallback. */
  setTopDownActive(on: boolean): void {
    const legacy3d = document.documentElement.dataset.renderer === '3d';
    for (const b of this.topDownBtns) {
      b.classList.toggle('active', on);
      if (legacy3d) {
        b.textContent = on ? '3D' : '⛶';
      } else {
        b.textContent = on ? '🔍' : '⛶';
        b.title = on ? 'zoom back in' : 'see everything';
      }
    }
  }

  showForecast(text: string): void {
    this.forecast.innerHTML = text;
    this.forecast.classList.remove('hidden');
  }

  hideForecast(): void {
    this.forecast.classList.add('hidden');
  }

  // ---------- mobile build sheet ----------

  /** True while the dock is actually laid out (i.e. the mobile media query is live) — the
   *  robust way to gate mobile-only behavior (auto-close-on-select) without duplicating the
   *  breakpoint here; style.css stays the single source of truth for it. */
  private isSheetMode(): boolean {
    return getComputedStyle(this.dock).display !== 'none';
  }

  private closeSheetIfMobile(): void {
    if (this.isSheetMode()) this.closeSheet();
  }

  /** Opens the build bar as a bottom sheet (mobile). Pass 'spells' to also scroll the spell
   *  section into view — used by the dock's ⋯ "more spells" button. */
  openSheet(scrollTo?: 'spells'): void {
    this.sheetOpen = true;
    this.bar.classList.add('open');
    this.sheetScrim.classList.add('show');
    if (scrollTo === 'spells') this.spellSec.scrollIntoView({ block: 'nearest' });
  }

  closeSheet(): void {
    this.sheetOpen = false;
    this.bar.classList.remove('open');
    this.sheetScrim.classList.remove('show');
  }

  toggleSheet(): void {
    if (this.sheetOpen) this.closeSheet();
    else this.openSheet();
  }

  // ---------- quick-spell pinning (§4, persisted via save.settings.quickSpells) ----------

  private togglePin(id: string): void {
    const qs = this.save.settings.quickSpells;
    const idx = qs.indexOf(id);
    if (idx >= 0) {
      qs.splice(idx, 1);
    } else {
      if (qs.length >= 3) qs.shift(); // evict the oldest pin (FIFO)
      qs.push(id);
    }
    persistSave(this.save);
    this.renderQuickSlots();
    for (const [spellId, pin] of this.spellPins) {
      pin.textContent = qs.includes(spellId) ? '★' : '☆';
    }
  }

  private renderQuickSlots(): void {
    const ids = this.save.settings.quickSpells;
    this.quickSlotBtns.forEach((btn, i) => {
      const id = ids[i];
      const sp = id ? this.content.spells[id] : undefined;
      if (!id || !sp) {
        btn.innerHTML = '';
        btn.title = '';
        btn.classList.add('empty');
        btn.disabled = true;
        return;
      }
      btn.classList.remove('empty');
      btn.disabled = false;
      btn.innerHTML = `${SPELL_ICONS[id] ?? '✨'}<div class="cd"></div><span class="cost-tag">${sp.cost}</span>`;
      btn.title = `${sp.name} (${sp.cost} charge)\n${sp.desc}`;
    });
  }
}

/** Tower inspect popover. */
export interface InspectCallbacks {
  onUpgrade(id: number): void;
  onBranch(id: number, branch: string): void;
  onSell(id: number): void;
  onMove(id: number): void;
  onHighFive(id: number): void;
  onRearm(id: number): void;
  onClose(): void;
  /** §20.14 lite: right-click/long-press the name to rename this tower's species (per-save). */
  onRename(def: string, name: string): void;
}

export class InspectPanel {
  root = el('div', 'inspect hidden');
  private renaming = false;

  constructor(private content: ContentDB, private cb: InspectCallbacks, private names: Record<string, string> = {}) {}

  show(tower: Tower, state: SimState, screenX: number, screenY: number): void {
    this.renaming = false;
    const def = this.content.towers[tower.def];
    const tier = def.tiers[tower.tier - 1];
    const nextCost = tower.tier === 1 || tower.tier === 2 ? def.tiers[tower.tier].cost : null;
    const branch = tower.branch ? def.branches.find((b) => b.id === tower.branch) : null;
    const displayName = this.names[tower.def] ?? def.name;

    let html = `
      <h3 class="inspect-name" title="right-click (or long-press) to rename">${TOWER_ICONS[tower.def] ?? ''} <span class="nm-text">${displayName}</span>${'★'.repeat(tower.tier - 1)}</h3>
      <div class="role">${def.role}${branch ? ` — <b>${branch.name}</b>` : ''}</div>
      <div class="statline">
        <span>💥 ${tier.dmg}</span><span>⏱ ${tier.rate}/s</span><span>📏 ${tier.range}</span><span>☠️ ${tower.kills}</span>
      </div>
      <div class="actions">
    `;
    if (nextCost !== null) {
      html += `<button class="wood-btn small" data-act="upgrade" ${state.crumbs < nextCost ? 'disabled' : ''}>⬆ Upgrade — 🍪${nextCost}</button>`;
    } else if (!tower.branch && def.branches.length > 0) {
      html += `<div class="branch-row"><b style="font-size:13px">Choose a path:</b>`;
      for (const br of def.branches) {
        html += `<button class="branch-opt" data-branch="${br.id}" ${state.crumbs < br.cost ? 'disabled' : ''}>
          <b>${br.name}</b> — 🍪${br.cost}<br>${br.desc}</button>`;
      }
      html += `</div>`;
    }
    if (def.attack === 'trap' && !tower.armed) {
      html += `<button class="wood-btn small" data-act="rearm">🔧 Re-arm</button>`;
    }
    html += `
        <button class="wood-btn small" data-act="move" ${state.hand.carryCd > 0 ? 'disabled' : ''}>✋ Move${state.hand.carryCd > 0 ? ` (${Math.ceil(state.hand.carryCd)}s)` : ''}</button>
        <button class="wood-btn small" data-act="highfive">🙏 High-five!</button>
        <button class="wood-btn small danger" data-act="sell">💰 Sell — 🍪${Math.round(tower.invested * 0.9)}</button>
      </div>
    `;
    this.root.innerHTML = html;
    this.root.classList.remove('hidden');
    this.root.style.left = `${Math.min(innerWidth - 270, Math.max(8, screenX + 18))}px`;
    this.root.style.top = `${Math.min(innerHeight - 320, Math.max(8, screenY - 60))}px`;

    this.root.querySelectorAll('[data-act]').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const act = (btn as HTMLElement).dataset.act!;
        if (act === 'upgrade') this.cb.onUpgrade(tower.id);
        if (act === 'sell') this.cb.onSell(tower.id);
        if (act === 'move') this.cb.onMove(tower.id);
        if (act === 'highfive') this.cb.onHighFive(tower.id);
        if (act === 'rearm') this.cb.onRearm(tower.id);
      };
    });
    this.root.querySelectorAll('[data-branch]').forEach((btn) => {
      (btn as HTMLElement).onclick = () => this.cb.onBranch(tower.id, (btn as HTMLElement).dataset.branch!);
    });

    // ---- rename: right-click (desktop) or long-press (touch/pen) on the name ----
    const nameEl = this.root.querySelector('.inspect-name') as HTMLElement;
    nameEl.oncontextmenu = (e) => {
      e.preventDefault();
      this.beginRename(tower.def, displayName);
    };
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    nameEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      pressTimer = setTimeout(() => this.beginRename(tower.def, displayName), 500);
    });
    const clearPress = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };
    nameEl.addEventListener('pointerup', clearPress);
    nameEl.addEventListener('pointerleave', clearPress);
  }

  private beginRename(defId: string, currentName: string): void {
    if (this.renaming) return;
    this.renaming = true;
    const nameEl = this.root.querySelector('.inspect-name') as HTMLElement;
    if (!nameEl) return;
    const icon = TOWER_ICONS[defId] ?? '';
    nameEl.innerHTML = `${icon} <input class="rename-input" type="text" maxlength="18" value="${currentName.replace(/"/g, '&quot;')}" />`;
    const input = nameEl.querySelector('.rename-input') as HTMLInputElement;
    input.focus();
    input.select();
    const commit = () => {
      const v = input.value.trim();
      this.renaming = false;
      if (v && v !== this.content.towers[defId].name) this.cb.onRename(defId, v);
      else if (v === this.content.towers[defId].name) this.cb.onRename(defId, v); // explicit reset to default is fine too
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        this.renaming = false;
        input.value = currentName;
        input.blur();
      }
    });
    input.addEventListener('blur', commit, { once: true });
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }
}
