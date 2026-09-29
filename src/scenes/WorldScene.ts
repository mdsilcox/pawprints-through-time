import Phaser from 'phaser';
import { app } from '../app';
import { input } from '../input/input';
import { TERRAIN_LAYERS, DECOR_SIZE, type DecorFrame } from '../art/decor';
import { TEXTURE_ORIGIN, addCanvasTexture, ensureBiscuitTexture, ensureBunnyTexture } from '../art/textures';
import { rng } from '../art/draw';
import { WILD_FURS } from '../art/bunny';
import { layerVariants, cullCovered, type TerrainGrid } from '../world/terrain';
import { CollisionGrid, TILE } from '../world/collision';
import { getMap, type MapDef, type MapObject } from '../world/mapdef';
import { PlayerEntity, type Facing4 } from '../world/player';
import { frameZoom, maxSeparation, midpoint, tether, type FrameOpts, type Pt } from '../world/cameraMath';
import { BiscuitActor, BunnyActor, NpcActor, PipActor, type Actor, type ActorHost } from '../world/actors';
import { advance, formatTime, nightAmount, tint, timeIcon } from '../world/clock';
import { availableSpots, spotsForDay, type DigSpot } from '../world/dig';
import { toast, ui } from '../ui/ui';
import { talk } from '../ui/dialogue';
import { hud } from '../ui/hud';
import { audio, type Sfx } from '../audio/audio';
import { character } from '../data/characters';
import { biscuitPieces } from '../data/clothes';
import { HOPKINS_BY_ID, GRANDMA } from '../data/bunnies';
import { triggerEnter, triggerTalk, triggerUse, storyBusy, give, setFlag, cutscene } from '../story/hooks';
import { quietCancel } from '../core/session';
import { SoupFx } from '../world/soupFx';
import { gameNow, plotInfo } from '../soup/garden';
import { iconCanvas } from '../art/icons';
import { hasEffect } from '../soup/effects';
import '../world/maps/tockwood';
import '../world/maps/interiors';

export interface WorldInit {
  map?: string;
  spawn?: string;
  x?: number;
  y?: number;
  facing?: Facing4;
}

export interface Interactable {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  run: (player: 0 | 1) => void | Promise<void>;
  enabled?: () => boolean;
}

interface SpotView {
  mound?: Phaser.GameObjects.Graphics;
  spot: DigSpot;
  img: Phaser.GameObjects.Image;
  revealed: boolean;
}

/**
 * The exploration scene: renders a map (terrain layers or a painted room), moves one or two
 * players with collision, keeps both framed by a shared camera with a soft tether, runs the
 * neighbours, Biscuit and the bunnies, day/night lighting, dig spots, doors and story hooks.
 */
export class WorldScene extends Phaser.Scene implements ActorHost {
  def!: MapDef;
  grid!: TerrainGrid;
  coll!: CollisionGrid;
  players: PlayerEntity[] = [];
  objects: MapObject[] = [];
  interactables: Interactable[] = [];
  actors: Actor[] = [];
  npcs = new Map<string, NpcActor>();
  biscuit: BiscuitActor | null = null;
  pip: PipActor | null = null;
  bunnies: BunnyActor[] = [];
  private spots: SpotView[] = [];
  soupFx!: SoupFx;
  private plotViews = new Map<number, Phaser.GameObjects.Container>();
  private plotTimer = 0;
  private propImages = new Map<string, Phaser.GameObjects.Image>();
  private prompts: { box: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Graphics; label: string }[] = [];
  /** tall things (buildings, trees) that fade when a player walks behind them */
  private occluders: { img: Phaser.GameObjects.Image; baseY: number }[] = [];
  private camZoom = 1;
  private camCenter: Pt = { x: 0, y: 0 };
  private tetherLine!: Phaser.GameObjects.Graphics;
  focusTarget: Interactable | null = null;
  mapW = 0;
  mapH = 0;
  private initData: WorldInit = {};
  private transitioning = false;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private lamps: Phaser.GameObjects.Image[] = [];
  private fireflies: { img: Phaser.GameObjects.Image; base: Pt; ph: number }[] = [];
  private lastHudMinute = -1;
  private zoneState = new Map<string, boolean>();

  constructor() {
    super('world');
  }

  get usesClock(): boolean {
    return (this.def.timeOfDay ?? (this.def.region === 'tockwood' && !this.def.indoor ? 'clock' : 'day')) === 'clock';
  }

  init(data: WorldInit): void {
    this.players = [];
    this.interactables = [];
    this.actors = [];
    this.npcs = new Map();
    this.biscuit = null;
    this.pip = null;
    this.bunnies = [];
    this.spots = [];
    this.lamps = [];
    this.fireflies = [];
    this.overlay = null;
    this.prompts = [];
    this.occluders = [];
    this.transitioning = false;
    this.zoneState = new Map();
    this.lastHudMinute = -1;
    const loc = app.data?.location;
    const mapId = data?.map ?? (loc && loc.map ? loc.map : 'tockwood');
    this.def = getMap(mapId);
    this.initData = data ?? {};
  }

  // ------------------------------------------------------------------ ActorHost
  get phaserScene(): Phaser.Scene {
    return this;
  }

  playerPositions(): { x: number; y: number; moving: boolean }[] {
    return this.players.map((p) => ({ x: p.x, y: p.y, moving: p.moving }));
  }

