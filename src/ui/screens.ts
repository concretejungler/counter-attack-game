import { ALL_LEVELS } from '../content';
import type { LevelDef, RecapData, SimState } from '../sim/types';
import type { SaveData } from '../meta/save';
import { LEVEL_ICONS } from './icons';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const TITLE_COLORS = ['#e8504f', '#3f5d7d', '#d8a020', '#3c8a5e', '#8a4a9c', '#d87f2e'];

export function buildTitle(onPlay: () => void, onSettings: () => void): HTMLElement {
  const screen = el('div', 'screen');
  const fridge = el('div', 'fridge');

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

  const menu = el('div', 'fridge-menu');
  const play = el('button', 'fridge-note', '🎂 Defend the Cake');
  play.style.setProperty('--pin', '#e8504f');
  play.onclick = onPlay;
  const infest = el('button', 'fridge-note locked', '🌀 Infestation Mode <small>(soon)</small>');
  infest.style.setProperty('--pin', '#3c8a5e');
  infest.style.setProperty('--tilt', '0.8deg');
  const settings = el('button', 'fridge-note', '🌡️ Settings');
  settings.style.setProperty('--pin', '#3f5d7d');
  settings.style.setProperty('--tilt', '-1deg');
  settings.onclick = onSettings;
  menu.append(play, infest, settings);

  fridge.append(
    title,
    el('div', 'subtitle', 'critters vs. housewares — a tower defense of household proportions'),
    menu,
    el('div', 'fridge-foot', 'the wish came true at 7:42pm. defend the birthday cake.'),
  );
  screen.append(fridge);
  return screen;
}

export function buildLevelSelect(save: SaveData, onPick: (id: string) => void, onBack: () => void): HTMLElement {
  const screen = el('div', 'screen corkboard-screen');
  const board = el('div', 'corkboard');
  board.append(el('div', 'cork-title', '🏠 World 1 — The Kitchen'));
  const row = el('div', 'level-row');

  const PHOTOS = ['#ffe8c0', '#cfe3ee', '#f8d0c0', '#e0d8f0', '#f0e0a0'];
  ALL_LEVELS.forEach((lvl: LevelDef, i: number) => {
    const stars = save.stars[lvl.id] ?? 0;
    const prevStars = i === 0 ? 1 : (save.stars[ALL_LEVELS[i - 1].id] ?? 0);
    const locked = prevStars < 1;
    const card = el('div', `polaroid${locked ? ' locked' : ''}`, `
      <div class="photo" style="background:${PHOTOS[i % PHOTOS.length]}">${locked ? '🔒' : LEVEL_ICONS[lvl.id] ?? '🏠'}</div>
      <div class="label">${lvl.index}. ${lvl.name}</div>
      <div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(Math.max(0, 3 - stars))}</span></div>
    `);
    card.style.setProperty('--tilt', `${((i * 31) % 7) - 3}deg`);
    card.style.setProperty('--pin', TITLE_COLORS[i % TITLE_COLORS.length]);
    card.title = locked ? 'Win the previous level first!' : `${lvl.blurb}\n⭐ Beat it  ⭐ ≤2 bites  ⭐ ${lvl.challenge?.text ?? ''}`;
    if (!locked) card.onclick = () => onPick(lvl.id);
    row.append(card);
  });
  board.append(row);

  const back = el('button', 'wood-btn small', '← Fridge');
  back.style.marginTop = '18px';
  back.onclick = onBack;
  screen.append(board, back);
  return screen;
}

export interface RecapInfo {
  won: boolean;
  lossReason?: string;
  level: LevelDef;
  state: SimState;
  recap: RecapData;
  stars: number;
  starDetail: [boolean, boolean, boolean];
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

  const headline = info.won
    ? `🎉 The Cake Survives!`
    : info.lossReason === 'theSwarm'
      ? `🐜🐜🐜 THE SWARM CAME`
      : `😭 The Cake... is Gone`;
  const sub = info.won
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

  html += `<div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
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

export function buildSettings(
  save: SaveData,
  onChange: (s: SaveData['settings']) => void,
  onClose: () => void,
): HTMLElement {
  const wrap = el('div', 'modal-wrap');
  const modal = el('div', 'paper-modal');
  modal.innerHTML = `
    <h2>🌡️ The Thermostat</h2>
    <div class="sub">house settings — adjust to taste</div>
    <div class="thermo-row"><label>🎵 Music</label><input type="range" min="0" max="1" step="0.05" data-k="musicVol" value="${save.settings.musicVol}"></div>
    <div class="thermo-row"><label>🔊 Sounds</label><input type="range" min="0" max="1" step="0.05" data-k="sfxVol" value="${save.settings.sfxVol}"></div>
    <div class="thermo-row"><label>📳 Screen shake</label><button class="toggle ${save.settings.shake ? 'on' : ''}" data-k="shake"></button></div>
    <div class="thermo-row"><label>💀 Difficulty</label>
      <select data-k="difficulty" style="font-family:inherit;font-size:16px;padding:4px 8px">
        ${(['houseguest', 'homeowner', 'landlord', 'condemned'] as const)
          .map((d) => `<option value="${d}" ${save.settings.difficulty === d ? 'selected' : ''}>${d}</option>`)
          .join('')}
      </select>
    </div>
    <div style="text-align:center;margin-top:16px"><button class="wood-btn" data-act="close">Done</button></div>
  `;
  wrap.append(modal);

  modal.querySelectorAll('input[type=range]').forEach((input) => {
    (input as HTMLInputElement).oninput = () => {
      const k = (input as HTMLElement).dataset.k as 'musicVol' | 'sfxVol';
      save.settings[k] = parseFloat((input as HTMLInputElement).value);
      onChange(save.settings);
    };
  });
  const shakeToggle = modal.querySelector('[data-k=shake]') as HTMLElement;
  shakeToggle.onclick = () => {
    save.settings.shake = !save.settings.shake;
    shakeToggle.classList.toggle('on', save.settings.shake);
    onChange(save.settings);
  };
  (modal.querySelector('[data-k=difficulty]') as HTMLSelectElement).onchange = (e) => {
    save.settings.difficulty = (e.target as HTMLSelectElement).value as SaveData['settings']['difficulty'];
    onChange(save.settings);
  };
  (modal.querySelector('[data-act=close]') as HTMLElement).onclick = onClose;
  return wrap;
}
