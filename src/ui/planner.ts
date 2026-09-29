import { app } from '../app';
import { audio } from '../audio/audio';
import { FURNITURE_ART } from '../art/furniture';
import { drawRoom } from '../art/rooms';
import type { PropArt } from '../art/props';
import { iconUrl } from '../art/icons';
import type { PlacedItem } from '../core/state';
import { COTTAGE, anchorOf, canPlace, cellsOf, findSpot, footprint, furnitureDef, newUid, rowsFor, turns, viewOf } from '../core/home';
import { COTTAGE_SPEC } from '../world/maps/interiors';
import { h, clear } from './dom';
import { button, ui, type Dir } from './ui';
import { registerPauseEntry } from './pause';
import { input } from '../input/input';
import { isTouchDevice } from '../core/display';
import { hud } from './hud';

/**
 * The home planner: your cottage seen from above, where you pick furniture up, carry it about,
 * turn it and put it down (or away into storage). Keyboard/gamepad: move the cursor, E/A to pick
 * up and put down, R/X to turn, Delete/Y to put away. Touch/mouse: drag things around, or tap to
 * lift and tap where it should go.
 */
const T = 96;
const room = COTTAGE;

interface Held {
  piece: PlacedItem;
  /** where it was before you picked it up (null = just taken out of storage) */
  from: PlacedItem | null;
  /** which of its cells the cursor holds it by */
  grab: { x: number; y: number };
}

const artCache = new Map<string, PropArt>();
function artFor(key: string): PropArt | null {
  let a = artCache.get(key);
  if (!a) {
    const make = FURNITURE_ART[key];
    if (!make) return null;
    a = make();
    artCache.set(key, a);
  }
  return a;
}

let backdrop: HTMLCanvasElement | null = null;

