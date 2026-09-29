import Phaser from 'phaser';
import { app } from '../app';
import { input } from '../input/input';
import { TERRAIN_LAYERS, DECOR_SIZE, type DecorFrame } from '../art/decor';
import { TEXTURE_ORIGIN } from '../art/textures';
import { rng } from '../art/draw';
import { layerVariants, cullCovered, type TerrainGrid } from '../world/terrain';
import { CollisionGrid, TILE } from '../world/collision';
import { getMap, type MapDef, type MapObject } from '../world/mapdef';
import { PlayerEntity, type Facing4 } from '../world/player';
import { frameZoom, maxSeparation, midpoint, tether, type FrameOpts, type Pt } from '../world/cameraMath';
import { toast, ui } from '../ui/ui';
import { talk } from '../ui/dialogue';
import { audio, type Sfx } from '../audio/audio';
import { hud } from '../ui/hud';
import '../world/maps/tockwood';

export interface WorldInit {
  map?: string;
  spawn?: string;
  x?: number;
  y?: number;
  facing?: Facing4;
}

export interface Interactable {
  id: string;
  x: number; // world units
  y: number;
  radius: number;
  label: string;
  /** which player triggered it */
  run: (player: 0 | 1) => void;
  enabled?: () => boolean;
}

/**
 * The exploration scene: renders a map (terrain layers, decor, props, buildings), moves one or
 * two players with collision, keeps both framed by a shared camera with a soft tether, and
 * offers context actions ("Enter", "Talk"...) for whatever is nearby.
 */
export class WorldScene extends Phaser.Scene {
  def!: MapDef;
  grid!: TerrainGrid;
  coll!: CollisionGrid;
  players: PlayerEntity[] = [];
  objects: MapObject[] = [];
  interactables: Interactable[] = [];
  private prompt!: Phaser.GameObjects.Container;
  private promptText!: Phaser.GameObjects.Text;
  private promptBg!: Phaser.GameObjects.Graphics;
  private camZoom = 1;
  private camCenter: Pt = { x: 0, y: 0 };
  private tetherLine!: Phaser.GameObjects.Graphics;
  focusTarget: Interactable | null = null;
  mapW = 0;
  mapH = 0;

  constructor() {
    super('world');
  }

  init(data: WorldInit): void {
    this.players = [];
    this.interactables = [];
    const loc = app.data?.location;
    const mapId = data?.map ?? (loc && loc.map ? loc.map : 'tockwood');
    this.def = getMap(mapId);
    this.initData = data ?? {};
  }
  private initData: WorldInit = {};

