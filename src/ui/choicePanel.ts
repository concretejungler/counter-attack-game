import type { PendingChoice } from '../sim/types';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export interface ChoicePanelCallbacks {
  onChoose(option: 0 | 1): void;
  /** fired once per whole second remaining, for the 'choice-tick' sfx */
  onTick(): void;
}

/**
 * The Oh-Crap forced-decision panel (GAME-PROMPT §12). Diegetic torn-notebook "EMERGENCY!!"
 * note with two big buttons and a drain-bar countdown. The sim does NOT pause while this is
 * open — that's the point (5 seconds of real panic against a still-running assault).
 */
export class ChoicePanel {
  root = el('div', 'choice-panel hidden');
  private promptEl!: HTMLElement;
  private drainEl!: HTMLElement;
  private optBtns: HTMLButtonElement[] = [];
  private active: PendingChoice | null = null;
  private lastWholeSecond = -1;

  constructor(private cb: ChoicePanelCallbacks) {
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="choice-note">
        <div class="choice-header">🚨 EMERGENCY!! 🚨</div>
        <div class="choice-prompt"></div>
        <div class="choice-drain"><div class="choice-drain-fill"></div></div>
        <div class="choice-btns"></div>
      </div>
    `;
    this.promptEl = this.root.querySelector('.choice-prompt') as HTMLElement;
    this.drainEl = this.root.querySelector('.choice-drain-fill') as HTMLElement;
    const btnRow = this.root.querySelector('.choice-btns') as HTMLElement;
    for (let i = 0; i < 2; i++) {
      const idx = i as 0 | 1;
      const b = el('button', 'choice-btn', '') as HTMLButtonElement;
      b.onclick = () => this.choose(idx);
      this.optBtns.push(b);
      btnRow.append(b);
    }
  }

  private choose(option: 0 | 1): void {
    if (!this.active) return;
    this.active = null;
    this.hide();
    this.cb.onChoose(option);
  }

  show(pc: PendingChoice): void {
    this.active = pc;
    this.lastWholeSecond = -1;
    this.promptEl.textContent = pc.prompt;
    this.optBtns[0].textContent = pc.options[0];
    this.optBtns[1].textContent = pc.options[1];
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.active = null;
    this.root.classList.add('hidden');
  }

  get visible(): boolean {
    return this.active !== null;
  }

  get currentId(): string | null {
    return this.active?.id ?? null;
  }

  /** Call every frame with the current sim time; drives the drain-bar + per-second tick sfx. */
  update(simTime: number): void {
    if (!this.active) return;
    const remaining = Math.max(0, this.active.deadline - simTime);
    const total = Math.max(0.001, this.active.deadline - (this.active.deadline - 5));
    this.drainEl.style.width = `${Math.max(0, Math.min(100, (remaining / total) * 100))}%`;
    const whole = Math.ceil(remaining);
    if (whole !== this.lastWholeSecond && remaining > 0) {
      this.lastWholeSecond = whole;
      this.cb.onTick();
    }
  }

  /** Keyboard shortcut hook: '1'/'2' keys pick option 0/1 while a choice is active. */
  handleKey(key: string): boolean {
    if (!this.active) return false;
    if (key === '1') {
      this.choose(0);
      return true;
    }
    if (key === '2') {
      this.choose(1);
      return true;
    }
    return false;
  }
}
