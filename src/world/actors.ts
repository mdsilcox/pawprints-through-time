import Phaser from 'phaser';
import { Cancelled } from '../core/session';
import { TILE, type CollisionGrid } from './collision';
import { FEET_Y, FH } from '../art/character';
import { CW, CH, type CorgiFrame } from '../art/corgi';
import { BW, BH, type BunnyFrame } from '../art/bunny';
import type { Emote } from '../art/emotes';
import type { CharacterDef } from '../data/characters';
import { ensureCharacterTexture } from '../art/textures';

/** What actors need from the scene that owns them. */
export interface ActorHost {
  readonly phaserScene: Phaser.Scene;
  coll: CollisionGrid;
  playerPositions(): { x: number; y: number; moving: boolean }[];
}

export type Dir4 = 'down' | 'up' | 'left' | 'right';

/** Base for anything that walks around with a sprite, a shadow and an optional emote bubble. */
export abstract class Actor {
  readonly container: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  private emoteImg: Phaser.GameObjects.Image | null = null;
  x: number;
  y: number;
  facing: Dir4 = 'down';
  moving = false;
  animT = 0;
  lift = 0; // visual hop height
  protected hw = TILE * 0.2;
  protected hh = TILE * 0.12;
  destroyed = false;

  constructor(
    protected host: ActorHost,
    x: number,
    y: number,
    texture: string,
    originY: number,
    shadowScale = 1,
  ) {
    const s = host.phaserScene;
    this.x = x;
    this.y = y;
    this.shadow = s.add.image(0, 0, 'fx-shadow').setScale(shadowScale, shadowScale * 0.9);
    this.sprite = s.add.image(0, 0, texture).setOrigin(0.5, originY);
    this.container = s.add.container(x, y, [this.shadow, this.sprite]);
  }

  get scene(): Phaser.Scene {
    return this.host.phaserScene;
  }

  /** Try to move by (dx, dy) with collision; returns true if it actually moved. */
  step(dx: number, dy: number): boolean {
    const r = this.host.coll.move({ x: this.x, y: this.y, hw: this.hw, hh: this.hh }, dx, dy);
    const moved = Math.abs(r.x - this.x) + Math.abs(r.y - this.y) > 0.3;
    this.x = r.x;
    this.y = r.y;
    return moved;
  }

  /** Walk toward a point at `speed` (units/s). Returns remaining distance. */
  walkToward(tx: number, ty: number, speed: number, dt: number): number {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      this.moving = false;
      return d;
    }
    const k = Math.min(1, (speed * dt) / d);
    this.moving = this.step(dx * k, dy * k);
    this.faceVec(dx, dy);
    return Math.hypot(tx - this.x, ty - this.y);
  }

  faceVec(dx: number, dy: number): void {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
  }

  faceToward(x: number, y: number): void {
    this.faceVec(x - this.x, y - this.y);
  }

  emote(kind: Emote, ms = 1600): void {
    this.emoteImg?.destroy();
    const img = this.scene.add.image(0, this.emoteY(), `emote-${kind}`).setScale(0.2);
    this.container.add(img);
    this.emoteImg = img;
    this.scene.tweens.add({ targets: img, scale: 1.05, duration: 260, ease: 'Back.easeOut' });
    this.scene.time.delayedCall(ms, () => {
      if (this.emoteImg !== img) return;
      this.scene.tweens.add({
        targets: img,
        alpha: 0,
        scale: 0.6,
        duration: 220,
        onComplete: () => img.destroy(),
      });
      this.emoteImg = null;
    });
  }

  protected emoteY(): number {
    return -150;
  }

  /** Called every frame by the scene. */
  abstract update(dt: number): void;

  sync(): void {
    this.container.setPosition(this.x, this.y);
    this.sprite.y = -this.lift;
    this.container.setDepth(this.y);
    const s = 1 - this.lift / 260;
    this.shadow.setScale(this.shadow.scaleX > 0 ? Math.abs(s) : s, s * 0.9);
  }

  destroy(): void {
    this.destroyed = true;
    this.container.destroy();
  }
}

// ======================================================================= neighbours / era folk
export class NpcActor extends Actor {
  home: { x: number; y: number };
  wander: number;
  talking = false;
  private idleUntil = 0;
  private target: { x: number; y: number } | null = null;
  private lookAt: { x: number; y: number } | null = null;
  textureKey: string;