  create(): void {
    const built = this.def.build();
    this.grid = built.grid;
    this.objects = built.objects;
    this.mapW = this.grid.width * TILE;
    this.mapH = this.grid.height * TILE;
    this.cameras.main.setBackgroundColor(this.def.bg);
    this.buildTerrain();
    this.buildCollision();
    this.buildDecor();
    this.buildObjects();

    // players
    const start = this.startPosition();
    const p1 = new PlayerEntity(this, 0, start.x, start.y, app.data!.players[0]);
    p1.facing = start.facing;
    this.players.push(p1);
    if (input.twoPlayer) this.spawnPlayer2(false);

    this.tetherLine = this.add.graphics().setDepth(1e6 - 10);
    this.buildPrompt();
    this.camCenter = { x: p1.x, y: p1.y - TILE * 0.5 };
    this.camZoom = this.baseZoom();
    this.applyCamera(true);

    this.scale.on('resize', this.onResize, this);
    const offSave = app.events.on('before-save', () => this.saveLocation());
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      offSave();
      hud.setWorld(null);
    });
    hud.setWorld(this);
    this.cameras.main.fadeIn(350, 255, 244, 224);
    this.saveLocation();
    this.playMusic();
    this.players.forEach((p) => (p.onStep = () => audio.sfx(this.surfaceAt(p.x, p.y), { vol: 0.8 })));
    app.events.emit('map-changed', this.def.id);
  }

  // ------------------------------------------------------------------ building the map
  private buildTerrain(): void {
    const g = this.grid;
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: g.width - 1, height: g.height - 1 });
    const keys = this.def.layers;
    const data = keys.map((k) => layerVariants(g, new Set(TERRAIN_LAYERS[k].members)));
    cullCovered(
      data,
      keys.map((k) => TERRAIN_LAYERS[k].opaque),
    );
    keys.forEach((key, i) => {
      const ts = map.addTilesetImage(key, `terrain-${key}`, TILE, TILE, 1, 2, i * 16);
      if (!ts) return;
      const layer = map.createBlankLayer(key, ts, TILE / 2, TILE / 2);
      if (!layer) return;
      layer.putTilesAt(
        data[i].map((row) => row.map((v) => (v < 0 ? -1 : i * 16 + v))),
        0,
        0,
      );
      layer.setDepth(-10000 + i);
    });
    // straight tile layers (dock planks, floors)
    const straight: [string, string][] = [
      ['dock', 'tile-dock'],
      ['deck', 'tile-deck'],
      ['floor', 'tile-floor-wood'],
      ['rug', 'tile-floor-checker'],
    ];
    const m2 = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: g.width, height: g.height });
    straight.forEach(([terrain, tex], i) => {
      let any = false;
      const rows: number[][] = [];
      for (let y = 0; y < g.height; y++) {
        const row: number[] = [];
        for (let x = 0; x < g.width; x++) {
          const on = g.get(x, y) === terrain;
          any ||= on;
          row.push(on ? 1000 + i : -1);
        }
        rows.push(row);
      }
      if (!any) return;
      const ts = m2.addTilesetImage(terrain, tex, TILE, TILE, 1, 2, 1000 + i);
      if (!ts) return;
      const layer = m2.createBlankLayer(`${terrain}-l`, ts, 0, 0);
      layer?.putTilesAt(rows, 0, 0);
      layer?.setDepth(-9000 + i);
    });
  }

  private buildCollision(): void {
    const g = this.grid;
    this.coll = new CollisionGrid(g.width, g.height, TILE);
    for (let y = 0; y < g.height; y++)
      for (let x = 0; x < g.width; x++) {
        const t = g.get(x, y);
        if (t === 'water' || t === 'wall' || t === 'void' || t === 'dark') this.coll.setSolid(x, y, true);
      }
    for (const o of this.objects) {
      if (!o.foot) continue;
      const c0 = Math.floor(o.x) + o.foot.dx;
      const r0 = Math.ceil(o.y) + o.foot.dy;
      this.coll.blockRect(c0, r0, o.foot.w, o.foot.h);
    }
  }

  private buildDecor(): void {
    const g = this.grid;
    const blit = this.add.blitter(0, 0, 'decor').setDepth(-8000);
    const r = rng(g.width * 7919 + g.height);
    const blocked = new Set<string>();
    for (const o of this.objects) if (o.foot) for (let j = 0; j < o.foot.h + 1; j++) for (let i = -1; i < o.foot.w + 1; i++) blocked.add(`${Math.floor(o.x) + o.foot.dx + i},${Math.ceil(o.y) + o.foot.dy + j}`);
    const grassy: DecorFrame[] = ['tuft', 'tuft2', 'tuft', 'clover', 'flower-pink', 'flower-gold', 'flower-white', 'flower-blue'];
    const sandy: DecorFrame[] = ['shell', 'pebble', 'starfish', 'shell'];
    for (let y = 1; y < g.height - 1; y++)
      for (let x = 1; x < g.width - 1; x++) {
        if (blocked.has(`${x},${y}`)) continue;
        const t = g.get(x, y);
        const roll = r();
        let frame: DecorFrame | null = null;
        if (t === 'grass' && g.get(x + 1, y) === 'grass' && g.get(x, y + 1) === 'grass') {
          if (roll < 0.22) frame = grassy[Math.floor(r() * grassy.length)];
        } else if (t === 'sand' && roll < 0.05) frame = sandy[Math.floor(r() * sandy.length)];
        if (frame) blit.create(x * TILE + r() * (TILE - DECOR_SIZE), y * TILE + r() * (TILE - DECOR_SIZE), frame);
      }
  }

  private buildObjects(): void {
    for (const o of this.objects) {
      if (!o.texture || !this.textures.exists(o.texture)) continue;
      const org = TEXTURE_ORIGIN[o.texture] ?? { ox: 0.5, oy: 1 };
      const img = this.add.image(o.x * TILE, o.y * TILE, o.texture).setOrigin(org.ox, org.oy).setDepth(o.y * TILE);
      if (o.p?.scale) img.setScale(o.p.scale);
      if (o.kind === 'tree' || o.kind === 'palm') {
        // gentle sway
        img.setOrigin(org.ox, org.oy);
        this.tweens.add({ targets: img, angle: { from: -0.8, to: 0.8 }, duration: 2600 + (o.x * 131) % 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      if (o.p?.door) {
        this.interactables.push({
          id: `door:${o.id}`,
          x: o.x * TILE,
          y: o.y * TILE + TILE * 0.35,
          radius: TILE * 0.95,
          label: 'Enter',
          run: () => this.enterDoor(o),
        });
      }
      if (o.kind === 'sign' && o.p?.text) {
        this.interactables.push({
          id: `sign:${o.id}`,
          x: o.x * TILE,
          y: o.y * TILE + TILE * 0.2,
          radius: TILE * 0.9,
          label: 'Read',
          run: async () => {
            await talk('narrator', o.p!.text);
            app.setFlag('read:' + o.id);
          },
        });
      }
    }
  }

  private enterDoor(o: MapObject): void {
    audio.sfx('door');
    toast((o.p?.label ?? 'This door') + ' opens soon!', { icon: '🚪' });
  }

  private zoneState = new Map<string, boolean>();
  private checkZones(): void {
    const zones = this.def.zones;
    if (!zones || !app.data) return;
    for (const z of zones) {
      const inside = this.players.some((p) => p.x >= z.x * TILE && p.x < (z.x + z.w) * TILE && p.y >= z.y * TILE && p.y < (z.y + z.h) * TILE);
      const was = this.zoneState.get(z.id) ?? false;
      if (inside && !was) {
        if (!app.data.flags['visited:' + z.id]) app.setFlag('visited:' + z.id);
        this.events.emit('zone', z.id);
      }
      this.zoneState.set(z.id, inside);
    }
  }

  /** Surface under a world position, for footstep sounds. */
  surfaceAt(x: number, y: number): Sfx {
    const t = this.grid.get(Math.floor(x / TILE), Math.floor(y / TILE));
    if (t === 'sand' || t === 'dune' || t === 'path') return 'step-sand';
    if (t === 'dock' || t === 'deck' || t === 'floor') return 'step-wood';
    if (t === 'plaza' || t === 'stone' || t === 'tile') return 'step-stone';
    return 'step-grass';
  }

  playMusic(): void {
    audio.music(this.def.music === 'tockwood' ? 'tockwood-day' : this.def.music);
  }

  private startPosition(): { x: number; y: number; facing: Facing4 } {
    const d = this.initData;
    if (d.x !== undefined && d.y !== undefined) return { x: d.x * TILE, y: d.y * TILE, facing: d.facing ?? 'down' };
    const sp = d.spawn ? this.def.spawns[d.spawn] : undefined;
    if (sp) return { x: sp.x * TILE, y: sp.y * TILE, facing: sp.facing ?? 'down' };
    const loc = app.data?.location;
    if (loc && loc.map === this.def.id && loc.x >= 0 && loc.y >= 0) return { x: loc.x * TILE, y: loc.y * TILE, facing: 'down' };
    const st = this.def.spawns.start ?? Object.values(this.def.spawns)[0];
    return { x: st.x * TILE, y: st.y * TILE, facing: st.facing ?? 'down' };
  }

  // ------------------------------------------------------------------ players
  spawnPlayer2(announce = true): void {
    if (this.players[1]) return;
    const p1 = this.players[0];
    // find a free spot next to player 1
    const offsets: Pt[] = [
      { x: TILE * 0.8, y: 0 },
      { x: -TILE * 0.8, y: 0 },
      { x: 0, y: TILE * 0.7 },
      { x: 0, y: -TILE * 0.7 },
      { x: 0, y: 0 },
    ];
    const spot = offsets.find((o) => !this.coll.overlaps({ x: p1.x + o.x, y: p1.y + o.y, ...PlayerEntity.FEET })) ?? { x: 0, y: 0 };
    const p2 = new PlayerEntity(this, 1, p1.x + spot.x, p1.y + spot.y, app.data!.players[1]);
    p2.facing = p1.facing;
    p2.onStep = () => audio.sfx(this.surfaceAt(p2.x, p2.y), { vol: 0.6, pitch: 1.1 });
    this.players[1] = p2;
    this.players.forEach((p) => p.setMarkerVisible(true));
    if (announce) {
      p2.hopOnce();
      toast('Player 2 joined!', { icon: '🎉' });
    }
  }

  removePlayer2(): void {
    const p2 = this.players[1];
    if (!p2) return;
    p2.destroy();
    this.players.length = 1;
    this.players[0].setMarkerVisible(false);
    toast('Player 2 is taking a rest.', { icon: '👋' });
  }

  refreshLooks(): void {
    this.players.forEach((p, i) => p.refreshLook(app.data!.players[i]));
  }

  // ------------------------------------------------------------------ camera
  private baseZoom(): number {
    const H = this.scale.height;
    const cssH = H * this.scale.zoom;
    const tilesY = Phaser.Math.Clamp(cssH / 60, 7, 11.5);
    return H / (tilesY * TILE);
  }

  frameOpts(): FrameOpts {
    const base = this.baseZoom();
    return {
      viewW: this.scale.width,
      viewH: this.scale.height,
      baseZoom: base,
      minZoom: base * 0.72,
      marginX: TILE * 1.1,
      marginTop: TILE * 1.9,
      marginBottom: TILE * 0.8,
    };
  }

  private onResize(): void {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.applyCamera(true);
  }

  private applyCamera(snap = false): void {
    const cam = this.cameras.main;
    const pts = this.players.map((p) => ({ x: p.x, y: p.y - TILE * 0.5 }));
    const target = midpoint(pts);
    const zTarget = frameZoom(pts, this.frameOpts());
    const k = snap ? 1 : 0.12;
    this.camZoom += (zTarget - this.camZoom) * k;
    this.camCenter.x += (target.x - this.camCenter.x) * (snap ? 1 : 0.14);
    this.camCenter.y += (target.y - this.camCenter.y) * (snap ? 1 : 0.14);
    const viewW = this.scale.width / this.camZoom;
    const viewH = this.scale.height / this.camZoom;
    const cx = this.mapW > viewW ? Phaser.Math.Clamp(this.camCenter.x, viewW / 2, this.mapW - viewW / 2) : this.mapW / 2;
    const cy = this.mapH > viewH ? Phaser.Math.Clamp(this.camCenter.y, viewH / 2, this.mapH - viewH / 2) : this.mapH / 2;
    cam.setZoom(this.camZoom);
    cam.centerOn(cx, cy);
  }

  /** Is a world point currently visible? (tests + tether sanity) */
  isOnScreen(x: number, y: number, pad = 0): boolean {
    const v = this.cameras.main.worldView;
    return x >= v.x - pad && x <= v.right + pad && y >= v.y - pad && y <= v.bottom + pad;
  }

  // ------------------------------------------------------------------ prompts & interaction
  private buildPrompt(): void {
    this.promptBg = this.add.graphics();
    this.promptText = this.add.text(0, 0, '', { fontFamily: 'Fredoka, sans-serif', fontSize: '26px', fontStyle: '600', color: '#4a3b35' }).setOrigin(0.5);
    this.prompt = this.add.container(0, 0, [this.promptBg, this.promptText]).setDepth(1e6).setVisible(false);
  }

  private keyGlyph(player: 0 | 1): string {
    const dev = input.p[player].source !== 'none' ? input.p[player].source : input.device;
    if (dev === 'touch') return '';
    if (dev === 'pad') return 'A';
    return input.twoPlayer ? (player === 0 ? 'E' : '/') : 'E';
  }

  private nearestInteractable(p: PlayerEntity): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = Math.hypot(it.x - p.x, it.y - p.y);
      if (d > it.radius) continue;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  private updatePrompt(): void {
    let shown: { it: Interactable; player: 0 | 1 } | null = null;
    for (const p of this.players) {
      const it = this.nearestInteractable(p);
      if (it && !shown) shown = { it, player: p.index };
      hud.setActionLabel(p.index, it ? it.label : null);
    }
    this.focusTarget = shown?.it ?? null;
    if (!shown) {
      this.prompt.setVisible(false);
      return;
    }
    const glyph = this.keyGlyph(shown.player);
    const label = glyph ? `${glyph}  ${shown.it.label}` : shown.it.label;
    if (this.promptText.text !== label) {
      this.promptText.setText(label);
      const w = this.promptText.width + 34;
      const h = 46;
      this.promptBg.clear();
      this.promptBg.fillStyle(0xfff8ec, 1).lineStyle(4, 0x4a3b35, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      if (glyph) {
        this.promptBg.fillStyle(0xf7c65a, 1).fillCircle(-w / 2 + 26, 0, 16).lineStyle(3, 0x4a3b35).strokeCircle(-w / 2 + 26, 0, 16);
        this.promptText.setX(4);
      } else this.promptText.setX(0);
    }
    const s = 1 / this.camZoom;
    const screenScale = Math.min(1.25, this.scale.height / 900 + 0.35);
    this.prompt.setScale(s * screenScale);
    this.promptText.setResolution(Math.min(3, this.camZoom * screenScale * 1.5));
    this.prompt.setPosition(shown.it.x, shown.it.y - TILE * 1.9 + Math.sin(this.time.now / 250) * 4);
    this.prompt.setVisible(true);
  }

  // ------------------------------------------------------------------ frame update
  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    const blocked = ui.blocking;
    const prev: Pt[] = this.players.map((p) => ({ x: p.x, y: p.y }));
    const next: Pt[] = [];
    this.players.forEach((p, i) => {
      const pad = input.p[i];
      let mx = blocked ? 0 : pad.x;
      let my = blocked ? 0 : pad.y;
      const speed = PlayerEntity.SPEED * p.speedMult;
      let dx = mx * speed * dt;
      let dy = my * speed * dt;
      const res = this.coll.move(p.feet, dx, dy);
      let nx = res.x;
      let ny = res.y;
      if ((res.blockedX || res.blockedY) && (mx || my)) {
        const n = this.coll.cornerNudge(p.feet, dx, dy, TILE * 0.45);
        if (n.nx || n.ny) {
          const r2 = this.coll.move({ ...p.feet, x: nx, y: ny }, n.nx * speed * dt * 0.8, n.ny * speed * dt * 0.8);
          nx = r2.x;
          ny = r2.y;
        }
      }
      next.push({ x: nx, y: ny });
      if (mx || my) p.face(mx, my);
      mx = my = 0;
    });
    if (this.players.length === 2) {
      const lim = maxSeparation(this.frameOpts());
      const [a, b] = tether([prev[0], prev[1]], [next[0], next[1]], lim);
      next[0] = a;
      next[1] = b;
    }
    this.players.forEach((p, i) => {
      const moved = Math.hypot(next[i].x - p.x, next[i].y - p.y) > 0.5;
      p.x = next[i].x;
      p.y = next[i].y;
      p.tick(deltaMs, moved);
    });
    this.drawTether();
    this.applyCamera();
    this.checkZones();
    if (!blocked) {
      this.updatePrompt();
      for (const p of this.players) {
        // ui.locked: a menu/dialogue just closed — don't let the same press re-trigger something.
        if (input.p[p.index].aPressed && !ui.locked) {
          const it = this.nearestInteractable(p);
          if (it) it.run(p.index);
        }
      }
    } else this.prompt.setVisible(false);
  }

  private drawTether(): void {
    const g = this.tetherLine;
    g.clear();
    if (this.players.length < 2) return;
    const [a, b] = this.players;
    const lim = maxSeparation(this.frameOpts());
    const rx = Math.abs(a.x - b.x) / lim.w;
    const ry = Math.abs(a.y - b.y) / lim.h;
    const r = Math.max(rx, ry);
    if (r < 0.78) return;
    const alpha = Math.min(1, (r - 0.78) / 0.15);
    // Pip's sparkly ribbon keeps friends together
    const n = 14;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y - TILE * 0.5 + (b.y - a.y) * t + Math.sin(t * Math.PI) * -TILE * 0.3 + Math.sin(this.time.now / 200 + i) * 4;
      g.fillStyle(0x4a3b35, alpha * 0.9).fillCircle(x, y, 12);
      g.fillStyle(0xf7c65a, alpha).fillCircle(x, y, 8);
    }
  }

  saveLocation(): void {
    const d = app.data;
    const p = this.players[0];
    if (!d || !p) return;
    d.location = { map: this.def.id, x: +(p.x / TILE).toFixed(2), y: +(p.y / TILE).toFixed(2) };
  }
}
