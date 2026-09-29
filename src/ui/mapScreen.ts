import { app } from '../app';
import { audio } from '../audio/audio';
import { getMap, type MapDef } from '../world/mapdef';
import { TILE } from '../world/collision';
import { currentObjective } from '../story/quests';
import { makeCanvas } from '../art/draw';
import { PAL } from '../art/palette';
import { formatTime, timeIcon } from '../world/clock';
import { h } from './dom';
import { button, ui } from './ui';
import { registerPauseEntry } from './pause';
import type { WorldScene } from '../scenes/WorldScene';


const TERRAIN_COLORS: Record<string, string> = {
  water: '#8fd3e6',
  sand: '#f3dca2',
  grass: '#9fd67f',
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

function renderMap(def: MapDef, world: WorldScene | null, youAreHere?: { x: number; y: number }): HTMLCanvasElement {
  const built = def.build();
  const g = built.grid;
  const cell = Math.max(6, Math.floor(Math.min(900 / g.width, 640 / g.height)));
  const { c, ctx } = makeCanvas(g.width * cell, g.height * cell);
  for (let y = 0; y < g.height; y++)
    for (let x = 0; x < g.width; x++) {
      ctx.fillStyle = TERRAIN_COLORS[g.get(x, y)] ?? '#9fd67f';
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }
  // buildings & big props as soft blocks
  for (const o of built.objects) {
    if (!o.foot) continue;
    const c0 = Math.floor(o.x) + o.foot.dx;
    const r0 = Math.ceil(o.y) + o.foot.dy;
    ctx.fillStyle = o.kind === 'building' ? 'rgba(181,122,78,0.85)' : o.kind === 'tree' || o.kind === 'palm' ? 'rgba(74,143,74,0.55)' : 'rgba(138,118,102,0.55)';
    ctx.beginPath();
    ctx.roundRect(c0 * cell, r0 * cell, o.foot.w * cell, o.foot.h * cell, cell * 0.4);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of def.pois ?? []) {
    ctx.font = `${Math.round(cell * 2.4)}px sans-serif`;
    ctx.fillText(p.icon, p.x * cell, p.y * cell - cell * 0.8);
    ctx.font = `600 ${Math.round(cell * 1.35)}px Fredoka, sans-serif`;
    ctx.lineWidth = Math.max(2, cell * 0.35);
    ctx.strokeStyle = 'rgba(255,248,236,0.95)';
    ctx.strokeText(p.label, p.x * cell, p.y * cell + cell * 1.1);
    ctx.fillStyle = PAL.ink;
    ctx.fillText(p.label, p.x * cell, p.y * cell + cell * 1.1);
  }
  // revealed dig spots
  if (world && world.def.id === def.id) {
    for (const s of world.digSpots()) {
      if (!s.revealed) continue;
      ctx.fillStyle = PAL.gold;
      ctx.font = `${Math.round(cell * 1.6)}px sans-serif`;
      ctx.fillText('✦', (s.cx + 0.5) * cell, (s.cy + 0.5) * cell);
    }
  }
  // quest marker
  const d = app.data;
  const obj = d ? currentObjective(d) : null;
  const where = obj?.step.where?.(d!);
  if (where && where.map === def.id) {
    ctx.font = `${Math.round(cell * 3)}px sans-serif`;
    ctx.fillStyle = PAL.gold;
    ctx.lineWidth = cell * 0.5;
    ctx.strokeStyle = PAL.ink;
    ctx.strokeText('★', where.x * cell, where.y * cell - cell * 1.8);
    ctx.fillText('★', where.x * cell, where.y * cell - cell * 1.8);
  }
  const dot = (x: number, y: number, color: string, r: number, label?: string) => {
    ctx.beginPath();
    ctx.arc(x * cell, y * cell, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = Math.max(2, cell * 0.3);
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(r * 1.1)}px Fredoka, sans-serif`;
      ctx.fillText(label, x * cell, y * cell + 1);
    }
  };
  if (world && world.def.id === def.id) {
    if (world.biscuit) dot(world.biscuit.x / TILE, world.biscuit.y / TILE, '#e9a15a', cell * 0.7);
    world.players.forEach((p, i) => dot(p.x / TILE, p.y / TILE, i === 0 ? PAL.orange : PAL.blue, cell * 1.1, String(i + 1)));
  } else if (youAreHere) {
    dot(youAreHere.x, youAreHere.y, PAL.orange, cell * 1.1, '★');
  }
  return c;
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
  const canvas = renderMap(def, active, here);
  canvas.classList.add('map-canvas');
  const d = app.data;
  const obj = d ? currentObjective(d) : null;
  const close = () => {
    audio.sfx('close');
    ui.pop('map');
  };
  const panel = h(
    'div',
    { class: 'panel map-panel' },
    h('div', { class: 'map-head' }, h('h2', null, `🗺️ ${def.name}`), d && def.region === 'tockwood' ? h('div', { class: 'small' }, `${timeIcon(d.minutes)} ${formatTime(d.minutes)} · Day ${d.day}`) : null),
    note ? h('div', { class: 'map-note' }, note) : null,
    h('div', { class: 'map-wrap' }, canvas),
    h(
      'div',
      { class: 'map-legend' },
      h('span', null, h('b', { class: 'dot p1' }), ' Player 1'),
      h('span', null, h('b', { class: 'dot p2' }), ' Player 2'),
      h('span', null, h('b', { class: 'dot biscuit' }), ' Biscuit'),
      h('span', null, '★ Goal'),
      h('span', null, '✦ Dig spot'),
    ),
    obj ? h('div', { class: 'map-goal' }, `${obj.quest.icon} ${obj.step.text}`) : null,
    h('div', { class: 'row end' }, button('Close', close, { cls: 'secondary', autofocus: true, testid: 'map-close' })),
  );
  ui.push({ id: 'map', el: h('div', { class: 'center-wrap backdrop' }, panel), onBack: close });
  audio.sfx('page');
}

registerPauseEntry({ id: 'map', icon: '🗺️', label: 'Map', order: 10, open: openMap });