  constructor(
    host: ActorHost,
    readonly def: CharacterDef,
    x: number,
    y: number,
    opts: { wander?: number; facing?: Dir4 } = {},
  ) {
    const key = `npc-${def.id}`;
    ensureCharacterTexture(host.phaserScene, key, def.spec!);
    super(host, x, y, key, FEET_Y / FH, 1.1);
    this.textureKey = key;
    this.home = { x, y };
    this.wander = (opts.wander ?? 1.5) * TILE;
    this.facing = opts.facing ?? 'down';
    this.hw = TILE * 0.24;
    this.idleUntil = performance.now() + 1500 + Math.random() * 3000;
    this.applyFrame();
    this.sync();
  }

  /** Stop and look at someone (e.g. during conversation). */
  lookAtPoint(p: { x: number; y: number } | null): void {
    this.lookAt = p;
    if (p) this.faceToward(p.x, p.y);
  }

  /** Strike a dance pose for a moment (parties!). */
  dance(frame: string, ms: number): void {
    this.danceFrame = frame;
    this.danceUntil = performance.now() + ms;
  }
  private danceFrame: string | null = null;
  private danceUntil = 0;

  update(dt: number): void {
    const now = performance.now();
    if (now < this.danceUntil && this.danceFrame) {
      this.moving = false;
      this.sprite.setTexture(this.textureKey, this.danceFrame);
      this.sprite.setFlipX(false);
      this.sync();
      return;
    }
    if (this.talking || this.lookAt) {
      this.moving = false;
      if (this.lookAt) this.faceToward(this.lookAt.x, this.lookAt.y);
    } else if (this.wander > 0) {
      if (this.target) {
        const left = this.walkToward(this.target.x, this.target.y, TILE * 1.5, dt);
        if (left < 4 || !this.moving) {
          this.target = null;
          this.moving = false;
          this.idleUntil = now + 2000 + Math.random() * 4000;
        }
      } else if (now > this.idleUntil) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * this.wander;
        this.target = { x: this.home.x + Math.cos(a) * r, y: this.home.y + Math.sin(a) * r * 0.6 };
      } else {
        // glance at nearby players
        const near = this.host.playerPositions().find((p) => Math.hypot(p.x - this.x, p.y - this.y) < TILE * 2);
        if (near) this.faceToward(near.x, near.y);
      }
    }
    this.animT = this.moving ? this.animT + dt * 1000 : 0;
    this.applyFrame();
    this.sync();
  }

  private applyFrame(): void {
    const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    const pose = this.moving ? (Math.floor(this.animT / 280) % 2 ? 'walkB' : 'walkA') : 'idle';
    this.sprite.setTexture(this.textureKey, `${dir}-${pose}`);
    this.sprite.setFlipX(this.facing === 'left');
  }

  /** Friendly wave (used for greetings). */
  wave(ms = 900): void {
    this.sprite.setTexture(this.textureKey, 'wave');
    this.talking = true;
    this.scene.time.delayedCall(ms, () => {
      this.talking = false;
    });
  }
}

// ======================================================================= Biscuit
type BiscuitState = 'follow' | 'busy' | 'lead' | 'sit' | 'stay';

export class BiscuitActor extends Actor {
  state: BiscuitState = 'follow';
  private idleT = 0;
  private stuckT = 0;
  private frameOverride: CorgiFrame | null = null;
  private leadTarget: { x: number; y: number } | null = null;
  textureKey = 'biscuit';
  speedMult = 1;
  onBark: (() => void) | null = null;
  onStep: (() => void) | null = null;
  private lastStep = -1;

  constructor(host: ActorHost, x: number, y: number) {
    super(host, x, y, 'biscuit', 88 / CH, 0.95);
    this.hw = TILE * 0.2;
    this.hh = TILE * 0.1;
    this.sync();
  }

  setTexture(key: string): void {
    this.textureKey = key;
  }

  protected emoteY(): number {
    return -110;
  }

  private leader(): { x: number; y: number; facing?: Dir4 } | null {
    const ps = this.host.playerPositions();
    if (!ps.length) return null;
    const x = ps.reduce((s, p) => s + p.x, 0) / ps.length;
    const y = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    return { x, y };
  }

