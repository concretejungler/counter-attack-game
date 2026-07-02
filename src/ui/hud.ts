import type { LevelDef, SimState, Tower } from '../sim/types';
import type { ContentDB } from '../sim/types';
import { SHAPE_ICONS, SPELL_ICONS, TOWER_ICONS } from './icons';

export interface HudCallbacks {
  onSelectTower(def: string): void;
  onSelectClutter(shape: string): void;
  onSelectSpell(id: string): void;
  onCallWave(): void;
  onSpeed(mult: 1 | 2 | 3): void;
  onPause(): void;
  /** PHOTO MODE (§18): the small camera button in the HUD corner. */
  onPhotoMode(): void;
}

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

/** The in-level HUD: chips, nose meter, corkboard build bar, egg timer, speed cluster. */
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
  private speedBtns: HTMLButtonElement[] = [];
  selectedCard: { kind: 'tower' | 'clutter' | 'spell'; id: string } | null = null;

  constructor(
    private content: ContentDB,
    private level: LevelDef,
    private cb: HudCallbacks,
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
    const bar = el('div', 'build-bar');
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
      card.onclick = () => this.cb.onSelectTower(def);
      this.towerCards.set(def, card);
      towerSec.append(card);
    }

    this.clutterRow = el('div', 'bar-section');

    const spellSec = el('div', 'bar-section');
    for (const id of Object.keys(this.content.spells).filter((s) => !s.startsWith('test-'))) {
      const sp = this.content.spells[id];
      const btn = el('button', 'spell-btn', `${SPELL_ICONS[id] ?? '✨'}<div class="cd"></div><span class="cost-tag">${sp.cost}</span>`);
      btn.title = `${sp.name} (${sp.cost} charge)\n${sp.desc}`;
      btn.onclick = () => this.cb.onSelectSpell(id);
      this.spellBtns.set(id, btn);
      spellSec.append(btn);
    }

    scroll.append(towerSec, el('div', 'bar-divider'), this.clutterRow, el('div', 'bar-divider'), spellSec);

    // speed cluster
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
    const photoB = el('button', 'speed-btn photo-btn', '📸') as HTMLButtonElement;
    photoB.title = 'Photo Mode (P)';
    photoB.onclick = () => this.cb.onPhotoMode();
    speed.append(photoB);

    bar.append(scroll);

    this.root.append(top, this.callCluster, bar, speed);
  }

  setSelected(sel: { kind: 'tower' | 'clutter' | 'spell'; id: string } | null): void {
    this.selectedCard = sel;
    for (const [def, card] of this.towerCards) {
      card.classList.toggle('selected', sel?.kind === 'tower' && sel.id === def);
    }
    for (const [id, btn] of this.spellBtns) {
      btn.classList.toggle('selected', sel?.kind === 'spell' && sel.id === id);
    }
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
      card.onclick = () => this.cb.onSelectClutter(shape);
      this.clutterRow.append(card);
    }
    if (counts.size === 0) {
      this.clutterRow.append(el('div', 'card disabled', '<div class="face">🕳️</div><div class="nm">Out of clutter</div>'));
    }
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

    this.speedBtns.forEach((b, i) => b.classList.toggle('active', speedMult === i + 1));
  }

  showForecast(text: string): void {
    this.forecast.innerHTML = text;
    this.forecast.classList.remove('hidden');
  }

  hideForecast(): void {
    this.forecast.classList.add('hidden');
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
