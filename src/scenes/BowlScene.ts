import Phaser from 'phaser';
import { app } from '../app';
import { audio } from '../audio/audio';
import { input } from '../input/input';
import { ui } from '../ui/ui';
import { h } from '../ui/dom';
import { addCanvasTexture, ensureBiscuitTexture, ensureCharacterTexture } from '../art/textures';
import { biscuitPieces, lookKey, specForPlayer } from '../data/clothes';
import { character } from '../data/characters';
import { FEET_Y, FH } from '../art/character';
import { drawAlley, drawBall, drawPin, type AlleyKind } from '../art/bowlingArt';
import { BALL_R, HEAD_PIN_Y, LANE_HALF, LaneSim, PIN_H, PIT_Y, WALL, freshRack, type PinState, type Throw } from '../bowling/physics';
import { gameOver, nextBall, pinsStanding, scorecard, totalScore, onFreshRack } from '../bowling/score';
import { npcThrow, rng } from '../bowling/npc';
import { TRIES_PER_PLAYER, type TrickShot } from '../bowling/tricks';

/**
 * The bowling lane, seen from behind the bowler: step left or right, aim, pick your power and
 * roll — then hold left or right while the ball rolls to curve it (or swipe up on a touchscreen:
 * a curved swipe spins the ball). The camera follows the ball down to the pins. Bowlers take
 * turns frame by frame (players first, then a computer rival if there is one), with real
 * ten-pin scoring on the scorecard.
 */
export interface BowlSetup {
  players: (0 | 1)[];
  rival: { id: string; skill: number } | null;
  /** a glowing "stand here, roll into the pocket" guide (after a loss in a story game) */
  guide?: boolean;
  bumpers: boolean;
  alley: AlleyKind;
  seed: number;
  /** a trick-shot challenge instead of a ten-frame game */
  trick?: TrickShot | null;
}

export interface BowlerResult {
  name: string;
  npc: boolean;
  player: 0 | 1 | null;
  rolls: number[];
  total: number;
}

export interface BowlOutcome {
  finished: boolean;
  bowlers: BowlerResult[];
  /** did a player beat the rival (or finish, with no rival)? For a trick shot: was it cleared? */
  won: boolean;
  /** trick shots: cleared, and by whom */
  cleared?: boolean;
  clearedBy?: string | null;
}

type Phase = 'intro' | 'position' | 'aim' | 'power' | 'rolling' | 'result' | 'done';

interface Bowler {
  name: string;
  npc: boolean;
  player: 0 | 1 | null;
  skill: number;
  rolls: number[];
  tex: string;
}

const CAM_BACK = 95;
const STAND_MAX = 15;
/** where to stand to roll straight into the pocket, just right of the head pin (as the computer bowlers do) */
const POCKET_X = 2;
/** how much a swipe's slant turns the throw (gentle: a thumb is never perfectly straight) */
const SWIPE_AIM = 0.045;
const AIM_MAX = (3.2 * Math.PI) / 180;
const POWER_PERIOD = 1.35;

let autoplay = false;
let timeScale = 1;
let current: BowlScene | null = null;

/** Debug/test hooks. */
export const bowlDebug = {
  setAuto(on: boolean): void {
    autoplay = on;
  },
  setSpeed(k: number): void {
    timeScale = Math.max(0.25, Math.min(20, k));
  },
  state() {
    return current ? current.debugState() : null;
  },
  throwNow(th: Throw): boolean {
    return current ? current.debugThrow(th) : false;
  },
};

export class BowlScene extends Phaser.Scene {
  static readonly KEY = 'bowl';
  private setup!: BowlSetup;
  private done!: (o: BowlOutcome) => void;
  private bowlers: Bowler[] = [];
  private turn = 0;
  private frameNo = 1;
  private rack: PinState[] = freshRack();
  private phase: Phase = 'intro';
  private phaseT = 0;
  private alleyKey = '';
  private offOutfit: (() => void) | null = null;
  private hintWho: number | null = null;
  private hintTwo = false;
  /** the aim of a swipe in progress (touch), drawn as it moves */
  private swipeAngle: number | null = null;
  private standX = 0;
  private angle = 0;
  private power = 0.5;
  private powerT = 0;
  private sim: LaneSim | null = null;
  private lastThrow: Throw | null = null;
  private spinUsed = 0;
  private camY = 0;
  private finished = false;
  private rand: () => number = Math.random;
  private dpr = 1;
  // trick shots
  private tries = 0;
  private cleared = false;
  private clearedBy: string | null = null;
  // drawing
  private bg: Phaser.GameObjects.Image | null = null;
  private lane!: Phaser.GameObjects.Graphics;
  /** drawn on the lane itself (under the pins, the ball and the bowler): the pocket guide */
  private onLane!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Graphics;
  private pinImgs = new Map<number, Phaser.GameObjects.Image>();
  private ballImg!: Phaser.GameObjects.Image;
  private bowlerImg!: Phaser.GameObjects.Image;
  private waiting: Phaser.GameObjects.Image[] = [];
  private biscuit!: Phaser.GameObjects.Image;
  private banner!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private big!: Phaser.GameObjects.Text;
  private card: HTMLElement | null = null;
  private swipe: { id: number; pts: { x: number; y: number; t: number }[] } | null = null;
  private onDown: ((e: PointerEvent) => void) | null = null;
  private onMove: ((e: PointerEvent) => void) | null = null;
  private onUp: ((e: PointerEvent) => void) | null = null;