  create(): void {
    const built = this.def.build();
    this.grid = built.grid;
    this.objects = built.objects;
    this.mapW = this.grid.width * TILE;
    this.mapH = this.grid.height * TILE;
    this.cameras.main.setBackgroundColor(this.def.bg);
    if (this.def.backdrop) {
      const key = `room-${this.def.id}`;
      if (!this.textures.exists(key)) addCanvasTexture(this, key, this.def.backdrop());
      this.add.image(0, 0, key).setOrigin(0).setDepth(-10000);
    } else {
      this.buildTerrain();
    }
    this.buildCollision();
    if (!this.def.backdrop) this.buildDecor();
    this.buildObjects();

    const start = this.startPosition();
    const p1 = new PlayerEntity(this, 0, start.x, start.y, app.data!.players[0]);
    p1.facing = start.facing;
    this.players.push(p1);
    if (input.twoPlayer) this.spawnPlayer2(false);

    this.spawnCompanions();
    this.buildDigSpots();
    this.buildLighting();
    this.soupFx = new SoupFx(this);
    this.refreshPlots();

    this.tetherLine = this.add.graphics().setDepth(1e6 - 10);
    this.buildPrompt();
    this.camCenter = { x: p1.x, y: p1.y - TILE * 0.5 };
    this.camZoom = this.baseZoom();
    this.applyCamera(true);

    this.scale.on('resize', this.onResize, this);
    const offSave = app.events.on('before-save', () => this.saveLocation());
    const offOutfit = app.events.on('outfit-changed', () => this.refreshLooks());
    this.events.once('shutdown', () => {
      for (const a of this.actors) a.destroyed = true;
      this.scale.off('resize', this.onResize, this);
      offSave();
      offOutfit();
      this.soupFx?.destroy();
      this.plotViews.clear();
      this.propImages.clear();
      hud.setWorld(null);
    });
    hud.setWorld(this);
    this.cameras.main.fadeIn(350, 255, 244, 224);
    this.saveLocation();
    this.playMusic();
    this.players.forEach((p) => (p.onStep = () => audio.sfx(this.surfaceAt(p.x, p.y), { vol: 0.8 })));
    app.events.emit('map-changed', this.def.id);
    if (!app.data!.flags[`visited:${this.def.id}`]) app.setFlag(`visited:${this.def.id}`);
    // story scripts for this map (opening, first visits...)
    this.time.delayedCall(420, () => void triggerEnter(this.def.id, { world: this, player: 0 }));
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
      if (!o.foot || !this.visible(o)) continue;
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

  /** Map objects can be conditional on story flags ("flag", "!flag", "a,b"). */
  visible(o: MapObject): boolean {
    if (!o.when) return true;
    const f = app.data?.flags ?? {};
    return o.when.split(',').every((term) => {
      const t = term.trim();
      return t.startsWith('!') ? !f[t.slice(1)] : !!f[t];
    });
  }

  private buildObjects(): void {
    for (const o of this.objects) {
      if (!this.visible(o)) continue;
      let texture = o.texture;
      if (o.kind === 'building' && o.id === 'bowling') texture = app.data?.flags['bowling:open'] ? 'bld-bowling-open' : 'bld-bowling';
      if (o.kind === 'building' && o.id === 'clocktower' && app.data?.flags.hourglassRestored) texture = 'clocktower-fixed';
      if (texture && this.textures.exists(texture)) {
        const org = TEXTURE_ORIGIN[texture] ?? { ox: 0.5, oy: 1 };
        const opened = o.texture === 'prop-chest' && app.data?.flags[`${o.id === 'grotto-chest' ? 'grotto:chest' : `chest:${o.id}`}`];
        const img = this.add.image(o.x * TILE, o.y * TILE, opened ? 'prop-chest-open' : texture).setOrigin(org.ox, org.oy).setDepth(o.y * TILE);
        this.propImages.set(o.id, img);
        if (o.p?.scale) img.setScale(o.p.scale);
        if (o.p?.floor) img.setDepth(-7000);
        if (o.kind === 'building' || o.kind === 'tree' || o.kind === 'palm' || (o.kind === 'use' && img.displayHeight > TILE * 2.5) || (o.kind === 'furniture' && img.displayHeight > TILE * 2.2))
          this.occluders.push({ img, baseY: o.y * TILE });
        if (o.kind === 'tree' || o.kind === 'palm') {
          this.tweens.add({ targets: img, angle: { from: -0.8, to: 0.8 }, duration: 2600 + ((o.x * 131) % 1400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        if (o.id === 'cauldron') this.bubbleCauldron(o);
        if (o.kind === 'exhibit') {
          const item = app.data?.museum[Number(o.p?.slot ?? 0)];
          if (item) {
            const tex = `icon-${item}`;
            if (!this.textures.exists(tex)) addCanvasTexture(this, tex, iconCanvas(item, 64));
            const icon = this.add.image(o.x * TILE, o.y * TILE - TILE * 0.95, tex).setScale(0.8).setDepth(o.y * TILE + 1);
            this.tweens.add({ targets: icon, y: icon.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
        }
      }
      switch (o.kind) {
        case 'building':
          if (o.p?.door)
            this.interactables.push({ id: `door:${o.id}`, x: o.x * TILE, y: o.y * TILE + TILE * 0.35, radius: TILE * 0.95, label: 'Enter', run: () => this.enterDoor(o) });
          break;
        case 'sign':
          if (o.p?.text)
            this.interactables.push({
              id: `sign:${o.id}`,
              x: o.x * TILE,
              y: o.y * TILE + TILE * 0.2,
              radius: TILE * 0.9,
              label: 'Read',
              run: async () => {
                await talk('narrator', o.p!.text);
                app.setFlag(`read:${o.id}`);
              },
            });
          break;
        case 'use':
          this.interactables.push({
            id: `use:${o.id}`,
            x: o.x * TILE,
            y: o.y * TILE + TILE * 0.3,
            radius: TILE * (o.p?.range ?? 1.2),
            label: o.p?.label ?? 'Use',
            run: (player) => triggerUse(o.p!.action, { world: this, player, objectId: o.id }),
          });
          break;
        case 'npc':
          this.spawnNpc(o);
          break;
        case 'pip':
          this.spawnPipHome(o);
          break;
        case 'grandma':
          this.spawnGrandma(o);
          break;
        case 'wildbunnies':
          this.spawnWildBunnies(o);
          break;
        case 'warren':
          this.spawnWarren(o);
          break;
        case 'exhibit':
        case 'ledge':
          this.interactables.push({
            id: `ledge:${o.id}`,
            x: o.x * TILE,
            y: o.y * TILE + TILE * 0.4,
            radius: TILE * 1.3,
            label: 'Hop up!',
            run: (player) => this.hopUp(o, player),
          });
          break;
        case 'plot':
          this.interactables.push({
            id: `${o.kind}:${o.id}`,
            x: o.x * TILE,
            y: o.y * TILE + TILE * 0.2,
            radius: TILE * 0.9,
            label: o.kind === 'plot' ? 'Garden' : 'Look',
            run: (player) => triggerUse(o.kind, { world: this, player, objectId: o.id }),
          });
          break;
      }
    }
  }

  private bubbleCauldron(o: MapObject): void {
    const x = o.x * TILE;
    const y = o.y * TILE - 150;
    this.add
      .particles(x, y, 'fx-dot', {
        x: { min: -60, max: 60 },
        speedY: { min: -60, max: -25 },
        lifespan: 1400,
        scale: { start: 0.5, end: 1.1 },
        alpha: { start: 0.8, end: 0 },
        tint: [0x9fe0c0, 0xffffff, 0xc9f5de],
        frequency: 160,
      })
      .setDepth(o.y * TILE + 1);
  }

  private spawnNpc(o: MapObject): void {
    const def = character(o.p!.id);
    if (!def.spec) return;
    const npc = new NpcActor(this, def, o.x * TILE, o.y * TILE, { wander: o.p?.wander ?? 1.2, facing: 'down' });
    this.npcs.set(def.id, npc);
    this.actors.push(npc);
    this.interactables.push({
      id: `npc:${def.id}`,
      x: npc.x,
      y: npc.y,
      radius: TILE * 1.25,
      label: 'Talk',
      run: async (player) => {
        const p = this.players[player];
        npc.talking = true;
        npc.lookAtPoint(p);
        p.face(npc.x - p.x, npc.y - p.y);
        try {
          await triggerTalk(def.id, { world: this, player });
        } finally {
          npc.talking = false;
          npc.lookAtPoint(null);
        }
      },
    });
  }

  private spawnPipHome(o: MapObject): void {
    const pip = new PipActor(this, o.x * TILE, o.y * TILE, () => ({ x: o.x * TILE + Math.sin(this.time.now / 900) * 30, y: o.y * TILE }));
    this.pip = pip;
    this.actors.push(pip);
    this.interactables.push({
      id: 'npc:pip',
      x: o.x * TILE,
      y: o.y * TILE,
      radius: TILE * 1.4,
      label: 'Talk',
      run: (player) => triggerTalk('pip', { world: this, player }),
    });
  }

  private spawnGrandma(o: MapObject): void {
    const key = ensureBunnyTexture(this, 'bunny-grandma', GRANDMA);
    const g = new BunnyActor(this, o.x * TILE, o.y * TILE, key, 'warren', { x: o.x * TILE - 20, y: o.y * TILE - 20, w: 40, h: 40 });
    g.sprite.setScale(1.3);
    this.actors.push(g);
    this.bunnies.push(g);
    this.interactables.push({ id: 'npc:grandma', x: g.x, y: g.y, radius: TILE * 1.2, label: 'Talk', run: (player) => triggerTalk('grandma', { world: this, player }) });
  }

  private spawnWildBunnies(o: MapObject): void {
    const area = { x: o.x * TILE, y: o.y * TILE, w: (o.p?.w ?? 6) * TILE, h: (o.p?.h ?? 4) * TILE };
    const n = o.p?.count ?? 5;
    const r = rng(77);
    for (let i = 0; i < n; i++) {
      const fur = WILD_FURS[i % WILD_FURS.length];
      const key = ensureBunnyTexture(this, `bunny-wild-${i % WILD_FURS.length}`, { fur });
      const b = new BunnyActor(this, area.x + r() * area.w, area.y + r() * area.h, key, 'wild', area);
      b.biscuitPos = () => (this.biscuit ? { x: this.biscuit.x, y: this.biscuit.y, moving: this.biscuit.moving } : null);
      this.actors.push(b);
      this.bunnies.push(b);
    }
  }

  private spawnWarren(o: MapObject): void {
    const area = { x: o.x * TILE, y: o.y * TILE, w: (o.p?.w ?? 6) * TILE, h: (o.p?.h ?? 4) * TILE };
    const rescued = app.data?.bunnies ?? [];
    const r = rng(99);
    rescued.forEach((id) => {
      const hb = HOPKINS_BY_ID.get(id);
      if (!hb) return;
      const key = ensureBunnyTexture(this, `bunny-${id}`, hb.look);
      const b = new BunnyActor(this, area.x + r() * area.w, area.y + r() * area.h, key, 'warren', area);
      this.actors.push(b);
      this.bunnies.push(b);
      const it: Interactable = {
        id: `bunny:${id}`,
        x: b.x,
        y: b.y,
        radius: TILE * 0.9,
        label: 'Talk',
        run: async () => {
          b.emote('heart');
          await talk(`hop-${hb.id}`, hb.home);
        },
      };
      this.interactables.push(it);
      this.bunnyInteract.push({ it, b });
    });
  }
  private bunnyInteract: { it: Interactable; b: BunnyActor }[] = [];

  /** Biscuit (and later Pip) come along wherever the players go. */
  private spawnCompanions(): void {
    const d = app.data!;
    const companion = !!d.flags['biscuit:companion'];
    // Between the ferry and Pip's scene Biscuit is "leading the way": after a reload he waits for
    // you at the clocktower door, and he comes inside with you to meet Pip.
    const leading = !companion && !!d.flags['met:biscuit'];
    if (companion || leading) {
      const p1 = this.players[0];
      const b = new BiscuitActor(this, p1.x - TILE * 0.8, p1.y + TILE * 0.2);
      b.setTexture(ensureBiscuitTexture(this, biscuitPieces(d.biscuit.outfit)));
      b.snapToLeader();
      b.onBark = () => audio.sfx('bark');
      b.onStep = () => {
        if (Math.random() < 0.5) audio.sfx(this.surfaceAt(b.x, b.y), { vol: 0.35, pitch: 1.5 });
      };
      this.biscuit = b;
      this.actors.push(b);
      if (leading && this.def.id === 'tockwood') {
        b.x = 30.5 * TILE;
        b.y = 17.9 * TILE;
        b.state = 'sit';
        b.facing = 'down';
        b.play('sit');
        // a friendly bark whenever someone comes near, so kids know where to go
        this.time.addEvent({
          delay: 2600,
          loop: true,
          callback: () => {
            if (app.data?.flags['biscuit:companion'] || b.destroyed) return;
            const near = this.players.some((p) => Math.hypot(p.x - b.x, p.y - b.y) < TILE * 6);
            if (near) {
              b.bark();
              b.emote('exclaim', 700);
            }
          },
        });
      }
    }
    if (d.flags['pip:companion'] && !this.pip) {
      const pip = new PipActor(this, this.players[0].x, this.players[0].y, () => {
        const p = this.players[0];
        return p ? { x: p.x - TILE * 0.9, y: p.y - TILE * 0.2 } : null;
      });
      this.pip = pip;
      this.actors.push(pip);
    }
  }

  /** Spawn Biscuit on demand (used by the opening scene). */
  addBiscuit(x: number, y: number): BiscuitActor {
    if (this.biscuit) return this.biscuit;
    const b = new BiscuitActor(this, x, y);
    b.setTexture(ensureBiscuitTexture(this, biscuitPieces(app.data!.biscuit.outfit)));
    b.onBark = () => audio.sfx('bark');
    b.state = 'stay';
    this.biscuit = b;
    this.actors.push(b);
    return b;
  }

  npc(id: string): NpcActor | undefined {
    return this.npcs.get(id);
  }

  // ------------------------------------------------------------------ digging & sniffing
  buildDigSpots(): void {
    const zones = this.def.digZones;
    const d = app.data;
    if (!zones || !d) return;
    for (const sv of this.spots) {
      sv.img.destroy();
      sv.mound?.destroy();
    }
    this.spots = [];
    this.interactables = this.interactables.filter((i) => !i.id.startsWith('dig:'));
    const spots = availableSpots(spotsForDay(this.def.id, d.day, zones, this.grid, this.coll), d.dug);
    // a guaranteed easy first dig right by the plaza path
    if (this.def.id === 'tockwood' && !d.flags['dug:first']) spots.push({ id: 'tockwood:tutorial', zone: 'plaza', cx: 32, cy: 27, item: 'clock-gear', hidden: false });
    for (const spot of spots) {
      const sx = (spot.cx + 0.5) * TILE;
      const sy = (spot.cy + 0.6) * TILE;
      // a little mound of fresh dirt under the sparkle: readable on sand and on grass
      const mound = this.add.graphics().setDepth((spot.cy + 0.25) * TILE).setVisible(!spot.hidden);
      mound.fillStyle(0x4a3b35, 0.22).fillEllipse(sx, sy + 10, 70, 22);
      mound.fillStyle(0x9a6a45, 1).fillEllipse(sx, sy + 4, 58, 20);
      mound.fillStyle(0xc08a5a, 1).fillEllipse(sx - 4, sy, 36, 11);
      const img = this.add
        .image(sx, sy - 18, 'fx-sparkle')
        .setDepth((spot.cy + 0.3) * TILE)
        .setTint(0xffc83a)
        .setScale(1.25)
        .setVisible(!spot.hidden);
      this.tweens.add({ targets: img, scale: { from: 1, to: 1.6 }, alpha: { from: 0.75, to: 1 }, angle: 45, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const sv: SpotView = { spot, img, mound, revealed: !spot.hidden };
      if (spot.hidden) {
        // hidden treasure: every few seconds a tiny puff of dust gives it away to sharp eyes
        this.time.addEvent({
          delay: 3800 + Math.random() * 2500,
          loop: true,
          callback: () => {
            if (sv.revealed || !img.active) return;
            const puff = this.add.particles(sx, sy, 'fx-dot', { speed: { min: 20, max: 60 }, angle: { min: 230, max: 310 }, lifespan: 700, scale: { start: 0.45, end: 0.1 }, alpha: { start: 0.8, end: 0 }, tint: 0xb89068, emitting: false });
            puff.setDepth(sy + 2);
            puff.explode(5);
            this.time.delayedCall(900, () => puff.destroy());
          },
        });
      }
      this.spots.push(sv);
      this.interactables.push({
        id: `dig:${spot.id}`,
        x: (spot.cx + 0.5) * TILE,
        y: (spot.cy + 0.6) * TILE,
        radius: TILE * 1.1,
        label: 'Dig',
        enabled: () => sv.revealed && !!this.biscuit,
        run: () => this.dig(sv),
      });
    }
  }

  private async dig(sv: SpotView): Promise<void> {
    const b = this.biscuit;
    const d = app.data;
    if (!b || !d || d.dug[sv.spot.id] !== undefined) return;
    d.dug[sv.spot.id] = d.day;
    this.interactables = this.interactables.filter((i) => i.id !== `dig:${sv.spot.id}`);
    b.emote('exclaim', 600);
    audio.sfx('bark');
    const mx = (sv.spot.cx + 0.5) * TILE;
    const my = (sv.spot.cy + 0.6) * TILE;
    await b.digAt(mx, my);
    audio.sfx('dig');
    const dirt = this.add.particles(mx, my, 'fx-dot', {
      speed: { min: 80, max: 220 },
      angle: { min: 200, max: 340 },
      gravityY: 500,
      lifespan: 600,
      scale: { start: 0.6, end: 0.2 },
      tint: 0x9a6a45,
      emitting: false,
    });
    dirt.setDepth(sv.img.depth + 1);
    dirt.explode(14);
    this.time.delayedCall(900, () => dirt.destroy());
    sv.img.destroy();
    sv.mound?.destroy();
    this.spots = this.spots.filter((s) => s !== sv);
    give(sv.spot.item, 1, { from: 'Biscuit dug up...' });
    setFlag('dug:first');
    d.flags['dug:count'] = ((d.flags['dug:count'] as number) ?? 0) + 1;
    b.bark();
  }

  /** B button: Biscuit sniffs and reveals hidden dig spots (and other secrets) nearby. */
  async sniff(): Promise<void> {
    const b = this.biscuit;
    if (!b || b.state === 'busy' || storyBusy()) return;
    audio.sfx('sniff');
    const nearHidden = this.spots.filter((s) => !s.revealed && Math.hypot((s.spot.cx + 0.5) * TILE - b.x, (s.spot.cy + 0.5) * TILE - b.y) < TILE * 6);
    await b.sniff();
    const says = this.soupFx?.biscuitSays(nearHidden.length);
    if (says) this.floatText(b.x, b.y - TILE * 1.1, says, 3200);
    if (nearHidden.length) {
      for (const s of nearHidden) this.revealSpot(s);
      b.faceToward((nearHidden[0].spot.cx + 0.5) * TILE, (nearHidden[0].spot.cy + 0.5) * TILE);
      b.emote('exclaim', 1200);
      b.bark();
      toast(nearHidden.length > 1 ? `Biscuit sniffed out ${nearHidden.length} hidden spots!` : 'Biscuit sniffed out a hidden spot!', { icon: '👃' });
      app.setFlag('sniffed:found');
    } else {
      b.emote('question', 1100);
    }
    this.events.emit('sniff', b);
  }

  private revealSpot(s: SpotView): void {
    if (s.revealed) return;
    s.revealed = true;
    s.img.setVisible(true).setScale(0.1);
    s.mound?.setVisible(true);
    this.tweens.add({ targets: s.img, scale: 1.3, duration: 350, ease: 'Back.easeOut' });
  }

  /** Reveal hidden dig spots within `r` of a point (Biscuit's sniff, Sparkle Stew). */
  revealSpotsNear(x: number, y: number, r: number): number {
    let n = 0;
    for (const s of this.spots) {
      if (s.revealed) continue;
      if (Math.hypot((s.spot.cx + 0.5) * TILE - x, (s.spot.cy + 0.5) * TILE - y) < r) {
        this.revealSpot(s);
        n++;
      }
    }
    return n;
  }

  /** A little speech bubble that floats up and fades (animal chatter, Biscuit's thoughts). */
  floatText(x: number, y: number, text: string, ms = 2600): void {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Fredoka, sans-serif', fontSize: '24px', fontStyle: '600', color: '#4a3b35', backgroundColor: '#fff8ec', padding: { x: 10, y: 6 }, wordWrap: { width: 360 }, align: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(1e6 - 5);
    this.tweens.add({ targets: t, y: y - 40, duration: ms, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: ms - 500, duration: 500, onComplete: () => t.destroy() });
  }

  /** Crops in the cottage garden: seeds, sprouts, leafy plants, then the veg itself. */
  refreshPlots(): void {
    const d = app.data;
    if (!d) return;
    const now = gameNow(d);
    for (const o of this.objects) {
      if (o.kind !== 'plot') continue;
      const i = Number(o.p?.index ?? 0);
      const p = d.garden[i];
      if (!p) continue;
      const info = plotInfo(p, now);
      const key = `${info.state}:${info.stage}:${p.seed ?? ''}`;
      let c = this.plotViews.get(i);
      if (c && c.getData('key') === key) continue;
      if (!c) {
        c = this.add.container(o.x * TILE, o.y * TILE - TILE * 0.35).setDepth(o.y * TILE + 2);
        this.plotViews.set(i, c);
      }
      c.removeAll(true);
      c.setData('key', key);
      if (info.state === 'empty') continue;
      const g = this.add.graphics();
      const xs = [-26, 0, 26];
      if (info.stage === 0) {
        g.fillStyle(0x6b4a30, 1);
        for (const x of xs) g.fillCircle(x, 6, 5);
      } else {
        const tall = info.stage === 1 ? 14 : 30;
        for (const x of xs) {
          g.lineStyle(5, 0x3f8a44, 1).lineBetween(x, 8, x, 8 - tall);
          g.fillStyle(0x7cc47f, 1).lineStyle(3, 0x4a3b35, 1);
          const leaf = info.stage === 1 ? 7 : 12;
          g.fillEllipse(x - leaf * 0.7, 8 - tall * 0.7, leaf * 1.6, leaf);
          g.strokeEllipse(x - leaf * 0.7, 8 - tall * 0.7, leaf * 1.6, leaf);
          g.fillEllipse(x + leaf * 0.7, 8 - tall * 0.9, leaf * 1.6, leaf);
          g.strokeEllipse(x + leaf * 0.7, 8 - tall * 0.9, leaf * 1.6, leaf);
        }
      }
      c.add(g);
      if (info.state === 'thirsty') {
        const drop = this.add.graphics();
        drop.fillStyle(0x6cc4d8, 1).lineStyle(3, 0x4a3b35, 1);
        drop.fillCircle(0, -34, 9).strokeCircle(0, -34, 9);
        drop.fillTriangle(-8, -38, 8, -38, 0, -54);
        c.add(drop);
        this.tweens.add({ targets: drop, y: -8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      if (info.state === 'ready' && p.seed) {
        const tex = `icon-${p.seed}`;
        if (!this.textures.exists(tex)) addCanvasTexture(this, tex, iconCanvas(p.seed, 64));
        for (const x of [-18, 18]) c.add(this.add.image(x, -18, tex).setScale(0.9));
        const sp = this.add.image(0, -44, 'fx-sparkle').setTint(0xffc83a).setScale(0.8);
        c.add(sp);
        this.tweens.add({ targets: sp, angle: 90, scale: 1.2, duration: 800, yoyo: true, repeat: -1 });
      }
    }
  }

  /** Walk the party to spots (tile units) for a scene — e.g. onto the rug in front of Pip. */
  async stageParty(spots: { x: number; y: number }[], biscuitSpot?: { x: number; y: number }): Promise<void> {
    const moves = this.players.map((p, i) => {
      const to = spots[Math.min(i, spots.length - 1)];
      const tx = to.x * TILE + (i >= spots.length ? TILE * 0.8 : 0);
      const ty = to.y * TILE;
      return new Promise<void>((res) =>
        this.tweens.add({
          targets: p,
          x: tx,
          y: ty,
          duration: 650,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            p.face(tx - p.x, ty - p.y);
            p.tick(16, true);
          },
          onComplete: () => {
            p.facing = 'up';
            p.tick(16, false);
            res();
          },
        }),
      );
    });
    if (biscuitSpot && this.biscuit) moves.push(this.biscuit.goTo(biscuitSpot.x * TILE, biscuitSpot.y * TILE, TILE * 5).catch(() => undefined));
    await Promise.all(moves);
  }

  /** Swap a closed chest prop for an open one. */
  openChestProp(id: string): void {
    const img = this.propImages.get(id);
    if (img && this.textures.exists('prop-chest-open')) img.setTexture('prop-chest-open');
  }

  /** Hopscotch Chowder: bound up onto a high ledge, grab what's there, bound back down. */
  private async hopUp(o: MapObject, player: 0 | 1): Promise<void> {
    const p = this.players[player];
    if (!p || storyBusy()) return;
    if (!hasEffect('hop')) {
      await talk('narrator', ['It’s much too high to climb.', 'If only you could jump like a bunny... (Hmm — Clover’s Hopscotch Chowder?)']);
      return;
    }
    await cutscene(() => this.doHop(o, p));
  }

  private async doHop(o: MapObject, p: PlayerEntity): Promise<void> {
    const flagKey = String(o.p?.flag ?? `ledge:${o.id}`);
    p.jumping = true;
    const sx = p.x;
    const sy = p.y;
    const topY = o.y * TILE - TILE * Number(o.p?.height ?? 1.9);
    const jump = (fromY: number, toY: number) =>
      new Promise<void>((res) => {
        audio.sfx('hop');
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 520,
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 0;
            p.x = sx + (o.x * TILE - sx) * (fromY === sy ? t : 1 - t);
            p.hop = (fromY - toY) * (fromY === sy ? t : 1 - t) + Math.sin(t * Math.PI) * 70;
          },
          onComplete: () => res(),
        });
      });
    await jump(sy, topY);
    const d = app.data!;
    if (!d.flags[flagKey]) {
      d.flags[flagKey] = true;
      const item = String(o.p?.item ?? 'golden-acorn');
      give(item, 1, { from: 'On top of the rock you found' });
      if (o.p?.tockens) {
        d.tockens += Number(o.p.tockens);
        toast(`+${o.p.tockens} Tockens`, { icon: '🪙' });
      }
    } else this.floatText(p.x, p.y - p.hop - TILE * 1.4, 'What a view!', 1800);
    await new Promise((r) => this.time.delayedCall(900, r));
    await jump(topY, sy);
    p.x = sx;
    p.y = sy;
    p.hop = 0;
    p.jumping = false;
  }

  // ------------------------------------------------------------------ lighting (day/night)
  private buildLighting(): void {
    if (!this.usesClock) return;
    this.overlay = this.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0).setDepth(1e5).setBlendMode(Phaser.BlendModes.MULTIPLY);
    for (const o of this.objects) {
      if (o.kind !== 'lamp') continue;
      const l = this.add
        .image(o.x * TILE, o.y * TILE - TILE * 1.6, 'fx-light')
        .setScale(2.4)
        .setTint(0xffd98a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(1e5 + 1)
        .setAlpha(0);
      this.lamps.push(l);
    }
    const r = rng(5);
    const zones = (this.def.zones ?? []).filter((z) => z.id === 'meadow' || z.id === 'woods' || z.id === 'plaza');
    for (let i = 0; i < 28 && zones.length; i++) {
      const z = zones[i % zones.length];
      const base = { x: (z.x + r() * z.w) * TILE, y: (z.y + r() * z.h) * TILE };
      const img = this.add.image(base.x, base.y, 'fx-dot').setTint(0xf6ff9a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.45).setDepth(1e5 + 2).setAlpha(0);
      this.fireflies.push({ img, base, ph: r() * 10 });
    }
    this.updateLighting();
  }

  private updateLighting(): void {
    if (!this.overlay || !app.data) return;
    const m = app.data.minutes;
    const v = this.cameras.main.worldView;
    this.overlay.setPosition(v.x - 50, v.y - 50).setSize(v.width + 100, v.height + 100);
    this.overlay.setFillStyle(tint(m));
    const n = nightAmount(m);
    const t = this.time.now / 1000;
    this.lamps.forEach((l, i) => l.setAlpha(n * (0.85 + Math.sin(t * 7 + i) * 0.05)));
    for (const f of this.fireflies) {
      f.img.setPosition(f.base.x + Math.sin(t * 0.7 + f.ph) * 60, f.base.y + Math.cos(t * 0.9 + f.ph * 1.3) * 40);
      f.img.setAlpha(n * (0.5 + 0.5 * Math.sin(t * 3 + f.ph * 5)));
    }
  }

  get isNight(): boolean {
    return this.usesClock && nightAmount(app.data?.minutes ?? 600) > 0.6;
  }

  // ------------------------------------------------------------------ doors & map changes
  private enterDoor(o: MapObject): void {
    const door = String(o.p?.door ?? '');
    if (o.id === 'bowling' && !app.data?.flags['bowling:open']) {
      audio.sfx('error');
      void talk('narrator', ['A sign on the door says: "TOCKWOOD LANES — opening soon! Bowling pins on order from... the 1950s?"']);
      return;
    }
    audio.sfx('door');
    this.goTo(door.replace(/-in$/, ''), 'in');
  }

  /** Move the whole party to another map (fade, save, rebuild). */
  goTo(mapId: string, spawn: string): void {
    if (this.transitioning) return;
    let def: MapDef;
    try {
      def = getMap(mapId);
    } catch {
      toast('That way is closed for now.', { icon: '🚧' });
      return;
    }
    this.transitioning = true;
    const sp = def.spawns[spawn] ?? Object.values(def.spawns)[0];
    const d = app.data!;
    d.location = { map: mapId, x: sp.x, y: sp.y };
    app.autosave.request();
    this.cameras.main.fadeOut(260, 255, 244, 224);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ map: mapId, spawn });
    });
  }

  private checkExits(): void {
    if (this.transitioning || !this.def.exits || ui.blocking) return;
    for (const ex of this.def.exits) {
      for (const p of this.players) {
        if (p.x >= ex.x * TILE && p.x < (ex.x + ex.w) * TILE && p.y >= ex.y * TILE && p.y < (ex.y + ex.h) * TILE) {
          audio.sfx('door');
          this.goTo(ex.to, ex.spawn);
          return;
        }
      }
    }
  }

  private checkZones(): void {
    const zones = this.def.zones;
    if (!zones || !app.data) return;
    for (const z of zones) {
      const inside = this.players.some((p) => p.x >= z.x * TILE && p.x < (z.x + z.w) * TILE && p.y >= z.y * TILE && p.y < (z.y + z.h) * TILE);
      const was = this.zoneState.get(z.id) ?? false;
      if (inside && !was) {
        if (!app.data.flags[`visited:${z.id}`]) app.setFlag(`visited:${z.id}`);
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
    if (this.def.music === 'tockwood') audio.music(this.isNight ? 'tockwood-night' : 'tockwood-day');
    else audio.music(this.def.music);
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
      this.biscuit?.bark();
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
    if (this.biscuit) this.biscuit.setTexture(ensureBiscuitTexture(this, biscuitPieces(app.data!.biscuit.outfit)));
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
    // phones are short: let the shared camera pull back a bit further so two players have room
    const minZoom = base * (hud.touch?.isShown ? 0.6 : 0.72);
    // With on-screen touch controls, keep players clear of the HUD band and the button band.
    let extraTop = 0;
    let extraBottom = 0;
    if (hud.touch?.isShown) {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const toWorld = (css: number) => (css / this.scale.zoom) / minZoom;
      extraTop = toWorld(rem * 2.7);
      extraBottom = toWorld(rem * 4.4);
    }
    return {
      viewW: this.scale.width,
      viewH: this.scale.height,
      baseZoom: base,
      minZoom,
      marginX: TILE * 1.1,
      marginTop: TILE * 1.9 + extraTop,
      marginBottom: TILE * 0.8 + extraBottom,
    };
  }

  private onResize(): void {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.applyCamera(true);
  }

  private applyCamera(snap = false, dt = 1 / 60): void {
    const cam = this.cameras.main;
    const pts = this.players.map((p) => ({ x: p.x, y: p.y - TILE * 0.5 }));
    const target = midpoint(pts);
    const zTarget = frameZoom(pts, this.frameOpts());
    // Smoothing that feels the same at any frame rate (tuned at 60 fps).
    const kz = snap ? 1 : 1 - Math.pow(1 - 0.12, dt * 60);
    const kc = snap ? 1 : 1 - Math.pow(1 - 0.14, dt * 60);
    this.camZoom += (zTarget - this.camZoom) * kz;
    // Zooming out never lags: the camera is never closer than it needs to be to show everyone.
    if (this.camZoom > zTarget) this.camZoom = zTarget;
    this.camCenter.x += (target.x - this.camCenter.x) * kc;
    this.camCenter.y += (target.y - this.camCenter.y) * kc;
    const viewW = this.scale.width / this.camZoom;
    const viewH = this.scale.height / this.camZoom;
    // ...and even on a slow frame, every player stays inside the view.
    const mx = TILE * 0.55;
    for (const p of pts) {
      this.camCenter.x = Phaser.Math.Clamp(this.camCenter.x, p.x + mx - viewW / 2, p.x - mx + viewW / 2);
      this.camCenter.y = Phaser.Math.Clamp(this.camCenter.y, p.y + TILE * 0.7 - viewH / 2, p.y - TILE * 0.7 + viewH / 2);
    }
    const cx = this.mapW > viewW ? Phaser.Math.Clamp(this.camCenter.x, viewW / 2, this.mapW - viewW / 2) : this.mapW / 2;
    const cy = this.mapH > viewH ? Phaser.Math.Clamp(this.camCenter.y, viewH / 2, this.mapH - viewH / 2) : this.mapH / 2;
    cam.setZoom(this.camZoom);
    cam.centerOn(cx, cy);
  }

  isOnScreen(x: number, y: number, pad = 0): boolean {
    const v = this.cameras.main.worldView;
    return x >= v.x - pad && x <= v.right + pad && y >= v.y - pad && y <= v.bottom + pad;
  }

  // ------------------------------------------------------------------ prompts & interaction
  private buildPrompt(): void {
    for (let i = 0; i < 2; i++) {
      const bg = this.add.graphics();
      const text = this.add.text(0, 0, '', { fontFamily: 'Fredoka, sans-serif', fontSize: '26px', fontStyle: '600', color: '#4a3b35' }).setOrigin(0.5);
      const box = this.add.container(0, 0, [bg, text]).setDepth(1e6).setVisible(false);
      this.prompts.push({ box, text, bg, label: '' });
    }
  }

  private hidePrompts(): void {
    for (const p of this.prompts) p.box.setVisible(false);
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

  /** One floating action bubble per player ("E Talk" for P1, "/ Read" for P2). */
  private updatePrompt(): void {
    const targets: (Interactable | null)[] = this.players.map((p) => this.nearestInteractable(p));
    this.players.forEach((p, i) => hud.setActionLabel(p.index, targets[i] ? targets[i]!.label : null));
    this.focusTarget = targets.find((t) => t) ?? null;
    const s = 1 / this.camZoom;
    const screenScale = Math.min(1.25, this.scale.height / 900 + 0.35);
    this.prompts.forEach((pr, i) => {
      const it = targets[i] ?? null;
      // if both players look at the same thing, one bubble is enough
      const dup = i === 1 && it && targets[0] === it;
      if (!it || dup) {
        pr.box.setVisible(false);
        return;
      }
      const glyph = this.keyGlyph(i as 0 | 1);
      const label = glyph ? `${glyph}  ${it.label}` : it.label;
      if (pr.label !== label) {
        pr.label = label;
        pr.text.setText(label);
        const w = pr.text.width + 34;
        const h = 46;
        const fill = i === 1 && this.players.length > 1 ? 0xe3f2fb : 0xfff8ec;
        pr.bg.clear();
        pr.bg.fillStyle(fill, 1).lineStyle(4, 0x4a3b35, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 22).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
        if (glyph) {
          pr.bg.fillStyle(i === 1 ? 0x6fb3e0 : 0xf7c65a, 1).fillCircle(-w / 2 + 26, 0, 16).lineStyle(3, 0x4a3b35).strokeCircle(-w / 2 + 26, 0, 16);
          pr.text.setX(4);
        } else pr.text.setX(0);
      }
      pr.box.setScale(s * screenScale);
      pr.text.setResolution(Math.min(3, this.camZoom * screenScale * 1.5));
      const sameSpot = i === 1 && targets[0] && Math.hypot(targets[0].x - it.x, targets[0].y - it.y) < TILE;
      pr.box.setPosition(it.x, it.y - TILE * (sameSpot ? 2.5 : 1.9) + Math.sin(this.time.now / 250 + i) * 4);
      pr.box.setVisible(true);
    });
  }

  /** Fade buildings/trees that a player (or Biscuit) is standing behind, so nobody gets lost. */
  private updateOcclusion(): void {
    const who = this.players.map((p) => ({ x: p.x, y: p.y }));
    if (this.biscuit) who.push({ x: this.biscuit.x, y: this.biscuit.y });
    for (const o of this.occluders) {
      const b = o.img.getBounds();
      const hidden = who.some((p) => p.y < o.baseY - 4 && p.x > b.x + 10 && p.x < b.right - 10 && p.y - TILE * 0.6 > b.y && p.y - TILE * 0.3 < b.bottom);
      const target = hidden ? 0.45 : 1;
      if (Math.abs(o.img.alpha - target) > 0.01) o.img.setAlpha(o.img.alpha + (target - o.img.alpha) * 0.2);
    }
  }

  // ------------------------------------------------------------------ frame update
  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 100) / 1000;
    const blocked = ui.blocking || this.transitioning;
    const prev: Pt[] = this.players.map((p) => ({ x: p.x, y: p.y }));
    const next: Pt[] = [];
    this.players.forEach((p, i) => {
      const pad = input.p[i];
      const mx = blocked ? 0 : pad.x;
      const my = blocked ? 0 : pad.y;
      const speed = PlayerEntity.SPEED * p.speedMult;
      const dx = mx * speed * dt;
      const dy = my * speed * dt;
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
    for (const a of this.actors) a.update(dt);
    for (const it of this.interactables) {
      if (it.id.startsWith('npc:')) {
        const n = this.npcs.get(it.id.slice(4));
        if (n) {
          it.x = n.x;
          it.y = n.y;
        }
      }
    }
    for (const { it, b } of this.bunnyInteract) {
      it.x = b.x;
      it.y = b.y;
    }
    this.drawTether();
    this.applyCamera(false, dt);
    this.soupFx.update(dt);
    this.plotTimer += dt;
    if (this.plotTimer > 1.5) {
      this.plotTimer = 0;
      this.refreshPlots();
    }
    this.checkZones();
    this.checkExits();
    this.tickClock(deltaMs);
    this.updateLighting();
    this.updateOcclusion();
    if (!blocked) {
      this.updatePrompt();
      for (const p of this.players) {
        const pad = input.p[p.index];
        // ui.locked: a menu/dialogue just closed — don't let the same press re-trigger something.
        if (pad.aPressed && !ui.locked && !storyBusy()) {
          const it = this.nearestInteractable(p);
          if (it) void Promise.resolve(it.run(p.index)).catch(quietCancel);
        }
        if (pad.bPressed && !ui.locked) void this.sniff();
      }
    } else this.hidePrompts();
  }

  private tickClock(deltaMs: number): void {
    const d = app.data;
    if (!d || this.def.region !== 'tockwood') return;
    if (!ui.blocking) {
      const wasNight = this.isNight;
      if (advance(d, deltaMs * (this.soupFx?.clockRate() ?? 1))) {
        toast(`A new day in Tockwood! ☀️ Day ${d.day}`, { icon: '🐓', ms: 3000 });
        this.buildDigSpots();
        app.events.emit('new-day', d.day);
      }
      if (wasNight !== this.isNight) this.playMusic();
    }
    const minute = Math.floor(d.minutes);
    if (minute !== this.lastHudMinute) {
      this.lastHudMinute = minute;
      hud.setClock(`${timeIcon(d.minutes)} ${formatTime(d.minutes)} · Day ${d.day}`);
    }
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
    if (!d || !p || this.transitioning) return;
    d.location = { map: this.def.id, x: +(p.x / TILE).toFixed(2), y: +(p.y / TILE).toFixed(2) };
  }

  /** Current dig spots (tests / map screen). */
  digSpots(): { id: string; cx: number; cy: number; revealed: boolean; item: string }[] {
    return this.spots.map((s) => ({ id: s.spot.id, cx: s.spot.cx, cy: s.spot.cy, revealed: s.revealed, item: s.spot.item }));
  }
}