  /** Teleport next to the players (after map changes or getting stuck). */
  snapToLeader(): void {
    const l = this.leader();
    if (!l) return;
    for (const [ox, oy] of [
      [-0.8, 0.3],
      [0.8, 0.3],
      [0, 0.7],
      [0, -0.6],
      [0, 0],
    ]) {
      const nx = l.x + ox * TILE;
      const ny = l.y + oy * TILE;
      if (!this.host.coll.overlaps({ x: nx, y: ny, hw: this.hw, hh: this.hh })) {
        this.x = nx;
        this.y = ny;
        break;
      }
    }
    this.sync();
  }

  play(frame: CorgiFrame | null): void {
    this.frameOverride = frame;
    this.applyFrame();
  }

  /** Walk to a point (for scripted scenes); resolves on arrival. */
  async goTo(x: number, y: number, speed = TILE * 4): Promise<void> {
    this.state = 'lead';
    this.leadSpeed = speed;
    this.leadTarget = { x, y };
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (this.destroyed) return reject(new Cancelled());
        if (!this.leadTarget || Math.hypot(this.x - x, this.y - y) < 8) return resolve();
        this.scene.time.delayedCall(80, check);
      };
      check();
    });
    this.leadTarget = null;
    this.state = 'stay';
  }
  private leadSpeed = TILE * 4;

  resumeFollow(): void {
    this.state = 'follow';
    this.leadTarget = null;
    this.frameOverride = null;
  }

  update(dt: number): void {
    if (this.state === 'busy' || this.state === 'sit') {
      this.moving = false;
    } else if (this.state === 'lead' && this.leadTarget) {
      const before = { x: this.x, y: this.y };
      const left = this.walkToward(this.leadTarget.x, this.leadTarget.y, this.leadSpeed, dt);
      if (left < 8) this.moving = false;
      if (Math.hypot(this.x - before.x, this.y - before.y) < 0.2 && left > 8) {
        this.stuckT += dt;
        if (this.stuckT > 0.8) {
          // hop over whatever is in the way
          this.x += (this.leadTarget.x - this.x) * 0.3;
          this.y += (this.leadTarget.y - this.y) * 0.3;
          this.stuckT = 0;
        }
      } else this.stuckT = 0;
    } else if (this.state === 'follow') {
      const l = this.leader();
      if (l) {
        const d = Math.hypot(l.x - this.x, l.y - this.y);
        if (d > TILE * 7.5) {
          this.snapToLeader();
          this.emote('exclaim', 700);
        } else if (d > TILE * 1.15) {
          const speed = Math.min(TILE * 5.6, Math.max(TILE * 2.4, d * 2.4)) * this.speedMult;
          const tx = l.x + (this.x < l.x ? -0.75 : 0.75) * TILE;
          const ty = l.y + 0.25 * TILE;
          const before = { x: this.x, y: this.y };
          this.walkToward(tx, ty, speed, dt);
          if (Math.hypot(this.x - before.x, this.y - before.y) < 0.3) {
            this.stuckT += dt;
            if (this.stuckT > 1.2) {
              this.snapToLeader();
              this.stuckT = 0;
            }
          } else this.stuckT = 0;
          this.idleT = 0;
        } else {
          this.moving = false;
          this.idleT += dt;
          if (this.idleT > 0.4) this.faceToward(l.x, l.y);
        }
      }
    } else {
      this.moving = false;
    }
    this.animT = this.moving ? this.animT + dt * 1000 : 0;
    const stepFrame = this.moving ? Math.floor(this.animT / 150) : -1;
    if (stepFrame !== this.lastStep && stepFrame >= 0 && stepFrame % 2 === 0) this.onStep?.();
    this.lastStep = stepFrame;
    this.applyFrame();
    this.sync();
  }

  private applyFrame(): void {
    let frame: CorgiFrame;
    if (this.frameOverride) frame = this.frameOverride;
    else if (this.moving) {
      const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
      frame = `${dir}-${Math.floor(this.animT / 150) % 2 ? 'walkB' : 'walkA'}` as CorgiFrame;
    } else if (this.idleT > 5) frame = 'sit';
    else {
      const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
      frame = `${dir}-idle` as CorgiFrame;
    }
    this.sprite.setTexture(this.textureKey, frame);
    const sideish = frame.startsWith('side') || frame.startsWith('dig') || frame === 'sniff' || frame === 'bark';
    this.sprite.setFlipX(sideish && this.facing === 'left');
  }

  /** Happy bark with a little jump. */
  bark(): void {
    this.onBark?.();
    const prev = this.frameOverride;
    this.play('bark');
    this.scene.tweens.add({ targets: this, lift: 16, duration: 120, yoyo: true, ease: 'Quad.easeOut', onUpdate: () => this.sync() });
    this.scene.time.delayedCall(420, () => this.play(prev));
  }

  /** Sniff animation; resolves after ~1.2s. */
  async sniff(): Promise<void> {
    const prevState = this.state;
    this.state = 'busy';
    this.play('sniff');
    await new Promise((r) => this.scene.time.delayedCall(1100, r));
    this.play(null);
    this.state = prevState === 'busy' ? 'follow' : prevState;
  }

  /** Run to a spot and dig; resolves when the digging is done. */
  async digAt(x: number, y: number): Promise<void> {
    this.state = 'lead';
    this.leadTarget = { x: x - TILE * 0.5, y: y + 4 };
    this.leadSpeed = TILE * 5;
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.destroyed || !this.leadTarget) return resolve();
        if (Math.hypot(this.x - this.leadTarget.x, this.y - this.leadTarget.y) < 10 || performance.now() - t0 > 2500) return resolve();
        this.scene.time.delayedCall(60, check);
      };
      check();
    });
    if (performance.now() - t0 > 2500) {
      this.x = x - TILE * 0.5;
      this.y = y + 4;
    }
    this.leadTarget = null;
    this.state = 'busy';
    this.facing = 'right';
    for (let i = 0; i < 6; i++) {
      this.play(i % 2 ? 'dig-B' : 'dig-A');
      await new Promise((r) => this.scene.time.delayedCall(130, r));
    }
    this.play('happy');
    await new Promise((r) => this.scene.time.delayedCall(350, r));
    this.play(null);
    this.state = 'follow';
  }
}

