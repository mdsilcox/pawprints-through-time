import { app } from '../app';
import { audio } from '../audio/audio';
import { getMap, type MapDef, regionOfMap } from '../world/mapdef';
import { TILE } from '../world/collision';
import { currentObjective } from '../story/quests';
import { makeCanvas } from '../art/draw';
import { formatTime, timeIcon } from '../world/clock';
import { h } from './dom';
import { button, closeOnBackdrop, ui } from './ui';
import { registerPauseEntry } from './pause';
import type { WorldScene } from '../scenes/WorldScene';

const TERRAIN_COLORS: Record<string, string> = {
  water: '#8fd3e6',
  sand: '#f3dca2',
  grass: '#9fd67f',
  road: '#8a8793',
  path: '#e9c89a',
  plaza: '#e8dcc6',
  dock: '#c99a62',
  deck: '#c99a62',
  floor: '#e0b58a',
  rug: '#e0b58a',
  stone: '#e3d3b0',
  dune: '#efcf8f',
  tile: '#f0e6d8',
  wall: '#8a7666',
  void: '#5b4a42',
  dark: '#3d3550',
};

/** Terrain and buildings only — labels and markers are HTML on top, so they stay readable on a phone. */
function renderTerrain(def: MapDef): { canvas: HTMLCanvasElement; w: number; h: number } {
  const built = def.build();
  const g = built.grid;
  const cell = 12;
  const { c, ctx } = makeCanvas(g.width * cell, g.height * cell);
  for (let y = 0; y < g.height; y++)
    for (let x = 0; x < g.width; x++) {
      ctx.fillStyle = TERRAIN_COLORS[g.get(x, y)] ?? '#9fd67f';
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }
  for (const o of built.objects) {
    if (!o.foot) continue;
    const c0 = Math.floor(o.x) + o.foot.dx;
    const r0 = Math.ceil(o.y) + o.foot.dy;
    ctx.fillStyle = o.kind === 'building' ? 'rgba(181,122,78,0.85)' : o.kind === 'tree' || o.kind === 'palm' ? 'rgba(74,143,74,0.55)' : 'rgba(138,118,102,0.55)';
    ctx.beginPath();
    ctx.roundRect(c0 * cell, r0 * cell, o.foot.w * cell, o.foot.h * cell, cell * 0.4);
    ctx.fill();
  }
  return { canvas: c, w: g.width, h: g.height };
}

function mark(cls: string, x: number, y: number, w: number, hgt: number, ...children: (Node | string)[]): HTMLElement {
  return h('div', { class: `map-mark ${cls}`, style: { left: `${(x / w) * 100}%`, top: `${(y / hgt) * 100}%` } }, ...children);
}

export function openMap(): void {
  if (ui.has('map')) return;
  const world = app.phaser.scene.getScene('world') as WorldScene | null;
  const active = world && world.scene.isActive() ? world : null;
  let def: MapDef = active?.def ?? getMap(app.data?.location.map ?? 'tockwood');
  let here: { x: number; y: number } | undefined;
  let note = '';
  if (def.indoor && def.exits?.length) {
    // show the island, with a star on the building you're inside
    const ex = def.exits[0];
    const outside = getMap(ex.to);
    const sp = outside.spawns[ex.spawn];
    here = sp ? { x: sp.x, y: sp.y - 0.6 } : undefined;
    note = `You are inside: ${def.name}`;
    def = outside;
  }
  const { canvas, w, h: hgt } = renderTerrain(def);
  canvas.classList.add('map-canvas');
  const marks: HTMLElement[] = [];
  for (const p of def.pois ?? []) marks.push(mark('poi', p.x, p.y, w, hgt, h('span', { class: 'poi-icon' }, p.icon), h('span', { class: 'poi-label' }, p.label)));
  const sameMap = active && active.def.id === def.id;
  if (sameMap) {
    for (const s of active.digSpots()) if (s.revealed) marks.push(s.x ? mark('dig xmark', s.cx + 0.5, s.cy + 0.5, w, hgt, '✖') : mark('dig', s.cx + 0.5, s.cy + 0.5, w, hgt, '✦'));
  }
  const d = app.data;
  const obj = d ? currentObjective(d, regionOfMap(d.location.map)) : null;
  const where = obj?.step.where?.(d!);
  if (where && where.map === def.id) marks.push(mark('goal', where.x + 1.3, where.y - 0.9, w, hgt, '★'));
  if (sameMap) {
    if (active.biscuit) marks.push(mark('who biscuit', active.biscuit.x / TILE, active.biscuit.y / TILE, w, hgt));
    const ps = active.players.map((p) => ({ x: p.x / TILE, y: p.y / TILE }));
    // two players standing together: nudge the markers apart so both show
    if (ps.length === 2 && Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) < 1.4) {
      const mid = (ps[0].x + ps[1].x) / 2;
      ps[0].x = mid - 0.75;
      ps[1].x = mid + 0.75;
    }
    ps.forEach((p, i) => marks.push(mark(`who p${i + 1}`, p.x, p.y, w, hgt, String(i + 1))));
  } else if (here) marks.push(mark('who here', here.x, here.y, w, hgt, '★'));

  const close = () => {
    audio.sfx('close');
    ui.pop('map');
  };
  const panel = h(
    'div',
    { class: 'panel map-panel' },
    h('div', { class: 'map-head' }, h('h2', null, `🗺️ ${def.name}`), d && def.region === 'tockwood' ? h('div', { class: 'small' }, `${timeIcon(d.minutes)} ${formatTime(d.minutes)} · Day ${d.day}`) : null),
    h(
      'div',
      { class: 'map-main' },
      h('div', { class: 'map-wrap', style: `--ratio: ${(w / hgt).toFixed(4)}`, attrs: { 'data-testid': 'map-view' } }, canvas, h('div', { class: 'map-marks' }, marks)),
      h(
        'div',
        { class: 'map-side' },
        note ? h('div', { class: 'map-note' }, note) : null,
        obj ? h('div', { class: 'map-goal' }, `${obj.quest.icon} ${obj.step.text}`) : null,
        h(
          'div',
          { class: 'map-legend' },
          h('span', null, h('b', { class: 'dot p1' }), ' Player 1'),
          h('span', null, h('b', { class: 'dot p2' }), ' Player 2'),
          h('span', null, h('b', { class: 'dot biscuit' }), ' Biscuit'),
          h('span', null, h('b', { class: 'legend-star' }, '★'), ' Goal'),
          h('span', null, h('b', { class: 'legend-dig' }, '✦'), ' Dig spot'),
          marks.some((m) => m.classList.contains('xmark')) ? h('span', null, h('b', { class: 'legend-x' }, '✖'), ' Treasure X') : null,
        ),
        h('div', { class: 'row end map-foot' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'map-close' })),
      ),
    ),
  );
  ui.push({ id: 'map', el: closeOnBackdrop(h('div', { class: 'center-wrap backdrop' }, panel), close), onBack: close });
  audio.sfx('page');
}

registerPauseEntry({ id: 'map', icon: '🗺️', label: 'Map', order: 10, open: openMap });
