import type { ContentDB, LevelDef, PendingChoice, SimState, Tower } from '../sim/types';
import type { SaveData } from '../meta/save';
import { Hud, InspectPanel, type HudCallbacks, type InspectCallbacks } from './hud';
import { buildJournal, buildLevelSelect, buildRecap, buildSettings, buildTitle, type RecapInfo } from './screens';
import { MUTATION_ICONS } from './icons';
import { isMobileViewport, isPortrait } from '../core/device';
import { ChoicePanel, type ChoicePanelCallbacks } from './choicePanel';
import { Fly } from './fly';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export interface UICallbacks extends HudCallbacks, InspectCallbacks {
  onStartLevel(id: string): void;
  onBackToTitle(): void;
  onToLevels(): void;
  onPickMutation(id: string): void;
  onSettingsChanged(s: SaveData['settings']): void;
  onResume(): void;
  onChoose(option: 0 | 1): void;
  onChoiceTick(): void;
  onFlyShooed(): void;
}

export type JournalReturnTo = 'title' | 'levels';

/** Screen router + HUD lifecycle + modals/toasts/banners. */
export class UI {
  private root: HTMLElement;
  hud: Hud | null = null;
  inspect: InspectPanel | null = null;
  choicePanel: ChoicePanel;
  fly: Fly;
  private screenEl: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;
  private stickyEl: HTMLElement | null = null;
  private swarmAlarmEl: HTMLElement | null = null;
  private eventBannerEl: HTMLElement | null = null;
  private eventBannerTimer: ReturnType<typeof setTimeout> | null = null;
  private eventBannerId: string | null = null;
  private rotateEl: HTMLElement;
  private inGameplay = false;

  constructor(
    private content: ContentDB,
    private save: SaveData,
    private cb: UICallbacks,
  ) {
    this.root = document.getElementById('ui')!;
    this.rotateEl = el('div', 'rotate-overlay', `
      <div class="sticky-note">
        <span class="rotate-ico">📱</span>
        <b>turn me sideways!!</b><br>
        the cake needs the whole counter to defend it — rotate your phone to landscape.
      </div>
    `);
    document.body.append(this.rotateEl);
    addEventListener('resize', () => this.refreshRotateOverlay());
    addEventListener('orientationchange', () => this.refreshRotateOverlay());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.refreshRotateOverlay());
    this.refreshRotateOverlay();

    const choiceCb: ChoicePanelCallbacks = {
      onChoose: (option) => this.cb.onChoose(option),
      onTick: () => this.cb.onChoiceTick(),
    };
    this.choicePanel = new ChoicePanel(choiceCb);
    this.root.append(this.choicePanel.root);