  constructor() {
    super({ key: BowlScene.KEY });
  }

  init(data: { setup: BowlSetup; done: (o: BowlOutcome) => void }): void {
    this.setup = data.setup;
    this.done = data.done;
    this.rand = rng(data.setup.seed);
    this.bg = null;
    this.pinImgs = new Map();
    this.waiting = [];
    this.finished = false;
    this.pending = null;
    this.turn = 0;
    this.frameNo = 1;
    this.rack = freshRack();
    this.sim = null;
    this.camY = 0;
    this.tries = 0;
    this.cleared = false;
    this.clearedBy = null;
    const d = app.data!;
    this.bowlers = data.setup.players.map((p) => ({ name: d.players[p]?.name || `Player ${p + 1}`, npc: false, player: p, skill: 0, rolls: [], tex: '' }));
    if (data.setup.rival && !data.setup.trick) this.bowlers.push({ name: character(data.setup.rival.id).name, npc: true, player: null, skill: data.setup.rival.skill, rolls: [], tex: '' });
  }

  private get trick(): TrickShot | null {
    return this.setup.trick ?? null;
  }

  private get maxTries(): number {
    return TRIES_PER_PLAYER * this.bowlers.length;
  }

  /** The trick shot's pins, set up fresh. */
  private trickRack(): PinState[] {
    const pins = this.trick!.pins;
    return freshRack().filter((p) => pins.includes(p.id + 1));
  }

  create(): void {
    current = this;
    this.dpr = 1 / (this.scale.zoom || 1);
    if (!this.textures.exists('bowl-pin')) addCanvasTexture(this, 'bowl-pin', drawPin());
    if (!this.textures.exists('bowl-ball')) addCanvasTexture(this, 'bowl-ball', drawBall('#6f5fd0'));
    const d = app.data!;
    for (const b of this.bowlers) {
      if (b.npc) {
        const def = character(this.setup.rival!.id);
        b.tex = def.spec ? ensureCharacterTexture(this, `bowl-npc-${def.id}`, def.spec) : '';
      } else {
        const prof = d.players[b.player!];
        b.tex = ensureCharacterTexture(this, `pc-${lookKey(prof)}`, specForPlayer(prof));
      }
    }
    this.buildViews();
    this.scale.on('resize', this.buildViews, this);
    this.bindTouch();
    this.card = h('div', { class: 'bowl-card', attrs: { 'data-testid': 'bowl-card' } });
    ui.hud.appendChild(this.card);
    this.renderCard();
    this.events.once('shutdown', () => this.teardown());
    // a change in the wardrobe (pause → Wardrobe) shows on the lane straight away
    this.offOutfit = app.events.on('outfit-changed', () => this.refreshLooks());
    app.busy = true;
    audio.music('bowling');
    this.startTurn();
  }

  private teardown(): void {
    if (!this.finished) {
      this.finished = true;
      this.done(this.outcome(false));
    } else this.deliver();
    this.scale.off('resize', this.buildViews, this);
    const canvas = this.game.canvas;
    if (this.onDown) canvas.removeEventListener('pointerdown', this.onDown);
    if (this.onMove) window.removeEventListener('pointermove', this.onMove);
    if (this.onUp) window.removeEventListener('pointerup', this.onUp);
    this.card?.remove();
    this.card = null;
    this.offOutfit?.();
    this.offOutfit = null;
    app.busy = false;
    if (current === this) current = null;
  }

  /** The bowlers (and Biscuit) in what they're wearing right now. */
  private refreshLooks(): void {
    const d = app.data;
    if (!d || !this.bowlerImg) return;
    for (const b of this.bowlers) {
      if (b.npc || b.player === null) continue;
      const prof = d.players[b.player];
      b.tex = ensureCharacterTexture(this, `pc-${lookKey(prof)}`, specForPlayer(prof));
    }
    this.biscuit?.setTexture(ensureBiscuitTexture(this, biscuitPieces(d.biscuit.outfit)), 'sit');
    this.syncBowler();
    this.refreshWaiting();
  }

