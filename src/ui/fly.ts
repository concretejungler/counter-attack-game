/**
 * The Fly (GAME-PROMPT §11/§20.14): a pure UI gag. An immortal fly lands on a random HUD
 * button; hovering/tapping near it makes it dart to another button (the button it's sitting
 * on "dodges" — nudges 6px). Click it 3 times total and it's shooed for good (achievement
 * toast). Session-only unless save.ts exposes a trivial persistence slot (see save.flySeen).
 */
const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export interface FlyCallbacks {
  /** called once the fly has been clicked 3 times and is shooed for good */
  onShooed(): void;
}

const ROAM_TARGETS_SELECTOR = '.hud-top .chip, .call-cluster .wood-btn, .card, .spell-btn, .speed-btn, .egg-timer';

export class Fly {
  private el = el('div', 'ui-fly hidden', '🪰');
  private clicks = 0;
  private shooed = false;
  private active = false;
  private currentTarget: HTMLElement | null = null;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, private cb: FlyCallbacks) {
    container.append(this.el);
    this.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.onTap();
    });
    this.el.addEventListener('pointerenter', () => this.dodge());
  }

  /** Roll the ~1/8 per-level-start chance and spawn if it hits (no-op if already shooed). */
  maybeSpawn(): void {
    if (this.shooed || this.active) return;
    if (Math.random() < 1 / 8) this.spawn();
  }

  private spawn(): void {
    this.active = true;
    this.clicks = 0;
    this.el.classList.remove('hidden');
    this.landOnRandomTarget();
    this.scheduleWander();
  }

  private scheduleWander(): void {
    this.clearWander();
    this.moveTimer = setTimeout(() => {
      if (!this.active) return;
      this.landOnRandomTarget();
      this.scheduleWander();
    }, 3500 + Math.random() * 4000);
  }

  private clearWander(): void {
    if (this.moveTimer !== null) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
  }

  private landOnRandomTarget(): void {
    const targets = [...document.querySelectorAll<HTMLElement>(ROAM_TARGETS_SELECTOR)].filter(
      (t) => t.offsetParent !== null,
    );
    if (targets.length === 0) {
      // nowhere to land right now — just park at a fixed spot and retry on next wander tick
      this.el.style.left = '50%';
      this.el.style.top = '50%';
      return;
    }
    const target = targets[Math.floor(Math.random() * targets.length)];
    this.currentTarget = target;
    const r = target.getBoundingClientRect();
    this.el.style.left = `${r.left + r.width * (0.3 + Math.random() * 0.4)}px`;
    this.el.style.top = `${r.top + r.height * (0.2 + Math.random() * 0.3)}px`;
  }

  /** Called on pointer proximity: the button it sits on visually dodges, and the fly darts off. */
  dodge(): void {
    if (!this.active) return;
    if (this.currentTarget) {
      const t = this.currentTarget;
      const dx = (Math.random() < 0.5 ? -1 : 1) * 6;
      t.style.transform = `translateX(${dx}px)`;
      setTimeout(() => {
        t.style.transform = '';
      }, 220);
    }
    this.landOnRandomTarget();
    this.scheduleWander();
  }

  private onTap(): void {
    if (!this.active) return;
    this.clicks++;
    if (this.clicks >= 3) {
      this.shoo();
    } else {
      this.dodge();
    }
  }

  private shoo(): void {
    this.active = false;
    this.shooed = true;
    this.clearWander();
    this.el.classList.add('hidden');
    this.cb.onShooed();
  }

  get isShooed(): boolean {
    return this.shooed;
  }

  /** Restore persisted "already shooed" state (e.g. from save data) without re-rolling. */
  markShooed(): void {
    this.shooed = true;
  }

  destroy(): void {
    this.clearWander();
    this.el.remove();
  }
}