    this.fly = new Fly(document.body, { onShooed: () => this.cb.onFlyShooed() });
    if (this.save.flyShooed) this.fly.markShooed();
  }

  private refreshRotateOverlay(): void {
    const show = this.inGameplay && isMobileViewport() && isPortrait();
    this.rotateEl.classList.toggle('show', show);
  }

  private clearScreen(): void {
    this.screenEl?.remove();
    this.screenEl = null;
    this.hud?.root.remove();
    this.hud = null;
    this.inspect?.root.remove();
    this.inspect = null;
    this.closeModal();
    this.dismissSticky();
    this.hideChoice();
    this.dismissEventBanner();
    this.inGameplay = false;
    this.refreshRotateOverlay();
  }

  showTitle(): void {
    this.clearScreen();
    this.screenEl = buildTitle(
      this.save,
      () => this.cb.onToLevels(),
      () => this.showSettings(),
      () => this.showJournal('title'),
    );
    this.root.append(this.screenEl);
  }

  showLevelSelect(): void {
    this.clearScreen();
    this.screenEl = buildLevelSelect(
      this.save,
      (id) => this.cb.onStartLevel(id),
      () => this.cb.onBackToTitle(),
      () => this.showJournal('levels'),
    );
    this.root.append(this.screenEl);
  }

  /** The Critterdex. Reachable from the title fridge and from level select; remembers
   *  which screen to pop back to. */
  showJournal(returnTo: JournalReturnTo): void {
    this.clearScreen();
    this.screenEl = buildJournal(this.save, this.content, () => {
      if (returnTo === 'title') this.showTitle();
      else this.showLevelSelect();
    });
    this.root.append(this.screenEl);
  }

  showHud(level: LevelDef): void {
    this.clearScreen();
    this.hud = new Hud(this.content, level, this.cb);
    this.inspect = new InspectPanel(this.content, this.cb, this.save.towerNames);
    this.root.append(this.hud.root, this.inspect.root);
    this.inGameplay = true;
    this.refreshRotateOverlay();
    // The Fly (§20.14): rare per-level-start roll, no-op forever once shooed.
    this.fly.maybeSpawn();
  }

  updateHud(state: SimState, speedMult: number): void {
    this.hud?.update(state, speedMult);
  }

  showInspect(tower: Tower, state: SimState, x: number, y: number): void {
    this.inspect?.show(tower, state, x, y);
  }

  hideInspect(): void {
    this.inspect?.hide();
  }

  showMutationDraft(options: string[]): void {
    this.closeModal();
    const wrap = el('div', 'modal-wrap');
    const modal = el('div', 'paper-modal');
    modal.innerHTML = `<h2>🧬 The Swarm Evolves...</h2>
      <div class="sub">...and YOU pick how. Choose the least of three evils:</div>`;
    const row = el('div', 'mutation-row');
    for (const id of options) {
      const def = this.content.mutations[id];
      if (!def) continue;
      const card = el('div', 'mutation-card', `
        <div class="mut-ico">${MUTATION_ICONS[id] ?? '🧬'}</div>
        <b>${def.name}</b>
        <p>${def.desc}</p>
      `);
      card.onclick = () => {
        this.cb.onPickMutation(id);
        this.closeModal();
      };
      row.append(card);
    }
    modal.append(row);
    wrap.append(modal);
    this.modalEl = wrap;
    this.root.append(wrap);
  }

  showRecap(info: RecapInfo, onRetry: () => void, onLevels: () => void, onNext: (() => void) | null): void {
    this.closeModal();
    this.modalEl = buildRecap(info, onRetry, onLevels, onNext);
    this.root.append(this.modalEl);
  }

  showSettings(): void {
    this.closeModal();
    this.modalEl = buildSettings(this.save, this.cb.onSettingsChanged, () => this.closeModal());
    this.root.append(this.modalEl);
  }

  showPause(): void {
    this.closeModal();
    const veil = el('div', 'pause-veil');
    veil.innerHTML = '<h1>⏸ Paused</h1>';
    const resume = el('button', 'wood-btn', '▶ Resume');
    resume.onclick = () => {
      this.closeModal();
      this.cb.onResume();
    };
    const quit = el('button', 'wood-btn small', 'Abandon level');
    quit.onclick = () => {
      this.closeModal();
      this.cb.onToLevels();
    };
    veil.append(resume, quit);
    this.modalEl = veil;
    this.root.append(veil);
  }

  closeModal(): void {
    this.modalEl?.remove();
    this.modalEl = null;
  }

  get modalOpen(): boolean {
    return this.modalEl !== null;
  }

  /** True while the "turn me sideways" portrait overlay is covering the game. */
  get rotateBlocking(): boolean {
    return this.rotateEl.classList.contains('show');
  }

  banner(text: string, boss = false): void {
    const b = el('div', `wave-banner${boss ? ' boss' : ''}`, text);
    this.root.append(b);
    setTimeout(() => b.remove(), boss ? 3300 : 2500);
  }

  // ---------- Oh-Crap choice panel (§12) ----------
  showChoice(pc: PendingChoice): void {
    this.choicePanel.show(pc);
  }

  updateChoice(simTime: number): void {
    this.choicePanel.update(simTime);
  }

  hideChoice(): void {
    this.choicePanel.hide();
  }

  get choiceOpen(): boolean {
    return this.choicePanel.visible;
  }

  /** Keyboard 1/2 while a choice is pending; returns true if it consumed the key. */
  handleChoiceKey(key: string): boolean {
    return this.choicePanel.handleKey(key);
  }

  // ---------- distinct random-event banner (§11) — a TV-static "breaking news" fridge note,
  // separate from the generic wave banner so it doesn't compete with the choice panel and can
  // be explicitly dismissed on eventEnd for timed events instead of just timing out. ----------
  eventBanner(id: string, name: string, text: string, timed: boolean): void {
    this.eventBannerEl?.remove();
    if (this.eventBannerTimer !== null) {
      clearTimeout(this.eventBannerTimer);
      this.eventBannerTimer = null;
    }
    this.eventBannerId = id;
    const b = el('div', 'event-banner', `
      <div class="event-banner-static"></div>
      <div class="event-banner-body">
        <div class="event-banner-name">📺 ${name}</div>
        <div class="event-banner-text">${text}</div>
      </div>
    `);
    this.eventBannerEl = b;
    this.root.append(b);
    // instant events (and a safety net for timed ones, in case eventEnd never arrives) still
    // self-clear after a while so the banner never gets stuck on screen.
    this.eventBannerTimer = setTimeout(() => this.dismissEventBanner(id), timed ? 12000 : 3600);
  }

  dismissEventBanner(id?: string): void {
    if (id !== undefined && this.eventBannerId !== id) return;
    this.eventBannerEl?.remove();
    this.eventBannerEl = null;
    this.eventBannerId = null;
    if (this.eventBannerTimer !== null) {
      clearTimeout(this.eventBannerTimer);
      this.eventBannerTimer = null;
    }
  }

  toast(text: string): void {
    const t = el('div', 'toast-msg', text);
    this.root.append(t);
    setTimeout(() => t.remove(), 2300);
  }

  stickyNote(text: string, key: string): void {
    if (this.save.seenNotes.includes(key)) return;
    this.dismissSticky();
    const note = el('div', 'sticky-note', `${text}<span class="dismiss">[ got it!! ]</span>`);
    note.onclick = () => {
      if (!this.save.seenNotes.includes(key)) this.save.seenNotes.push(key);
      this.dismissSticky();
    };
    this.stickyEl = note;
    this.root.append(note);
  }

  dismissSticky(): void {
    this.stickyEl?.remove();
    this.stickyEl = null;
  }

  setSwarmAlarm(on: boolean): void {
    if (on && !this.swarmAlarmEl) {
      this.swarmAlarmEl = el('div', 'swarm-alarm');
      this.root.append(this.swarmAlarmEl);
    } else if (!on && this.swarmAlarmEl) {
      this.swarmAlarmEl.remove();
      this.swarmAlarmEl = null;
    }
  }
}