  // ------------------------------------------------------------------ views
  private buildViews(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const key = `bowl-alley-${this.setup.alley}-${W}x${H}`;
    if (!this.textures.exists(key)) addCanvasTexture(this, key, drawAlley(this.setup.alley, W, H));
    this.children.list.filter((o) => o !== this.bg).forEach((o) => o.destroy());
    if (this.bg) this.bg.setTexture(key);
    else this.bg = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
    // (one picture per screen size: the last size's is let go)
    if (this.alleyKey && this.alleyKey !== key && this.textures.exists(this.alleyKey)) this.textures.remove(this.alleyKey);
    this.alleyKey = key;
    this.pinImgs = new Map();
    this.lane = this.add.graphics().setDepth(-900);
    this.onLane = this.add.graphics().setDepth(-850);
    this.overlay = this.add.graphics().setDepth(900);
    this.ballImg = this.add.image(0, 0, 'bowl-ball').setDepth(0).setVisible(false);
    const d = this.dpr;
    // (text grows on a big screen: 1280×720 and smaller keep their size)
    const k = Math.max(1, Math.min(1.7, W / d / 1280, H / d / 720));
    const style = (size: number) => ({ fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.round(size * d * k)}px`, fontStyle: '700', color: '#fff8ec', stroke: '#4a3b35', strokeThickness: Math.round(6 * d * k) });
    this.banner = this.add.text(W / 2, H * 0.29, '', style(20)).setOrigin(0.5).setDepth(950);
    this.hint = this.add.text(W / 2, H - 16 * d, '', { ...style(15), strokeThickness: Math.round(5 * d) }).setOrigin(0.5, 1).setDepth(950);
    this.big = this.add.text(W / 2, H * 0.45, '', style(56)).setOrigin(0.5).setDepth(960).setAlpha(0);
    this.bowlerImg = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, FEET_Y / FH).setDepth(800).setVisible(false);
    this.waiting = [];
    const bkey = ensureBiscuitTexture(this, biscuitPieces(app.data!.biscuit.outfit));
    this.biscuit = this.add.image(W * 0.1, H * 0.97, bkey, 'sit').setOrigin(0.5, 0.92).setScale((H * 0.2) / 96).setDepth(820);
    this.refreshWaiting();
    this.syncBowler();
  }

  /** The bowlers waiting their turn stand at the side, watching. */
  private refreshWaiting(): void {
    for (const w of this.waiting) w.destroy();
    this.waiting = [];
    const W = this.scale.width;
    const H = this.scale.height;
    const others = this.bowlers.filter((_, i) => i !== this.turn);
    others.forEach((b, i) => {
      if (!b.tex) return;
      const img = this.add
        .image(W * (0.9 - i * 0.09), H * 0.99, b.tex, 'down-idle')
        .setOrigin(0.5, FEET_Y / FH)
        .setScale((H * 0.28) / FH)
        .setDepth(810);
      this.waiting.push(img);
    });
  }

  private syncBowler(): void {
    const b = this.bowlers[this.turn];
    if (!b || !b.tex || !this.bowlerImg) return;
    this.bowlerImg.setTexture(b.tex, 'up-idle');
  }

  // ------------------------------------------------------------------ projection
  private proj(x: number, y: number, hgt = 0): { x: number; y: number; s: number } | null {
    const W = this.scale.width;
    const H = this.scale.height;
    const z = y - this.camY + CAM_BACK;
    if (z < 8) return null;
    const F = (Math.min(W, H * 1.78) * 0.36 * CAM_BACK) / LANE_HALF;
    const camH = (0.6 * H * CAM_BACK) / F;
    const s = F / z;
    return { x: W / 2 + x * s, y: H * 0.3 + (camH - hgt) * s, s };
  }

  private quad(g: Phaser.GameObjects.Graphics, color: number, alpha: number, x0: number, x1: number, y0: number, y1: number): void {
    const a = this.proj(x0, y0);
    const b = this.proj(x1, y0);
    const c = this.proj(x1, y1);
    const d = this.proj(x0, y1);
    if (!a || !b || !c || !d) return;
    g.fillStyle(color, alpha).fillPoints([new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2(b.x, b.y), new Phaser.Math.Vector2(c.x, c.y), new Phaser.Math.Vector2(d.x, d.y)], true);
  }

  private drawLane(): void {
    const g = this.lane;
    g.clear();
    const near = Math.max(-60, this.camY - CAM_BACK + 12);
    this.quad(g, 0x2a2233, 1, -WALL - 6, WALL + 6, near, PIT_Y + 40); // the pit & kickbacks
    this.quad(g, 0x5b6b7a, 1, -WALL, -LANE_HALF, near, PIT_Y); // gutters
    this.quad(g, 0x5b6b7a, 1, LANE_HALF, WALL, near, PIT_Y);
    if (this.setup.bumpers) {
      this.quad(g, 0xf7c65a, 1, -LANE_HALF - 2.4, -LANE_HALF, near, HEAD_PIN_Y);
      this.quad(g, 0xf7c65a, 1, LANE_HALF, LANE_HALF + 2.4, near, HEAD_PIN_Y);
    }
    this.quad(g, 0xe0b07a, 1, -LANE_HALF, LANE_HALF, near, PIT_Y); // the lane
    this.quad(g, 0xeac08e, 1, -LANE_HALF, LANE_HALF, HEAD_PIN_Y - 22, PIT_Y); // the pin deck
    // boards
    for (let k = 1; k < 8; k++) {
      const x = -LANE_HALF + k * 5.19;
      const a = this.proj(x, near);
      const b = this.proj(x, PIT_Y);
      if (a && b) g.lineStyle(Math.max(1, 1.5 * this.dpr), 0xc9955f, 0.8).lineBetween(a.x, a.y, b.x, b.y);
    }
    // the foul line and the target arrows 15 ft down the lane
    const f0 = this.proj(-LANE_HALF, 0);
    const f1 = this.proj(LANE_HALF, 0);
    if (f0 && f1) g.lineStyle(Math.max(2, 4 * this.dpr), 0x4a3b35, 1).lineBetween(f0.x, f0.y, f1.x, f1.y);
    for (let k = 1; k <= 7; k++) {
      const x = -LANE_HALF + k * 5.19;
      const tip = this.proj(x, 186);
      const l = this.proj(x - 1.3, 176);
      const r = this.proj(x + 1.3, 176);
      if (tip && l && r) g.fillStyle(0x8a5a3a, 1).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
    }
  }

  // ------------------------------------------------------------------ turns
  private get bowler(): Bowler {
    return this.bowlers[this.turn];
  }

  private startTurn(): void {
    const b = this.bowler;
    if (this.trick) {
      this.rack = this.trickRack();
      this.angle = 0;
      this.sim = null;
      this.setPhase(autoplay ? 'intro' : 'position');
      this.banner.setText(`${b.name} — ${this.trick.name} · try ${this.tries + 1} of ${this.maxTries}`);
      this.syncBowler();
      this.refreshWaiting();
      this.renderCard();
      return;
    }
    const nb = nextBall(b.rolls);
    this.frameNo = nb.frame;
    if (nb.ball === 1 || pinsStanding(b.rolls) === 10) this.rack = freshRack();
    // with the guide on, every fresh rack starts with the bowler standing on the glowing spot
    this.standX = b.npc ? 0 : this.setup.guide && nb.ball === 1 ? POCKET_X : this.standX;
    this.angle = 0;
    this.sim = null;
    this.setPhase(b.npc || autoplay ? 'intro' : 'position');
    this.banner.setText(`${b.name} — Frame ${nb.frame}${nb.ball > 1 ? ` · ball ${nb.ball}` : ''}`);
    this.syncBowler();
    this.refreshWaiting();
    this.renderCard();
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseT = 0;
    this.updateHint();
  }

  /** Who plays a player's turn: themselves — or, if Player 2 has left the game, Player 1. */
  private controller(p: number): 0 | 1 {
    return p === 1 && input.twoPlayer ? 1 : 0;
  }

  private updateHint(): void {
    const b = this.bowler;
    if (!b || b.npc || this.phase === 'result' || this.phase === 'done' || this.phase === 'intro') {
      this.hint.setText('');
      return;
    }
    const p = b.player ?? 0;
    const who = this.controller(p);
    const dev = input.p[who].source !== 'none' ? input.p[who].source : input.device;
    // (the keys follow who's playing right now: Player 2 can join or leave mid-game)
    const two = input.twoPlayer;
    const lr = dev === 'pad' ? '◀ ▶' : two ? (who === 0 ? 'A / D' : '← / →') : '← →';
    const act = dev === 'pad' ? 'Ⓐ' : two ? (who === 0 ? 'E' : '/') : 'E';
    const pre = who !== p ? `Bowl for ${b.name}! ` : '';
    const guide = this.setup.guide && this.phase === 'position' && !this.trick ? '✨ Stand on the glowing spot · ' : '';
    if (dev === 'touch') this.hint.setText(this.phase === 'rolling' ? '' : `${pre}${guide}Drag to step left or right · swipe up to bowl (curve your swipe to spin it!)`);
    else if (this.phase === 'position') this.hint.setText(`${pre}${guide}${lr}: step left or right · ${act}: that's the spot`);
    else if (this.phase === 'aim') this.hint.setText(`${pre}${lr}: aim · ${act}: lock it in`);
    else if (this.phase === 'power') this.hint.setText(`${pre}${act}: throw when the power is just right!`);
    else if (this.phase === 'rolling') this.hint.setText(`Hold ${lr} to curve the ball!`);
  }

  /** Release the ball. */
  private release(th: Throw): void {
    const b = this.bowler;
    this.lastThrow = th;
    this.spinUsed = th.spin;
    this.sim = new LaneSim(th, this.rack, { bumpers: this.setup.bumpers });
    this.setPhase('rolling');
    this.ballImg.setVisible(true);
    audio.sfx('roll');
    if (b.tex) {
      this.bowlerImg.setFrame('bowl');
      this.time.delayedCall(450, () => this.bowlerImg?.setFrame('up-idle'));
    }
  }

  private humanThrow(): Throw {
    const speed = 170 + this.power * 160;
    return { x: this.standX, angle: this.angle, speed, spin: 0 };
  }

  private afterRoll(): void {
    const b = this.bowler;
    const r = this.sim!.result();
    if (this.trick) {
      this.tries++;
      b.rolls.push(r.down.length);
      this.rack = r.standing;
      this.cleared = r.standing.length === 0;
      if (this.cleared) this.clearedBy = b.name;
      const left = r.standing.length;
      this.shout(this.cleared ? 'TRICK SHOT!' : r.gutter ? 'Gutter ball!' : `${left} pin${left === 1 ? '' : 's'} left!`, this.cleared);
      if (this.cleared) {
        audio.sfx('cheer');
        this.biscuit.setFrame('happy');
        this.tweens.add({ targets: this.biscuit, y: this.biscuit.y - 30 * this.dpr, yoyo: true, duration: 220, repeat: 2, onComplete: () => this.biscuit.setFrame('sit') });
        for (const w of this.waiting) w.setFrame('dance-cheer');
      } else if (r.down.length > 0) audio.sfx('pins');
      this.renderCard();
      this.setPhase('result');
      return;
    }
    const knocked = r.down.length;
    const before = pinsStanding(b.rolls);
    const fresh = onFreshRack(b.rolls);
    b.rolls.push(knocked);
    this.rack = r.standing;
    const strike = knocked === 10 && fresh;
    const spare = !fresh && knocked === before && before > 0;
    this.shout(strike ? 'STRIKE!' : spare ? 'SPARE!' : r.gutter ? 'Gutter ball!' : knocked === 0 ? 'Missed!' : `${knocked} pin${knocked === 1 ? '' : 's'}!`, strike || spare);
    if (strike || spare) {
      audio.sfx('cheer');
      this.biscuit.setFrame('happy');
      this.tweens.add({ targets: this.biscuit, y: this.biscuit.y - 30 * this.dpr, yoyo: true, duration: 220, repeat: 1, onComplete: () => this.biscuit.setFrame('sit') });
      for (const w of this.waiting) w.setFrame('dance-cheer');
    } else if (knocked > 0) audio.sfx('pins');
    this.renderCard();
    this.setPhase('result');
  }

  private nextTurn(): void {
    for (const w of this.waiting) w.setFrame('down-idle');
    if (this.trick) {
      if (this.cleared || this.tries >= this.maxTries) {
        this.finish();
        return;
      }
      // players take turns at it
      this.turn = (this.turn + 1) % this.bowlers.length;
      this.startTurn();
      return;
    }
    const b = this.bowler;
    const nb = nextBall(b.rolls);
    const sameFrame = !gameOver(b.rolls) && nb.frame === this.frameNo;
    if (sameFrame) {
      if (pinsStanding(b.rolls) === 10) this.rack = freshRack();
      this.startTurn();
      return;
    }
    // next bowler (or the next frame)
    if (this.bowlers.every((x) => gameOver(x.rolls))) {
      this.finish();
      return;
    }
    do {
      this.turn = (this.turn + 1) % this.bowlers.length;
    } while (gameOver(this.bowler.rolls));
    this.rack = freshRack();
    this.startTurn();
  }

  private finish(): void {
    this.finished = true;
    this.setPhase('done');
    this.banner.setText('');
    this.renderCard();
    const o = this.outcome(true);
    audio.sfx(o.won ? 'fanfare' : 'chime');
    // (kept as pending: leaving the lane in the moment before the results still hands over the result)
    this.pending = o;
    this.time.delayedCall(700, () => this.deliver());
  }

  private pending: BowlOutcome | null = null;
  private deliver(): void {
    const o = this.pending;
    this.pending = null;
    if (o) this.done(o);
  }

  private outcome(finished: boolean): BowlOutcome {
    const bowlers = this.bowlers.map((b) => ({ name: b.name, npc: b.npc, player: b.player, rolls: b.rolls.slice(), total: totalScore(b.rolls) }));
    const humans = bowlers.filter((b) => !b.npc);
    const rival = bowlers.find((b) => b.npc);
    const best = Math.max(0, ...humans.map((b) => b.total));
    if (this.trick) return { finished, bowlers, won: finished && this.cleared, cleared: this.cleared, clearedBy: this.clearedBy };
    return { finished, bowlers, won: finished && (!rival || best >= rival.total) };
  }

  private shout(text: string, big: boolean): void {
    this.big.setText(text).setAlpha(1).setScale(big ? 1.25 : 0.8);
    this.big.setColor(big ? '#f7c65a' : '#fff8ec');
    this.tweens.killTweensOf(this.big);
    this.tweens.add({ targets: this.big, scale: big ? 1 : 0.7, duration: 240, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.big, alpha: 0, delay: 1100, duration: 300 });
  }

  // ------------------------------------------------------------------ the scorecard (DOM, crisp on phones)
  private renderCard(): void {
    if (!this.card) return;
    if (this.trick) {
      const t = this.trick;
      this.card.replaceChildren(
        h(
          'div',
          { class: 'bowl-trick', attrs: { 'data-testid': 'bowl-trick' } },
          h('div', { class: 'bt-name' }, `🎯 ${t.name}`),
          h('div', { class: 'bt-goal' }, t.goal),
          h('div', { class: 'bt-tries', attrs: { 'aria-label': `try ${Math.min(this.tries + 1, this.maxTries)} of ${this.maxTries}` } }, Array.from({ length: this.maxTries }, (_, i) => h('span', { class: i < this.tries ? 'used' : '' }, '●'))),
        ),
      );
      return;
    }
    const rows = this.bowlers.map((b, i) => {
      const card = scorecard(b.rolls);
      const cells = Array.from({ length: 10 }, (_, f) => {
        const fr = card[f];
        const marks = fr ? fr.marks : [];
        return h(
          'td',
          { class: `bc-f ${f === 9 ? 'tenth' : ''} ${!this.finished && i === this.turn && f === this.frameNo - 1 ? 'now' : ''}` },
          h('div', { class: 'bc-marks' }, (f === 9 ? [0, 1, 2] : [0, 1]).map((k) => h('span', null, marks[k] ?? ''))),
          h('div', { class: 'bc-tot' }, fr && fr.total !== null ? String(fr.total) : ''),
        );
      });
      return h(
        'tr',
        { class: `${!this.finished && i === this.turn ? 'on' : ''} ${b.npc ? 'npc' : `p${(b.player ?? 0) + 1}`}`, attrs: { 'data-testid': `bowl-row-${i}` } },
        h('th', null, b.name),
        cells,
        h('td', { class: 'bc-total', attrs: { 'data-testid': `bowl-total-${i}` } }, String(totalScore(b.rolls))),
      );
    });
    this.card.replaceChildren(h('table', null, h('tbody', null, rows)));
  }

  // ------------------------------------------------------------------ touch: drag to step, swipe up to bowl
  private bindTouch(): void {
    const canvas = this.game.canvas;
    const toGame = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * this.scale.width, y: ((e.clientY - r.top) / r.height) * this.scale.height, t: performance.now() };
    };
    this.onDown = (e: PointerEvent) => {
      if (!this.humanTurn() || ui.menuOpen) return;
      if (this.phase !== 'position' && this.phase !== 'aim' && this.phase !== 'power') return;
      e.preventDefault();
      this.swipe = { id: e.pointerId, pts: [toGame(e)] };
    };
    this.onMove = (e: PointerEvent) => {
      if (!this.swipe || e.pointerId !== this.swipe.id) return;
      const p = toGame(e);
      const prev = this.swipe.pts[this.swipe.pts.length - 1];
      this.swipe.pts.push(p);
      // a sideways drag steps the bowler left or right; an upward one shows where it will go
      const s0 = this.swipe.pts[0];
      if (Math.abs(p.x - s0.x) > Math.abs(p.y - s0.y) * 1.5) {
        this.standX = Phaser.Math.Clamp(this.standX + ((p.x - prev.x) / this.scale.width) * 60, -STAND_MAX, STAND_MAX);
        this.swipeAngle = null;
        if (this.phase !== 'position') this.setPhase('position');
      } else if (s0.y - p.y > 20 * this.dpr) this.swipeAngle = swipeAim(s0, p);
    };
    this.onUp = (e: PointerEvent) => {
      if (!this.swipe || e.pointerId !== this.swipe.id) return;
      const pts = this.swipe.pts;
      this.swipe = null;
      this.swipeAngle = null;
      pts.push(toGame(e));
      const th = swipeToThrow(pts, this.standX, this.dpr);
      if (th) this.release(th);
    };
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
  }

  private humanTurn(): boolean {
    return !!this.bowler && !this.bowler.npc && !this.finished;
  }

  // ------------------------------------------------------------------ the frame loop
  update(_t: number, deltaMs: number): void {
    if (this.finished && this.phase === 'done') {
      this.drawScene();
      return;
    }
    // (the scorecard steps back under any menu — the pause menu, Pip's reminder, a results card)
    this.card?.classList.toggle('behind', ui.menuOpen);
    if (ui.menuOpen) return; // the pause menu or Pip's reminder: everything waits
    const dt = (Math.min(deltaMs, 100) / 1000) * timeScale;
    this.phaseT += dt;
    const b = this.bowler;
    const who = b && b.player !== null ? this.controller(b.player) : null;
    if (who !== this.hintWho || input.twoPlayer !== this.hintTwo) {
      this.hintWho = who;
      this.hintTwo = input.twoPlayer;
      this.updateHint();
    }
    // (a moment's grace at each step, so the press that started it doesn't also end it)
    const pad = who !== null && this.phaseT > 0.25 ? input.p[who] : null;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 0.9) {
          if (b.npc) this.release(npcThrow(b.skill, this.rack, this.rand));
          else this.release(autoThrow(this.rack, this.rand));
        }
        break;
      case 'position':
        if (pad) {
          this.standX = Phaser.Math.Clamp(this.standX + pad.x * 22 * dt, -STAND_MAX, STAND_MAX);
          if (pad.aPressed) {
            audio.sfx('select');
            this.setPhase('aim');
          }
        }
        break;
      case 'aim':
        if (pad) {
          this.angle = Phaser.Math.Clamp(this.angle + pad.x * 0.035 * dt, -AIM_MAX, AIM_MAX);
          if (pad.aPressed) {
            audio.sfx('select');
            this.powerT = 0;
            this.setPhase('power');
          } else if (pad.bPressed) this.setPhase('position');
        }
        break;
      case 'power': {
        this.powerT += dt;
        const k = (this.powerT % POWER_PERIOD) / POWER_PERIOD;
        this.power = k < 0.5 ? k * 2 : 2 - k * 2;
        if (pad?.aPressed) this.release(this.humanThrow());
        else if (pad?.bPressed) this.setPhase('aim');
        break;
      }
      case 'rolling': {
        const sim = this.sim!;
        // hold left/right while it rolls to curve it
        if (pad && !b.npc && sim.steerable && Math.abs(pad.x) > 0.2) {
          sim.spin = Phaser.Math.Clamp(pad.x, -1, 1);
          this.spinUsed = sim.spin;
        }
        sim.step(dt);
        if (sim.done) this.afterRoll();
        break;
      }
      case 'result':
        if (this.phaseT > 1.5) this.nextTurn();
        break;
    }
    this.drawScene();
  }

  private drawScene(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const d = this.dpr;
    const dtCam = this.game.loop.delta / 1000;
    const sim = this.sim;
    const target = this.phase === 'rolling' || this.phase === 'result' ? Math.min(HEAD_PIN_Y - 175, Math.max(0, (sim?.ball.y ?? 0) - 80)) : 0;
    this.camY += (target - this.camY) * (1 - Math.pow(0.02, dtCam * timeScale));
    this.drawLane();
    // pins, far to near
    const pins: { id: number; x: number; y: number; down: boolean; vx: number; vy: number }[] = sim ? sim.snapshot().pins : this.rack.map((p) => ({ ...p, vx: 0, vy: 0 }));
    const seen = new Set<number>();
    for (const p of pins) {
      seen.add(p.id);
      const pr = this.proj(p.x, p.y);
      let img = this.pinImgs.get(p.id);
      if (!pr) {
        img?.setVisible(false);
        continue;
      }
      if (!img) {
        img = this.add.image(0, 0, 'bowl-pin').setOrigin(0.5, 0.96);
        this.pinImgs.set(p.id, img);
      }
      const hgt = PIN_H * pr.s;
      img.setVisible(true).setPosition(pr.x, pr.y).setDisplaySize(hgt * 0.4, hgt).setDepth(-p.y);
      img.setRotation(p.down ? Phaser.Math.Clamp(p.vx * 0.02 + (p.id % 2 ? 1.2 : -1.2), -1.57, 1.57) : 0);
      img.setAlpha(p.down && this.phase === 'result' ? Math.max(0, 1 - this.phaseT * 0.9) : 1);
    }
    for (const [id, img] of this.pinImgs) if (!seen.has(id)) img.setVisible(false);
    // the ball
    if (sim && this.phase !== 'result') {
      const bp = this.proj(sim.ball.x, sim.ball.y, BALL_R);
      if (bp) this.ballImg.setVisible(true).setPosition(bp.x, bp.y).setDisplaySize(BALL_R * 2 * bp.s, BALL_R * 2 * bp.s).setDepth(-sim.ball.y + 0.5).setRotation(sim.t * 8);
      else this.ballImg.setVisible(false);
    } else if (!sim && (this.phase === 'position' || this.phase === 'aim' || this.phase === 'power')) {
      const bp = this.proj(this.standX, 4, BALL_R);
      if (bp) this.ballImg.setVisible(true).setPosition(bp.x, bp.y).setDisplaySize(BALL_R * 2 * bp.s, BALL_R * 2 * bp.s).setDepth(10).setRotation(0);
    } else this.ballImg.setVisible(false);
    // the bowler, from behind, while getting ready
    const b = this.bowler;
    const ready = b && b.tex && (this.phase === 'position' || this.phase === 'aim' || this.phase === 'power' || this.phase === 'intro' || (this.phase === 'rolling' && (sim?.t ?? 0) < 0.6));
    if (ready) {
      const scale = (H * 0.42) / FH;
      this.bowlerImg.setVisible(true).setScale(scale).setPosition(W / 2 + (this.standX / LANE_HALF) * W * 0.2 - W * 0.07, H * 1.04);
    } else this.bowlerImg.setVisible(false);
    // aim guide & power meter
    const g = this.overlay;
    g.clear();
    const lg = this.onLane;
    lg.clear();
    const human = !!b && !b.npc && !this.finished;
    // the pocket guide (after a loss in a story game): the spot to stand on, straight into the pocket
    if (human && this.setup.guide && !this.trick && this.rack.length === 10 && (this.phase === 'position' || this.phase === 'aim')) {
      const on = Math.abs(this.standX - POCKET_X) < 1.6;
      const col = on ? 0x7cc47f : 0xf7c65a;
      const glow = 0.55 + 0.3 * Math.sin(this.time.now / 230);
      for (let y = 40; y < HEAD_PIN_Y - 60; y += 52) {
        const a = this.proj(POCKET_X, y);
        const c = this.proj(POCKET_X, y + 24);
        if (a && c) lg.lineStyle(Math.max(3, 9 * d * a.s * 0.1), col, glow * 0.8).lineBetween(a.x, a.y, c.x, c.y);
      }
      const tip = this.proj(POCKET_X, HEAD_PIN_Y - 26);
      const l = this.proj(POCKET_X - 5, HEAD_PIN_Y - 48);
      const r = this.proj(POCKET_X + 5, HEAD_PIN_Y - 48);
      if (tip && l && r) lg.fillStyle(col, glow).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
      // the spot to stand on: a glowing mark on the boards, just past the foul line
      const spot = this.proj(POCKET_X, 30);
      if (spot) lg.fillStyle(col, 0.35 + glow * 0.4).fillEllipse(spot.x, spot.y, 11 * spot.s, 4 * spot.s);
    }
    const aiming = this.phase === 'aim' || this.phase === 'power' || (this.swipeAngle !== null && human);
    if (aiming) {
      const angle = this.swipeAngle ?? this.angle;
      for (let y = 20; y < 420; y += 36) {
        const a = this.proj(this.standX + Math.tan(angle) * y, y);
        const c = this.proj(this.standX + Math.tan(angle) * (y + 18), y + 18);
        if (a && c) g.lineStyle(Math.max(3, 6 * d * a.s * 0.1), 0xfff4e0, 0.9).lineBetween(a.x, a.y, c.x, c.y);
      }
    }
    if (this.phase === 'power') {
      const mx = W - 46 * d;
      const my = H * 0.42;
      const mh = H * 0.4;
      g.fillStyle(0x4a3b35, 0.85).fillRoundedRect(mx - 14 * d, my - 4 * d, 28 * d, mh + 8 * d, 10 * d);
      const fill = mh * this.power;
      g.fillStyle(this.power > 0.8 ? 0xe46a6a : this.power > 0.45 ? 0xf7c65a : 0x7cc47f, 1).fillRoundedRect(mx - 9 * d, my + mh - fill, 18 * d, fill, 6 * d);
    }
  }

  // ------------------------------------------------------------------ tests
  debugState() {
    return {
      phase: this.phase,
      frame: this.frameNo,
      turn: this.turn,
      standX: this.standX,
      angle: this.angle,
      power: this.power,
      spinUsed: this.spinUsed,
      lastThrow: this.lastThrow,
      xAtPins: this.sim?.xAtPins ?? null,
      standing: this.rack.length,
      bowlers: this.bowlers.map((b) => ({ name: b.name, npc: b.npc, rolls: b.rolls.slice(), total: totalScore(b.rolls) })),
      finished: this.finished,
      trick: this.trick?.id ?? null,
      tries: this.tries,
      cleared: this.cleared,
    };
  }

  debugThrow(th: Throw): boolean {
    if (!this.humanTurn() || (this.phase !== 'position' && this.phase !== 'aim' && this.phase !== 'power')) return false;
    this.release(th);
    return true;
  }
}