// ======================================================================= bunnies
export type BunnyMode = 'wild' | 'warren' | 'lost';

export class BunnyActor extends Actor {
  private next = 0;
  private hopping = false;
  private fleeing = 0;
  /** how many times this bunny has fled (tests) */
  flees = 0;
  private sleeping = false;
  private waved = 0;
  area: { x: number; y: number; w: number; h: number };
  textureKey: string;
  /** moved by the world (a roller-skating cousin), not by its own hopping */
  skating = false;
  /** warren bunnies nap now and then — but nobody naps at a party */
  naps = true;
  biscuitPos: () => { x: number; y: number; moving: boolean } | null = () => null;

  constructor(
    host: ActorHost,
    x: number,
    y: number,
    texture: string,
    readonly mode: BunnyMode,
    area?: { x: number; y: number; w: number; h: number },
  ) {
    super(host, x, y, texture, 66 / BH, 0.55);
    this.textureKey = texture;
    this.hw = TILE * 0.14;
    this.hh = TILE * 0.08;
    this.area = area ?? { x: x - TILE * 2, y: y - TILE * 2, w: TILE * 4, h: TILE * 4 };
    this.next = performance.now() + Math.random() * 3000;
    this.frame('sit');
    this.facing = Math.random() < 0.5 ? 'left' : 'right';
    this.sync();
  }

  protected emoteY(): number {
    return -90;
  }

  frame(f: BunnyFrame): void {
    if (this.destroyed) return;
    this.sprite.setTexture(this.textureKey, f);
    this.sprite.setFlipX(this.facing === 'left' && (f === 'sit' || f === 'hopA' || f === 'hopB' || f === 'sleep'));
  }