export function openPlanner(onDone: () => void): Promise<void> {
  const d = app.data;
  if (!d || ui.has('planner')) return Promise.resolve();
  return new Promise((resolve) => {
    let items: PlacedItem[] = d.home.items.map((it) => ({ ...it }));
    let cursor = { x: room.door.x, y: room.h - 3 };
    let held: Held | null = null;
    let message = '';
    let messageBad = false;
    let dirty = false;
    let raf = 0;
    let closed = false;

    const canvas = h('canvas', { class: 'pl-canvas' });
    const stage = h('div', {
      class: 'pl-stage',
      dataset: { nav: '', navDir: 'consume', autofocus: '' },
      attrs: { tabindex: 0, 'data-testid': 'planner-room', role: 'application', 'aria-label': 'Your cottage. Arrows move, E picks up and puts down, R turns, Delete puts away.' },
    }, canvas);
    const status = h('div', { class: 'pl-status', attrs: { 'data-testid': 'planner-status', 'aria-live': 'polite' } });
    const tray = h('div', { class: 'pl-tray', attrs: { 'data-testid': 'planner-tray' } });
    const mainBtn = button('Pick up', () => primary(), { cls: 'gold', icon: '✋', testid: 'planner-grab' });
    const turnBtn = button('Turn', () => turn(), { icon: '⟳', testid: 'planner-turn' });
    const awayBtn = button('Put away', () => putAway(), { icon: '📦', testid: 'planner-away' });
    const doneBtn = button('Done', () => finish(), { icon: '✔', testid: 'planner-done' });
    const tools = h('div', { class: 'pl-tools' }, mainBtn, turnBtn, awayBtn);

    const stored = (): { id: string; n: number }[] => {
      const out: { id: string; n: number }[] = [];
      for (const [id, n] of Object.entries(d.inventory)) {
        if (!furnitureDef(id)) continue;
        const inRoom = items.filter((it) => it.id === id).length + (held && held.piece.id === id ? 1 : 0);
        if (n - inRoom > 0) out.push({ id, n: n - inRoom });
      }
      return out;
    };

    // ---------------------------------------------------------------- what's where
    /** The piece under a cell: furniture first, then pictures on the wall, then rugs. */
    const itemAt = (x: number, y: number): PlacedItem | null => {
      const covers = (it: PlacedItem) => cellsOf(furnitureDef(it.id)!, it).some((c) => c.x === x && c.y === y);
      const order = ['floor', 'wall', 'rug'];
      for (const kind of order) {
        const hit = [...items].reverse().find((it) => furnitureDef(it.id)?.place === kind && covers(it));
        if (hit) return hit;
      }
      return null;
    };
    const check = () => (held ? canPlace(room, items, held.piece) : null);

    const clampHeld = () => {
      if (!held) return;
      const def = furnitureDef(held.piece.id)!;
      const f = footprint(def, held.piece.rot);
      const rows = rowsFor(room, def);
      held.grab.x = Math.min(held.grab.x, f.w - 1);
      held.grab.y = Math.min(held.grab.y, f.h - 1);
      held.piece.x = Math.max(1, Math.min(room.w - 1 - f.w, cursor.x - held.grab.x));
      held.piece.y = Math.max(rows.min, Math.min(rows.max - f.h + 1, cursor.y - held.grab.y));
      cursor = { x: held.piece.x + held.grab.x, y: held.piece.y + held.grab.y };
    };

    const say = (text: string, bad = false) => {
      message = text;
      messageBad = bad;
    };

    // ---------------------------------------------------------------- actions
    const pickUp = (it: PlacedItem, at: { x: number; y: number }) => {
      items = items.filter((x) => x !== it);
      held = { piece: { ...it }, from: it, grab: { x: at.x - it.x, y: at.y - it.y } };
      audio.sfx('pickup');
      say(`Carrying the ${furnitureDef(it.id)!.name}. Put it down somewhere nice!`);
    };

    const putDown = (): boolean => {
      if (!held) return false;
      const ok = canPlace(room, items, held.piece);
      if (!ok.ok) {
        audio.sfx('error');
        say(ok.why, true);
        return false;
      }
      const def = furnitureDef(held.piece.id)!;
      items.push(held.piece);
      held = null;
      dirty = true;
      audio.sfx('hop');
      say(`${def.name}: placed!`);
      return true;
    };

    const primary = () => {
      if (held) {
        putDown();
      } else {
        const it = itemAt(cursor.x, cursor.y);
        if (it) pickUp(it, cursor);
        else {
          audio.sfx('blip');
          say(stored().length ? 'Nothing here. Pick something from your storage, or move to a piece of furniture.' : 'Nothing here — move to a piece of furniture to pick it up.');
        }
      }
      refresh();
    };

    const turn = () => {
      const target = held ? held.piece : itemAt(cursor.x, cursor.y);
      if (!target) {
        audio.sfx('error');
        say('Move to something to turn it.', true);
        refresh();
        return;
      }
      const def = furnitureDef(target.id)!;
      if (turns(def) < 2) {
        audio.sfx('blip');
        say(`The ${def.name.toLowerCase()} looks the same from every side!`);
        refresh();
        return;
      }
      if (held) {
        held.piece.rot = (held.piece.rot + 1) % turns(def);
        clampHeld();
      } else {
        const next = { ...target, rot: (target.rot + 1) % turns(def) };
        const others = items.filter((x) => x !== target);
        if (!canPlace(room, others, next).ok) {
          audio.sfx('error');
          say('No room to turn it here — pick it up and move it first.', true);
          refresh();
          return;
        }
        items = [...others, next];
        dirty = true;
      }
      audio.sfx('squeak', { pitch: 1.2 });
      say(`Turned the ${def.name.toLowerCase()}.`);
      refresh();
    };

    const putAway = () => {
      const target = held ? held.piece : itemAt(cursor.x, cursor.y);
      if (!target) {
        audio.sfx('error');
        say('Move to something to put it away.', true);
        refresh();
        return;
      }
      const def = furnitureDef(target.id)!;
      if (def.keep) {
        audio.sfx('error');
        say(`The ${def.name.toLowerCase()} stays — you can move it, but not put it away.`, true);
        refresh();
        return;
      }
      if (held) held = null;
      else items = items.filter((x) => x !== target);
      dirty = true;
      audio.sfx('close');
      say(`The ${def.name.toLowerCase()} went into storage.`);
      refresh();
    };

    const takeOut = (id: string) => {
      if (held) {
        // swap: whatever you were carrying goes back where it was (or into storage)
        if (held.from) items.push(held.from);
        held = null;
      }
      const spot = findSpot(room, items, id, cursor) ?? findSpot(room, items, id, { x: 5, y: 5 });
      const def = furnitureDef(id)!;
      const rows = rowsFor(room, def);
      const piece: PlacedItem = { uid: newUid({ ...d, home: { items } }), id, x: spot?.x ?? 1, y: spot?.y ?? rows.min, rot: spot?.rot ?? 0 };
      held = { piece, from: null, grab: { x: 0, y: 0 } };
      cursor = { x: piece.x, y: piece.y };
      clampHeld();
      audio.sfx('pickup');
      say(spot ? `Carrying the ${def.name}. Put it down with ${pickKey()}!` : `There’s no room for the ${def.name.toLowerCase()} — put something away first.`, !spot);
      refresh();
      stage.focus({ preventScroll: true });
    };

    const cancelHeld = () => {
      if (!held) return;
      if (held.from) items.push(held.from);
      held = null;
      audio.sfx('back');
      say('Put back where it was.');
      refresh();
    };

    const moveCursor = (dir: Dir) => {
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      if (held) {
        const def = furnitureDef(held.piece.id)!;
        const f = footprint(def, held.piece.rot);
        const rows = rowsFor(room, def);
        const nx = held.piece.x + dx;
        const ny = held.piece.y + dy;
        if (nx < 1 || nx + f.w > room.w - 1 || ny < rows.min || ny + f.h - 1 > rows.max) {
          if (dir === 'down' && ny + f.h - 1 > rows.max) (tools.querySelector('button') as HTMLElement | null)?.focus();
          else audio.sfx('blip', { vol: 0.4 });
          return;
        }
        held.piece.x = nx;
        held.piece.y = ny;
        cursor = { x: nx + held.grab.x, y: ny + held.grab.y };
      } else {
        const nx = cursor.x + dx;
        const ny = cursor.y + dy;
        if (ny > room.h - 2) {
          (tools.querySelector('button') as HTMLElement | null)?.focus();
          return;
        }
        if (nx > room.w - 2) {
          const first = tray.querySelector<HTMLElement>('button');
          if (first) first.focus();
          return;
        }
        if (nx < 1 || ny < room.wallRows - 1) return;
        cursor = { x: nx, y: ny };
        const it = itemAt(nx, ny);
        say(it ? `${furnitureDef(it.id)!.name} — ${pickKey()} to pick it up.` : '');
      }
      audio.sfx('blip', { vol: 0.5 });
      refresh();
    };

    const pickKey = () => (ui.keyboardNav ? (input.device === 'pad' ? 'A' : 'E') : isTouchDevice() ? 'a tap' : 'a click');

    // ---------------------------------------------------------------- drawing
    const draw = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = room.w * T;
      const H = room.h * T;
      const s = Math.min(rect.width / W, rect.height / H);
      if (!(s > 0)) return;
      const cw = Math.round(W * s);
      const ch = Math.round(H * s);
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
      }
      const c = canvas.getContext('2d')!;
      c.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
      c.clearRect(0, 0, W, H);
      backdrop ??= drawRoom(COTTAGE_SPEC, T);
      c.drawImage(backdrop, 0, 0);
      // the floor grid
      c.strokeStyle = 'rgba(74, 59, 53, 0.13)';
      c.lineWidth = 2;
      for (let x = 1; x <= room.w - 1; x++) {
        c.beginPath();
        c.moveTo(x * T, room.wallRows * T);
        c.lineTo(x * T, (room.h - 1) * T);
        c.stroke();
      }
      for (let y = room.wallRows; y <= room.h - 1; y++) {
        c.beginPath();
        c.moveTo(T, y * T);
        c.lineTo((room.w - 1) * T, y * T);
        c.stroke();
      }
      // the doorway stays clear
      c.fillStyle = 'rgba(124, 196, 127, 0.22)';
      c.fillRect(room.door.x * T + 6, (room.h - 2) * T + 6, room.door.w * T - 12, T - 12);
      const t = performance.now() / 1000;
      const all: { p: PlacedItem; ghost: boolean }[] = items.map((p) => ({ p, ghost: false }));
      if (held) all.push({ p: held.piece, ghost: true });
      const layer = (p: PlacedItem) => ({ rug: 0, wall: 1, floor: 2 })[furnitureDef(p.id)!.place];
      all.sort((a, b) => layer(a.p) - layer(b.p) || anchorOf(a.p).y - anchorOf(b.p).y);
      const hover = held ? null : itemAt(cursor.x, cursor.y);
      for (const { p, ghost } of all) {
        const def = furnitureDef(p.id)!;
        const v = viewOf(def, p.rot);
        const a = artFor(v.art);
        const at = anchorOf(p);
        if (ghost || p === hover) {
          const ok = ghost ? canPlace(room, items, p).ok : true;
          const f = footprint(def, p.rot);
          c.fillStyle = ghost ? (ok ? 'rgba(124, 196, 127, 0.45)' : 'rgba(228, 106, 106, 0.45)') : 'rgba(247, 198, 90, 0.35)';
          c.strokeStyle = ghost ? (ok ? '#4f9a52' : '#c0473f') : '#d9a23a';
          c.lineWidth = 5;
          c.beginPath();
          c.roundRect(p.x * T + 4, p.y * T + 4, f.w * T - 8, f.h * T - 8, 14);
          c.fill();
          c.stroke();
        }
        if (!a) continue;
        const img = a.cv.c;
        const lift = ghost ? 10 + Math.sin(t * 5) * 4 : 0;
        c.save();
        c.globalAlpha = ghost ? 0.88 : 1;
        c.translate(at.x * T, at.y * T - lift);
        if (v.flip) c.scale(-1, 1);
        c.drawImage(img, -img.width * a.ox, -img.height * a.oy);
        c.restore();
      }
      // the cursor
      if (!held) {
        const pulse = 0.6 + Math.sin(t * 6) * 0.25;
        c.strokeStyle = `rgba(74, 59, 53, ${pulse})`;
        c.lineWidth = 6;
        c.setLineDash([16, 10]);
        c.beginPath();
        c.roundRect(cursor.x * T + 6, cursor.y * T + 6, T - 12, T - 12, 12);
        c.stroke();
        c.setLineDash([]);
      }
    };

    const loop = () => {
      if (closed) return;
      pollPads();
      draw();
      raf = requestAnimationFrame(loop);
    };

    // ---------------------------------------------------------------- the side panel and buttons
    const refresh = () => {
      const ok = check();
      const bad = !!held && !!ok && !ok.ok;
      // (while carrying: a red spot says why; a green one keeps the friendly line)
      status.textContent = bad && ok && !ok.ok ? `${ok.why} (Move it somewhere green.)` : message || (held ? '' : 'Pick something up to move it.');
      status.classList.toggle('bad', bad || (!held && messageBad));
      (mainBtn.querySelector('.btn-label') as HTMLElement).textContent = held ? 'Put down' : 'Pick up';
      (mainBtn.querySelector('.btn-icon') as HTMLElement).textContent = held ? '✅' : '✋';
      const target = held ? held.piece : itemAt(cursor.x, cursor.y);
      const tdef = target ? furnitureDef(target.id) : null;
      turnBtn.disabled = !tdef || turns(tdef) < 2;
      awayBtn.disabled = !tdef || !!tdef.keep;
      stage.dataset.held = held ? held.piece.id : '';
      stage.dataset.cursor = `${cursor.x},${cursor.y}`;
      const focusId = (document.activeElement as HTMLElement | null)?.getAttribute('data-testid');
      clear(tray);
      const list = stored();
      tray.append(h('div', { class: 'pl-tray-title' }, '📦 In storage'));
      if (!list.length) tray.append(h('div', { class: 'small pl-empty' }, 'Nothing in storage. Rocco builds furniture, and you’ll find more on your travels!'));
      for (const s of list) {
        const def = furnitureDef(s.id)!;
        tray.append(
          button(
            h('span', { class: 'pl-item' }, h('img', { attrs: { src: iconUrl(s.id), alt: '' } }), h('span', null, def.name, s.n > 1 ? ` ×${s.n}` : '')),
            () => takeOut(s.id),
            { cls: 'pl-take small-btn', testid: `planner-take-${s.id}` },
          ),
        );
      }
      if (focusId?.startsWith('planner-take-')) {
        const again = tray.querySelector<HTMLElement>(`[data-testid="${focusId}"]`) ?? tray.querySelector<HTMLElement>('button');
        (again ?? stage).focus({ preventScroll: true });
      }
    };

    // ---------------------------------------------------------------- pointer: drag, or tap-tap
    const cellFrom = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: Math.floor(((e.clientX - r.left) / r.width) * room.w), y: Math.floor(((e.clientY - r.top) / r.height) * room.h) };
    };
    // `lifted`: this touch picked the piece up (so a plain tap just lifts it; the next tap puts it down)
    let drag: { start: { x: number; y: number }; moved: boolean; lifted: boolean } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (ui.top?.id !== 'planner') return;
      e.preventDefault();
      stage.focus({ preventScroll: true });
      const cell = cellFrom(e);
      canvas.setPointerCapture?.(e.pointerId);
      if (held) {
        cursor = cell;
        clampHeld();
        drag = { start: cell, moved: false, lifted: false };
      } else {
        const it = itemAt(cell.x, cell.y);
        cursor = { x: Math.max(1, Math.min(room.w - 2, cell.x)), y: Math.max(room.wallRows - 1, Math.min(room.h - 2, cell.y)) };
        if (it) {
          pickUp(it, cell);
          drag = { start: cell, moved: false, lifted: true };
        } else say('');
      }
      refresh();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || !held) return;
      const cell = cellFrom(e);
      if (cell.x === cursor.x && cell.y === cursor.y) return;
      drag.moved = drag.moved || cell.x !== drag.start.x || cell.y !== drag.start.y;
      cursor = cell;
      clampHeld();
      refresh();
    });
    const up = () => {
      if (!drag) return;
      const justLifted = drag.lifted && !drag.moved;
      drag = null;
      // a tap lifts it; a drag, or the next tap (anywhere, even where it was), puts it down
      if (held && !justLifted) putDown();
      refresh();
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    // keyboard / gamepad
    stage.addEventListener('navdir', (e) => moveCursor((e as CustomEvent<Dir>).detail));
    stage.addEventListener('click', (e) => {
      // E / Enter / A arrive as a synthetic click on the focused room (mouse clicks are handled above)
      if ((e as MouseEvent).detail === 0) primary();
    });
    const onKey = (e: KeyboardEvent) => {
      if (ui.top?.id !== 'planner' || e.repeat) return;
      if (e.code === 'KeyR') turn();
      else if (e.code === 'Delete' || e.code === 'Backspace' || e.code === 'KeyX') putAway();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    const padMem = new Map<number, boolean[]>();
    const pollPads = () => {
      if (ui.top?.id !== 'planner' || !navigator.getGamepads) return;
      for (const gp of navigator.getGamepads()) {
        if (!gp?.connected) continue;
        const was = padMem.get(gp.index) ?? [];
        const now = gp.buttons.map((b) => b.pressed);
        if (now[2] && !was[2]) turn();
        if (now[3] && !was[3]) putAway();
        padMem.set(gp.index, now);
      }
    };

    // ---------------------------------------------------------------- open / close
    function finish() {
      if (held) {
        // don't lose what you're carrying: put it down if it fits, else back where it was
        if (!putDown()) cancelHeld();
      }
      closed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', refresh);
      if (dirty) {
        d!.home.items = items;
        app.setFlag('home:decorated');
        app.autosave.request();
      }
      audio.sfx('close');
      ui.pop('planner');
      if (dirty) onDone();
      resolve();
    }

    const panel = h(
      'div',
      { class: 'panel planner', attrs: { 'data-testid': 'planner' } },
      h('div', { class: 'pl-head' }, h('h2', null, '🏠 Decorate'), h('div', { class: 'pl-help small' }, 'Drag furniture around, or tap to lift and tap to place. Keys: arrows · E · R to turn · Del to put away.'), doneBtn),
      h('div', { class: 'pl-body' }, h('div', { class: 'pl-main' }, stage, status, tools), tray),
    );
    ui.push({
      id: 'planner',
      el: h('div', { class: 'center-wrap backdrop pl-wrap' }, panel),
      onBack: () => {
        if (held) cancelHeld();
        else finish();
      },
      onClose: () => {
        closed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey);
      },
    });
    audio.sfx('open');
    if (!d.flags['home:tip']) {
      app.setFlag('home:tip');
      say('Tip: the green square by the door always stays clear, so you can get in and out.');
    } else say('Pick something up to move it — or take something out of storage.');
    refresh();
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', refresh);
    // test hooks read the working state
    (panel as unknown as { plannerState: () => unknown }).plannerState = () => ({ items: items.map((x) => ({ ...x })), held: held ? { ...held.piece } : null, cursor: { ...cursor }, stored: stored() });
  });
}

/** The planner's working state (for tests), or null when it's closed. */
export function plannerState(): unknown {
  const el = document.querySelector('[data-testid="planner"]') as (HTMLElement & { plannerState?: () => unknown }) | null;
  return el?.plannerState?.() ?? null;
}

registerPauseEntry({
  id: 'decorate',
  icon: '🏠',
  label: 'Decorate',
  order: 22,
  visible: () => hud.world?.def.id === 'cottage',
  open: () => {
    ui.pop('pause');
    const world = hud.world;
    if (world) void openPlanner(() => world.reloadRoom());
  },
});