/** A decent throw for the autopilot (tests): at the pocket, or at the front of a spare. */
function autoThrow(rack: PinState[], r: () => number): Throw {
  return npcThrow(0.85, rack, r);
}

/** The aim of a swipe from `a` to `b` (up the screen). */
function swipeAim(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(-AIM_MAX, Math.min(AIM_MAX, Math.atan2(b.x - a.x, Math.max(1, a.y - b.y)) * SWIPE_AIM));
}

/**
 * Turn a touch swipe into a throw: where the swipe points is the aim, how fast it moves is
 * the power, and how much it bends is the spin. Returns null if it wasn't an upward swipe.
 */
export function swipeToThrow(pts: { x: number; y: number; t: number }[], standX: number, dpr = 1): Throw | null {
  if (pts.length < 2) return null;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const up = a.y - b.y;
  if (up < 50 * dpr || up < Math.abs(b.x - a.x)) return null;
  const angle = swipeAim(a, b);
  // power: how fast the finger was moving at the end — a finger that rests before flicking still throws hard
  let k = pts.length - 2;
  while (k > 0 && b.t - pts[k - 1].t <= 120) k--;
  const from = pts[Math.max(0, k)];
  const ms = Math.max(1, b.t - from.t);
  const pxPerMs = Math.hypot(b.x - from.x, b.y - from.y) / dpr / ms;
  const power = Math.max(0, Math.min(1, (pxPerMs - 0.25) / 1.6));
  // spin: how far the middle of the path bends away from the straight line
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  let bend = 0;
  for (const p of pts) {
    const cross = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / len;
    if (Math.abs(cross) > Math.abs(bend)) bend = cross;
  }
  const spin = Math.max(-1, Math.min(1, (-bend / len) * 5));
  return { x: standX, angle, speed: 170 + power * 160, spin: Math.abs(spin) < 0.08 ? 0 : spin };
}