  private hopTo(tx: number, ty: number, fast = false): void {
    if (this.hopping) return;
    this.hopping = true;
    this.sleeping = false;
    this.faceVec(tx - this.x, 0);
    const sx = this.x;
    const sy = this.y;
    const dur = fast ? 230 : 380;
    this.frame('hopA');
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: dur,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const nx = sx + (tx - sx) * t;
        const ny = sy + (ty - sy) * t;
        if (!this.host.coll.overlaps({ x: nx, y: ny, hw: this.hw, hh: this.hh })) {
          this.x = nx;
          this.y = ny;
        }
        this.lift = Math.sin(t * Math.PI) * (fast ? 22 : 16);
        this.frame(t < 0.5 ? 'hopB' : 'hopA');
        this.sync();
      },
      onComplete: () => {
        this.lift = 0;
        this.hopping = false;
        this.frame('sit');
        this.sync();
      },
    });
  }

  update(): void {
    if (this.destroyed || this.skating) return;
    const now = performance.now();
    const threats = [...this.host.playerPositions()];
    const b = this.biscuitPos();
    if (b) threats.push(b);
    // wild bunnies scatter when Biscuit (or anyone) dashes close by — and always come back
    if (this.mode === 'wild') {
      const scary = threats.find((t) => t.moving && Math.hypot(t.x - this.x, t.y - this.y) < TILE * (t === b ? 2.6 : 1.6));
      if (scary && !this.hopping) {
        const dx = this.x - scary.x;
        const dy = this.y - scary.y;
        const d = Math.hypot(dx, dy) || 1;
        this.fleeing = now + 2500;
        this.flees++;
        this.hopTo(this.x + (dx / d) * TILE * 1.3, this.y + (dy / d) * TILE * 0.9, true);
        if (Math.random() < 0.3) this.emote('exclaim', 600);
        return;
      }
    }
    if (this.mode === 'warren' || this.mode === 'lost') {
      const near = threats.find((t) => t !== b && Math.hypot(t.x - this.x, t.y - this.y) < TILE * 2);
      if (near && now > this.waved && !this.hopping) {
        this.waved = now + 6000;
        this.sleeping = false;
        this.frame('wave');
        this.emote('heart', 1200);
        this.next = now + 1500;
        return;
      }
    }
    if (this.hopping || now < this.next) return;
    const outside = this.x < this.area.x || this.x > this.area.x + this.area.w || this.y < this.area.y || this.y > this.area.y + this.area.h;
    if (outside || now < this.fleeing) {
      // hop back home
      const cx = this.area.x + this.area.w / 2;
      const cy = this.area.y + this.area.h / 2;
      const dx = cx - this.x;
      const dy = cy - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (now > this.fleeing) this.hopTo(this.x + (dx / d) * Math.min(d, TILE), this.y + (dy / d) * Math.min(d, TILE));
      this.next = now + 450;
      return;
    }
    const r = Math.random();
    if (this.mode === 'warren' && this.naps && r < 0.15) {
      this.sleeping = true;
      this.frame('sleep');
      this.emote('zzz', 2500);
      this.next = now + 5000 + Math.random() * 4000;
    } else if (r < 0.6) {
      const tx = this.area.x + Math.random() * this.area.w;
      const ty = this.area.y + Math.random() * this.area.h;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.hopTo(this.x + (dx / d) * Math.min(d, TILE * 0.9), this.y + (dy / d) * Math.min(d, TILE * 0.9));
      this.next = now + 500 + Math.random() * 900;
    } else {
      if (!this.sleeping) this.frame(Math.random() < 0.5 ? 'sit' : 'front');
      this.next = now + 1200 + Math.random() * 2500;
    }
  }
}

// ======================================================================= Pip (floating fairy)
export class PipActor extends Actor {
  private t = Math.random() * 10;
  anchor: () => { x: number; y: number } | null;

  constructor(host: ActorHost, x: number, y: number, anchor: () => { x: number; y: number } | null) {
    super(host, x, y, 'pip', 0.5, 0.5);
    this.anchor = anchor;
    this.sprite.setScale(1.35);
    this.shadow.setAlpha(0.5);
    this.sync();
  }

  protected emoteY(): number {
    return -80;
  }

  update(dt: number): void {
    this.t += dt;
    const a = this.anchor();
    if (a) {
      const tx = a.x;
      const ty = a.y;
      this.x += (tx - this.x) * Math.min(1, dt * 3);
      this.y += (ty - this.y) * Math.min(1, dt * 3);
    }
    this.lift = 70 + Math.sin(this.t * 2.2) * 10;
    this.sprite.setFrame(Math.floor(this.t * 12) % 4);
    this.container.setPosition(this.x, this.y);
    this.sprite.y = -this.lift;
    this.container.setDepth(this.y + 60);
  }
}

export const CORGI_SIZE = { w: CW, h: CH };
export const BUNNY_SIZE = { w: BW, h: BH };
