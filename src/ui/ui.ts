import type { ContentDB, LevelDef, SimState, Tower } from '../sim/types';
import type { SaveData } from '../meta/save';
import { Hud, InspectPanel, type HudCallbacks, type InspectCallbacks } from './hud';
import { buildLevelSelect, buildRecap, buildSettings, buildTitle, type RecapInfo } from './screens';
import { MUTATION_ICONS } from './icons';
import { isMobileViewport, isPortrait } from '../core/device';

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
}

/** Screen router + HUD lifecycle + modals/toasts/banners. */
export class UI {
  private root: HTMLElement;
  hud: Hud | null = null;
  inspect: InspectPanel | null = null;
  private screenEl: HTMLElement | null = null;
  private modalEl: HTMLElement | null = null;
  private stickyEl: HTMLElement | null = null;
  private swarmAlarmEl: HTMLElement | null = null;
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
    this.inGameplay = false;
    this.refreshRotateOverlay();
  }

  showTitle(): void {
    this.clearScreen();
    this.screenEl = buildTitle(
      () => this.cb.onToLevels(),
      () => this.showSettings(),
    );
    this.root.append(this.screenEl);
  }

  showLevelSelect(): void {
    this.clearScreen();
    this.screenEl = buildLevelSelect(
      this.save,
      (id) => this.cb.onStartLevel(id),
      () => this.cb.onBackToTitle(),
    );
    this.root.append(this.screenEl);
  }

  showHud(level: LevelDef): void {
    this.clearScreen();
    this.hud = new Hud(this.content, level, this.cb);
    this.inspect = new InspectPanel(this.content, this.cb);
    this.root.append(this.hud.root, this.inspect.root);
    this.inGameplay = true;
    this.refreshRotateOverlay();
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
