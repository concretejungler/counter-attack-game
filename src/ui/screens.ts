import type { ContentDB, LevelDef, RecapData, SimState, RoomTheme } from '../sim/types';
import type { SaveData } from '../meta/save';
import { LEVEL_ICONS, CRITTER_ICONS } from './icons';
import {
  ROOM_COLOR, ROOM_LABEL, worldsGrouped, isLevelUnlocked, isWorldUnlocked,
  starsFor, prerequisiteRoomLabel, furthestUnlockedLevel,
  critterdexOrder, isCritterSeen, killCount, jarCount, shinyCount, critterdexCompletionPct,
} from '../meta/progress';

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const TITLE_COLORS = ['#e8504f', '#3f5d7d', '#d8a020', '#3c8a5e', '#8a4a9c', '#d87f2e'];

export function buildTitle(
  save: SaveData,
  onPlay: () => void,
  onSettings: () => void,
  onJournal: () => void,
): HTMLElement {
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
  const journalPct = critterdexCompletionPct(save);
  const journal = el('button', 'fridge-note magnet-sticker', `📔 my journal!! <small>${journalPct}%</small>`);
  journal.style.setProperty('--pin', '#d8a020');
  journal.style.setProperty('--tilt', '1.4deg');
  journal.onclick = onJournal;
  const settings = el('button', 'fridge-note', '🌡️ Settings');
  settings.style.setProperty('--pin', '#3f5d7d');
  settings.style.setProperty('--tilt', '-1deg');
  settings.onclick = onSettings;
  menu.append(play, journal, infest, settings);

  fridge.append(
    title,
    el('div', 'subtitle', 'critters vs. housewares — a tower defense of household proportions'),
    menu,
    el('div', 'fridge-foot', 'the wish came true at 7:42pm. defend the birthday cake.'),
  );
  screen.append(fridge);
  return screen;
}

/** Fallback room icon when a level has no bespoke LEVEL_ICONS entry. */
const ROOM_ICON: Record<RoomTheme, string> = {
  kitchen: '🍰', living: '🛋️', bathroom: '🚿', bedroom: '🛏️', garage: '🚗',
  basement: '🕸️', attic: '📦', backyard: '🌳', sewer: '🚽', secret: '❓',
};

/** Cross-section grid position for each room, laid out like a kid's dollhouse
 *  drawing: attic on top, ground-floor rooms in a row, basement/sewer below,
 *  garage + backyard flanking the house like lean-tos. Grid is 4 cols, and rows
 *  are auto-sized (`grid-auto-flow: row` + `align-items: start`) so a room's
 *  height always matches how many sticky-note levels it holds — no fixed row
 *  tracks to overflow when a world's level count differs. */
const ROOM_LAYOUT: Record<RoomTheme, { col: string; row: string }> = {
  attic: { col: '2 / 4', row: '1' },
  bedroom: { col: '1 / 3', row: '2' },
  bathroom: { col: '3 / 4', row: '2' },
  garage: { col: '4 / 5', row: '2 / 4' },
  living: { col: '1 / 3', row: '3' },
  kitchen: { col: '3 / 4', row: '3' },
  basement: { col: '1 / 4', row: '4' },
  backyard: { col: '4 / 5', row: '4' },
  sewer: { col: '1 / 4', row: '5' },
  secret: { col: '4 / 5', row: '5' },
};

export function buildLevelSelect(
  save: SaveData,
  onPick: (id: string) => void,
  onBack: () => void,
  onJournal: () => void,
): HTMLElement {
  const screen = el('div', 'screen house-screen');
  const wrap = el('div', 'house-wrap');
  const titleRow = el('div', 'house-title-row');
  titleRow.append(el('div', 'house-title', '🏠 The Whole House'));
  const journalBtn = el('button', 'wood-btn small journal-btn', `📔 Journal <small>${critterdexCompletionPct(save)}%</small>`);
  journalBtn.onclick = onJournal;
  titleRow.append(journalBtn);
  wrap.append(titleRow);

  const scroller = el('div', 'house-scroller');
  const house = el('div', 'house-map');
  const worlds = worldsGrouped();
  const focusId = furthestUnlockedLevel(save).id;

  worlds.forEach((worldLevels, worldIdx) => {
    const theme = worldLevels[0].theme;
    const unlocked = isWorldUnlocked(save, worldLevels);
    const layout = ROOM_LAYOUT[theme] ?? { col: 'auto', row: 'auto' };
    const room = el('div', `room${unlocked ? '' : ' locked'}`);
    room.style.gridColumn = layout.col;
    room.style.gridRow = layout.row;
    room.style.setProperty('--room-color', ROOM_COLOR[theme]);

    const label = el('div', 'room-label', `<span class="room-num">${worldLevels[0].world}</span>${ROOM_ICON[theme]} ${ROOM_LABEL[theme]}`);
    room.append(label);

    if (!unlocked) {
      const prereq = prerequisiteRoomLabel(worldIdx);
      room.append(el('div', 'room-padlock', '🔒'));
      room.append(el('div', 'room-scribble', `beat ${prereq ?? 'the last room'} first!!`));
    } else {
      const notes = el('div', 'room-notes');
      worldLevels.slice().sort((a, b) => a.index - b.index).forEach((lvl: LevelDef, i: number) => {
        const stars = starsFor(save, lvl.id);
        const levelUnlocked = isLevelUnlocked(save, lvl);
        const isBoss = i === worldLevels.length - 1 && worldLevels.length > 1;
        const note = el(
          'div',
          `sticky-lvl${levelUnlocked ? '' : ' locked'}${isBoss ? ' boss' : ''}${lvl.id === focusId ? ' focus' : ''}`,
          `
          <div class="sticky-ico">${levelUnlocked ? (LEVEL_ICONS[lvl.id] ?? ROOM_ICON[theme]) : '🔒'}</div>
          <div class="sticky-num">${lvl.index}${isBoss ? ' 👑' : ''}</div>
          <div class="sticky-name">${lvl.name}</div>
          <div class="sticky-stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(Math.max(0, 3 - stars))}</span></div>
        `,
        );
        note.style.setProperty('--tilt', `${((i * 23 + worldIdx * 11) % 7) - 3}deg`);
        note.title = levelUnlocked
          ? `${lvl.blurb}\n⭐ Beat it  ⭐ ≤2 bites  ⭐ ${lvl.challenge?.text ?? ''}`
          : 'Win the previous level first!';
        if (levelUnlocked) note.onclick = () => onPick(lvl.id);
        notes.append(note);
      });
      room.append(notes);
    }

    house.append(room);
  });

  scroller.append(house);
  wrap.append(scroller);

  const back = el('button', 'wood-btn small', '← Fridge');
  back.style.marginTop = '14px';
  back.onclick = onBack;
  wrap.append(back);
  screen.append(wrap);

  // default focus/scroll to the furthest-unlocked level
  requestAnimationFrame(() => {
    const focusEl = house.querySelector('.sticky-lvl.focus');
    focusEl?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
  });

  return screen;
}

/** The Critterdex — "a kid's field journal" (GAME-PROMPT §18/§2.5). Lined notebook paper,
 *  one index card per species (crayon-portrait emoji, kid-voice desc, kill/jar tallies),
 *  silhouette "???" cards for anything never yet seen. Bosses get a wide full-spread card. */
export function buildJournal(save: SaveData, content: ContentDB, onBack: () => void): HTMLElement {
  const screen = el('div', 'screen journal-screen');
  const book = el('div', 'journal-book');

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
