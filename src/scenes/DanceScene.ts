import Phaser from 'phaser';
import { app } from '../app';
import { audio } from '../audio/audio';
import { getSong } from '../audio/songs';
import type { Sequencer, Song } from '../audio/music';
import { input } from '../input/input';
import { ui } from '../ui/ui';
import { addCanvasTexture, ensureBiscuitTexture, ensureBunnyTexture, ensureCharacterTexture } from '../art/textures';
import { biscuitPieces, lookKey, specForPlayer } from '../data/clothes';
import { character } from '../data/characters';
import { HOPKINS_BY_ID } from '../data/bunnies';
import { FEET_Y, FH } from '../art/character';
import { makeCanvas } from '../art/draw';
import { drawDanceStage, type StageKind } from '../art/danceStage';
import {
  DANCE_STYLES,
  LANES,
  accuracy,
  addJudgement,
  emptyScore,
  judge,
  makeChart,
  rivalPoints,
  starsFor,
  windowsFor,
  type DanceLevel,
  type DanceNote,
  type DanceScore,
  type DanceStyleDef,
  type Judgement,
  type Lane,
} from '../dance/logic';

/**
 * The dance floor: arrows fall toward a row of rings in time with the music; press the matching
 * direction (or tap the lane) as each one lands. Every hit makes your character strike the move,
 * Biscuit bounces along, and in two-player games both players dance side by side with their own
 * lanes and scores. Timing comes from the audio clock, so the arrows never drift from the song.
 */
export interface DanceSetup {
  style: string;
  level: DanceLevel;
  /** "just dance": no scores, nothing to fail */
  relaxed: boolean;
  players: (0 | 1)[];
  /** a story dance-off partner (an NPC id) */
  rival?: string | null;
  /** NPCs cheering at the back */
  audience?: string[];
  /** rescued bunnies hopping along */
  bunnies?: string[];
  /** Tick-Tock Tomato: roomier timing */
  slow?: boolean;
}

export interface DanceOutcome {
  finished: boolean;
  scores: DanceScore[];
  acc: number[];
  stars: (1 | 2 | 3)[];
  rival: number | null;
  won: boolean;
  notes: number;
}

interface Dancer {
  c: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  base: number;
  poseUntil: number;
  kind: 'person' | 'dog' | 'bunny';
}

interface NoteView {
  n: DanceNote;
  state: 'live' | 'hit' | 'miss';
  img: Phaser.GameObjects.Image | null;
}

interface PlayerLanes {
  player: 0 | 1;
  notes: NoteView[];
  next: number;
  score: DanceScore;
  x: number;
  laneW: number;
  receptors: Phaser.GameObjects.Image[];
  glow: Phaser.GameObjects.Image[];
  pop: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  dancer: Dancer;
  hits: number;
  /** every move struck (with or without an arrow) */
  moves: number;
}

const LANE_COLORS = { left: 0xf48fb1, down: 0x6fb3e0, up: 0x7cc47f, right: 0xf7c65a } as const;
/** Okabe–Ito colours when the colour-blind setting is on (the arrows' directions are the main cue anyway) */
const LANE_COLORS_CB = { left: 0xe69f00, down: 0x0072b2, up: 0xf0e442, right: 0xcc79a7 } as const;
const LANE_ANGLE: Record<Lane, number> = { up: 0, right: 90, down: 180, left: -90 };
const POSE: Record<Lane, string> = { left: 'dance-left', right: 'dance-right', up: 'dance-cheer', down: 'dance-squat' };
const LEAD: Record<DanceLevel, number> = { easy: 1.7, medium: 1.45, hard: 1.2 };
const COUNT_IN_BEATS = 4;

let autoplay = false;
let current: DanceScene | null = null;

/** Debug/test hooks: the running dance's state, and a perfect autopilot. */
export const danceDebug = {
  setAuto(on: boolean): void {
    autoplay = on;
  },
  state(): { running: boolean; pos: number; notes: DanceNote[]; players: { player: number; points: number; combo: number; counts: Record<Judgement, number>; frame: string; moves: number }[]; rival: number | null } | null {
    return current ? current.debugState() : null;
  },
};

export class DanceScene extends Phaser.Scene {
  static readonly KEY = 'dance';
  private setup!: DanceSetup;
  private done!: (o: DanceOutcome) => void;
  private style!: DanceStyleDef;
  private song!: Song;
  private seq: Sequencer | null = null;
  private chart: DanceNote[] = [];
  private lanes: PlayerLanes[] = [];
  private dancers: Dancer[] = [];
  private rival: Dancer | null = null;
  private rivalFinal = 0;
  private rivalText: Phaser.GameObjects.Text | null = null;
  private biscuit: Dancer | null = null;
  private bg: Phaser.GameObjects.Image | null = null;
  private progress!: Phaser.GameObjects.Graphics;
  private countText!: Phaser.GameObjects.Text;
  private callout!: Phaser.GameObjects.Text;
  private windows = windowsFor('easy');
  private lead = 1.6;
  private beatLen = 0.5;
  private songLen = 0;
  private lastBeat = -99;
  private paused = false;
  private finished = false;
  private dpr = 1;
  private topY = 0;
  private hitY = 0;
  private onPointer: ((e: PointerEvent) => void) | null = null;
  /** the song clock: the audio clock when sound is running, else a performance clock started with it */
  private clock = { audio: false, start: 0, pausedAt: null as number | null };

  constructor() {
    super({ key: DanceScene.KEY });
  }

  init(data: { setup: DanceSetup; done: (o: DanceOutcome) => void }): void {
    this.setup = data.setup;
    this.done = data.done;
    this.style = DANCE_STYLES[data.setup.style] ?? DANCE_STYLES.hornpipe;
    this.song = getSong(this.style.song)!;
    this.chart = makeChart(this.song, data.setup.level, this.style.loops);
    this.windows = windowsFor(data.setup.level, { slow: data.setup.slow });
    this.lead = LEAD[data.setup.level];
    this.beatLen = 60 / this.song.bpm;
    this.songLen = (this.song.bars * this.song.beatsPerBar * this.style.loops) * this.beatLen;
    // a scene object is reused between dances: drop references to the last dance's objects
    this.lanes = [];
    this.dancers = [];
    this.rival = null;
    this.rivalText = null;
    this.biscuit = null;
    this.bg = null;
    this.finished = false;
    this.paused = false;
    this.lastBeat = -99;
  }

  create(): void {
    current = this;
    this.dpr = 1 / (this.scale.zoom || 1);
    this.ensureTextures();
    this.layout();
    this.scale.on('resize', this.layout, this);
    // taps on the lanes (touch screens): each player taps their own lanes
    const canvas = this.game.canvas;
    this.onPointer = (e: PointerEvent) => {
      if (this.paused || this.finished || ui.menuOpen) return;
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this.scale.width;
      const y = ((e.clientY - r.top) / r.height) * this.scale.height;
      if (y < this.topY) return;
      for (const pl of this.lanes) {
        const i = Math.floor((x - pl.x) / pl.laneW);
        if (i >= 0 && i < 4) {
          e.preventDefault();
          this.press(pl, LANES[i]);
          return;
        }
      }
    };
    canvas.addEventListener('pointerdown', this.onPointer);
    this.events.once('shutdown', () => this.teardown());
    // the count-in, then the music (the song's clock drives everything)
    const countIn = COUNT_IN_BEATS * this.beatLen + 0.35;
    this.seq = audio.playSong(this.song, { loops: this.style.loops, fadeIn: 0, at: audio.time + countIn });
    this.clock = { audio: !!this.seq && audio.running, start: performance.now() / 1000 + countIn, pausedAt: null };
    app.busy = true;
  }

  private teardown(): void {
    // stopped mid-dance (Pip's break, back to the title): the story hears "not finished"
    if (!this.finished) this.abort();
    this.scale.off('resize', this.layout, this);
    if (this.onPointer) this.game.canvas.removeEventListener('pointerdown', this.onPointer);
    this.onPointer = null;
    this.seq?.stop(0.4);
    this.seq = null;
    app.busy = false;
    if (current === this) current = null;
  }

  // ------------------------------------------------------------------ textures & layout
  private ensureTextures(): void {
    if (!this.textures.exists('dance-arrow')) {
      const { c, ctx } = makeCanvas(128, 128);
      const arrow = () => {
        ctx.beginPath();
        ctx.moveTo(64, 10);
        ctx.lineTo(118, 64);
        ctx.lineTo(86, 64);
        ctx.lineTo(86, 116);
        ctx.lineTo(42, 116);
        ctx.lineTo(42, 64);
        ctx.lineTo(10, 64);
        ctx.closePath();
      };
      arrow();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#4a3b35';
      ctx.stroke();
      addCanvasTexture(this, 'dance-arrow', c);
      const r = makeCanvas(128, 128);
      r.ctx.beginPath();
      r.ctx.moveTo(64, 10);
      r.ctx.lineTo(118, 64);
      r.ctx.lineTo(86, 64);
      r.ctx.lineTo(86, 116);
      r.ctx.lineTo(42, 116);
      r.ctx.lineTo(42, 64);
      r.ctx.lineTo(10, 64);
      r.ctx.closePath();
      r.ctx.fillStyle = 'rgba(255, 248, 236, 0.55)';
      r.ctx.fill();
      r.ctx.lineWidth = 8;
      r.ctx.setLineDash([14, 9]);
      r.ctx.strokeStyle = '#4a3b35';
      r.ctx.stroke();
      addCanvasTexture(this, 'dance-ring', r.c);
      const g = makeCanvas(160, 160);
      const grad = g.ctx.createRadialGradient(80, 80, 4, 80, 80, 78);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.ctx.fillStyle = grad;
      g.ctx.fillRect(0, 0, 160, 160);
      addCanvasTexture(this, 'dance-glow', g.c);
    }
  }

  private colors(): Record<Lane, number> {
    return app.settings.colorblind ? LANE_COLORS_CB : LANE_COLORS;
  }

  /** (Re)build everything that depends on the screen size. */
  private layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const d = this.dpr;
    // backdrop
    const stageKey = `dance-stage-${this.style.stage}-${W}x${H}`;
    if (!this.textures.exists(stageKey)) addCanvasTexture(this, stageKey, drawDanceStage(this.style.stage as StageKind, W, H));
    if (this.bg) this.bg.setTexture(stageKey);
    else this.bg = this.add.image(0, 0, stageKey).setOrigin(0, 0).setDepth(-100);

    // keep the scores/notes we had (on a resize), rebuild views
    const old = this.lanes;
    this.children.list.filter((o) => o !== this.bg).forEach((o) => o.destroy());
    this.dancers = [];
    this.lanes = [];
    const two = this.setup.players.length === 2;
    const laneW = Math.min(W * (two ? 0.062 : 0.07), H * 0.13);
    const panelW = laneW * 4;
    const margin = Math.max(10 * d, W * 0.02);
    this.topY = Math.max(44 * d, H * 0.08);
    this.hitY = H - Math.max(58 * d, H * 0.15);
    const colors = this.colors();

    // dancers: the players in the middle, Biscuit in front, the rival and audience behind
    const floorY = H * 0.86;
    const personScale = Math.min((H * 0.44) / FH, (W * (two ? 0.13 : 0.16)) / 96);
    const cx = two ? W / 2 : margin + panelW + (W - margin - panelW) / 2;
    const playerXs = two ? [W / 2 - W * 0.085, W / 2 + W * 0.085] : [cx - W * 0.03];
    (this.setup.audience ?? []).forEach((id, i, arr) => {
      const def = character(id);
      if (!def.spec) return;
      const key = ensureCharacterTexture(this, `dance-npc-${id}`, def.spec);
      const x = cx + (i - (arr.length - 1) / 2) * W * 0.12 + (two ? 0 : W * 0.02);
      this.dancers.push(this.makeDancer(key, 'down-idle', x, floorY - H * 0.24, personScale * 0.62, 'person', -20));
    });
    (this.setup.bunnies ?? []).slice(0, 6).forEach((id, i) => {
      const hb = HOPKINS_BY_ID.get(id);
      if (!hb) return;
      const key = ensureBunnyTexture(this, `bunny-${id}`, hb.look);
      const side = i % 2 === 0 ? -1 : 1;
      const x = cx + side * (W * 0.2 + Math.floor(i / 2) * W * 0.06);
      this.dancers.push(this.makeDancer(key, 'danceA', x, floorY - H * 0.08 - Math.floor(i / 2) * H * 0.03, personScale * 0.75, 'bunny', 5));
    });
    if (this.setup.rival) {
      const def = character(this.setup.rival);
      if (def.spec) {
        const key = ensureCharacterTexture(this, `dance-npc-${this.setup.rival}`, def.spec);
        const x = two ? W / 2 : cx + W * 0.16;
        this.rival = this.makeDancer(key, 'down-idle', x, floorY - (two ? H * 0.2 : H * 0.05), personScale * (two ? 0.75 : 0.92), 'person', two ? -10 : 8);
        this.dancers.push(this.rival);
        this.rivalFinal = rivalPoints(this.setup.level, this.chart.length);
      }
    }
    this.setup.players.forEach((p, i) => {
      const prof = app.data!.players[p];
      const key = ensureCharacterTexture(this, `pc-${lookKey(prof)}`, specForPlayer(prof));
      const dancer = this.makeDancer(key, 'down-idle', playerXs[i], floorY, personScale, 'person', 10);
      this.dancers.push(dancer);
      const x = two ? (i === 0 ? margin : W - margin - panelW) : margin;
      const prev = old.find((o) => o.player === p);
      const pl: PlayerLanes = {
        player: p,
        notes: prev ? prev.notes.map((nv) => ({ ...nv, img: null })) : this.chart.map((n) => ({ n, state: 'live' as const, img: null })),
        next: prev?.next ?? 0,
        score: prev?.score ?? emptyScore(),
        x,
        laneW,
        receptors: [],
        glow: [],
        pop: this.add
          .text(x + panelW / 2, this.hitY - laneW * 1.05, '', { fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.round(22 * d)}px`, fontStyle: '700', color: '#4a3b35', stroke: '#fff8ec', strokeThickness: Math.round(6 * d) })
          .setOrigin(0.5)
          .setDepth(50),
        scoreText: this.add
          .text(x + panelW / 2, this.topY - 8 * d, '', { fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.round(15 * d)}px`, fontStyle: '700', color: '#4a3b35', backgroundColor: '#fff8ecdd', padding: { x: Math.round(8 * d), y: Math.round(3 * d) }, align: 'center' })
          .setOrigin(0.5, 1)
          .setDepth(50),
        dancer,
        hits: prev?.hits ?? 0,
        moves: prev?.moves ?? 0,
      };
      // lane track + rings
      const track = this.add.graphics().setDepth(1);
      track.fillStyle(0x4a3b35, 0.32).fillRoundedRect(x - 4 * d, this.topY, panelW + 8 * d, this.hitY - this.topY + laneW * 0.75, 14 * d);
      for (let l = 0; l < 4; l++) {
        const lx = x + laneW * (l + 0.5);
        track.lineStyle(Math.max(1, 2 * d), 0xfff8ec, 0.25).lineBetween(lx, this.topY + 8 * d, lx, this.hitY);
        const lane = LANES[l];
        pl.glow.push(this.add.image(lx, this.hitY, 'dance-glow').setDisplaySize(laneW * 1.3, laneW * 1.3).setTint(colors[lane]).setAlpha(0).setDepth(2));
        pl.receptors.push(this.add.image(lx, this.hitY, 'dance-ring').setDisplaySize(laneW * 0.86, laneW * 0.86).setAngle(LANE_ANGLE[lane]).setTint(colors[lane]).setDepth(3));
      }
      this.lanes.push(pl);
    });
    // Biscuit dances in front
    const bkey = ensureBiscuitTexture(this, biscuitPieces(app.data!.biscuit.outfit));
    this.biscuit = this.makeDancer(bkey, 'dance-A', two ? W / 2 : cx + W * 0.07, floorY + H * 0.05, personScale * 0.95, 'dog', 20);
    this.dancers.push(this.biscuit);

    // song progress, the rival's score, the count-in, move callouts
    this.progress = this.add.graphics().setDepth(60);
    this.rivalText = this.setup.rival && !this.setup.relaxed
      ? this.add
          .text(W / 2, this.topY + 26 * d, '', { fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.round(15 * d)}px`, fontStyle: '700', color: '#4a3b35', backgroundColor: '#fff8ecdd', padding: { x: Math.round(8 * d), y: Math.round(3 * d) } })
          .setOrigin(0.5, 0)
          .setDepth(60)
      : null;
    this.countText = this.add
      .text(cx, H * 0.36, '', { fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.round(64 * d)}px`, fontStyle: '700', color: '#fff8ec', stroke: '#4a3b35', strokeThickness: Math.round(10 * d) })
      .setOrigin(0.5)
      .setDepth(70);
    this.callout = this.add
      .text(cx, H * 0.2, '', { fontFamily: 'Fredoka, sans-serif', fontSize: `${Math.round(24 * d)}px`, fontStyle: '700', color: '#4a3b35', stroke: '#fff8ec', strokeThickness: Math.round(7 * d) })
      .setOrigin(0.5)
      .setDepth(70)
      .setAlpha(0);
    this.refreshScores();
  }

  private makeDancer(key: string, frame: string, x: number, y: number, scale: number, kind: Dancer['kind'], depth: number): Dancer {
    const shadow = this.add.image(0, 0, 'fx-shadow').setScale(scale * 1.1, scale);
    const sprite = this.add.image(0, 0, key, frame).setScale(scale);
    if (kind === 'person') sprite.setOrigin(0.5, FEET_Y / FH);
    else sprite.setOrigin(0.5, 0.92);
    const c = this.add.container(x, y, [shadow, sprite]).setDepth(10 + depth + y / 10000);
    return { c, sprite, base: scale, poseUntil: 0, kind };
  }

  // ------------------------------------------------------------------ time
  /** Seconds into the song (negative during the count-in). */
  private songPos(): number {
    if (this.clock.audio && this.seq) return this.seq.position();
    return (this.clock.pausedAt ?? performance.now() / 1000) - this.clock.start;
  }

  update(): void {
    if (this.finished) return;
    // any menu (pause, Pip's reminder) freezes the dance and the music
    const hold = ui.menuOpen;
    if (hold && !this.paused) {
      this.paused = true;
      this.seq?.pause();
      this.clock.pausedAt = performance.now() / 1000;
    } else if (!hold && this.paused) {
      this.paused = false;
      this.seq?.resume();
      if (this.clock.pausedAt !== null) this.clock.start += performance.now() / 1000 - this.clock.pausedAt;
      this.clock.pausedAt = null;
    }
    if (this.paused) return;
    const now = this.songPos();
    const nowMs = this.time.now;

    // count-in: 3, 2, 1, Dance!
    if (now < 0) {
      const beatsLeft = Math.ceil(-now / this.beatLen);
      const label = beatsLeft >= COUNT_IN_BEATS ? 'Ready?' : beatsLeft > 0 ? String(beatsLeft) : '';
      if (this.countText.text !== label) {
        this.countText.setText(label).setAlpha(1).setScale(1.25);
        this.tweens.add({ targets: this.countText, scale: 1, duration: 220, ease: 'Back.easeOut' });
        if (label && label !== 'Ready?') audio.sfx('clap', { vol: 0.6 });
      }
    } else if (this.countText.text && this.countText.text !== 'Dance!') {
      this.countText.setText('Dance!').setAlpha(1).setScale(1.2);
      this.tweens.add({ targets: this.countText, alpha: 0, scale: 1.5, delay: 350, duration: 400 });
    }

    // the beat: everyone bobs, Biscuit and the bunnies bounce, the rival shows off
    const beat = Math.floor(now / this.beatLen);
    if (beat !== this.lastBeat && now > -COUNT_IN_BEATS * this.beatLen) {
      this.lastBeat = beat;
      this.onBeat(beat, nowMs);
    }

    // input: arrows / WASD / d-pad for each dancing player
    for (const pl of this.lanes) {
      // (a held d-pad repeats for menus — in a dance, only a fresh press counts)
      const pad = input.p[pl.player];
      if (pad.dir && !pad.dirRepeat) this.press(pl, pad.dir as Lane);
    }
    if (autoplay) for (const pl of this.lanes) for (let i = pl.next; i < pl.notes.length && pl.notes[i].n.t <= now + 0.005; i++) if (pl.notes[i].state === 'live') this.press(pl, pl.notes[i].n.lane);

    // notes: draw what's coming, miss what's gone by
    const colors = this.colors();
    const travel = this.hitY - this.topY;
    for (const pl of this.lanes) {
      for (let i = pl.next; i < pl.notes.length; i++) {
        const nv = pl.notes[i];
        const dt = nv.n.t - now;
        if (dt > this.lead) break;
        if (nv.state === 'live' && -dt > this.windows.good) {
          nv.state = 'miss';
          this.judged(pl, 'miss', nv.n.lane);
        }
        if (nv.state !== 'live') {
          if (nv.img) {
            nv.img.destroy();
            nv.img = null;
          }
          continue;
        }
        const li = LANES.indexOf(nv.n.lane);
        if (!nv.img)
          nv.img = this.add
            .image(pl.x + pl.laneW * (li + 0.5), this.topY, 'dance-arrow')
            .setDisplaySize(pl.laneW * 0.8, pl.laneW * 0.8)
            .setAngle(LANE_ANGLE[nv.n.lane])
            .setTint(colors[nv.n.lane])
            .setDepth(4);
        nv.img.y = this.hitY - (dt / this.lead) * travel;
        nv.img.setAlpha(Math.min(1, 0.35 + (1 - dt / this.lead) * 1.2));
      }
      while (pl.next < pl.notes.length && pl.notes[pl.next].state !== 'live' && !pl.notes[pl.next].img) pl.next++;
    }

    // dancers go back to their idle pose after a move
    for (const dn of this.dancers) if (dn.poseUntil && nowMs > dn.poseUntil && dn.kind === 'person') {
      dn.poseUntil = 0;
      dn.sprite.setFrame('down-idle');
    }

    // the song bar at the top
    const W = this.scale.width;
    const d = this.dpr;
    const t = Math.max(0, Math.min(1, now / this.songLen));
    this.progress.clear();
    this.progress.fillStyle(0x4a3b35, 0.35).fillRoundedRect(W * 0.35, 10 * d, W * 0.3, 10 * d, 5 * d);
    this.progress.fillStyle(0xf7c65a, 1).fillRoundedRect(W * 0.35, 10 * d, Math.max(10 * d, W * 0.3 * t), 10 * d, 5 * d);
    if (this.rivalText && this.setup.rival) {
      const shown = Math.round(this.rivalFinal * t);
      this.rivalText.setText(`${character(this.setup.rival).name}: ${shown.toLocaleString()}`);
    }

    // the end: every note judged and the last one well gone
    const last = this.chart.length ? this.chart[this.chart.length - 1].t : 0;
    if (now > last + 1.1 && this.lanes.every((pl) => pl.notes.every((nv) => nv.state !== 'live'))) this.finish();
  }

  private onBeat(beat: number, nowMs: number): void {
    for (const dn of this.dancers) {
      const s = dn.base;
      this.tweens.add({ targets: dn.sprite, scaleY: { from: s * 0.93, to: s }, scaleX: { from: s * 1.04, to: s }, duration: this.beatLen * 650, ease: 'Sine.easeOut' });
      if (dn.kind === 'dog') dn.sprite.setFrame(beat % 2 ? 'dance-B' : 'dance-A');
      if (dn.kind === 'bunny') {
        dn.sprite.setFrame(beat % 2 ? 'danceB' : 'danceA');
        this.tweens.add({ targets: dn.sprite, y: { from: -12 * this.dpr, to: 0 }, duration: this.beatLen * 500, ease: 'Quad.easeOut' });
      }
    }
    // the rival (and the audience) dance on their own
    if (this.rival && beat >= 0) {
      const moves = ['dance-left', 'dance-right', 'dance-cheer', 'dance-squat', 'dance-clap'];
      this.rival.sprite.setFrame(moves[(beat * 7 + 3) % moves.length]);
      this.rival.poseUntil = nowMs + this.beatLen * 700;
    }
  }

  // ------------------------------------------------------------------ hits
  private press(pl: PlayerLanes, lane: Lane): void {
    if (this.finished || this.paused) return;
    const now = this.songPos();
    const li = LANES.indexOf(lane);
    const ring = pl.receptors[li];
    if (ring) {
      this.tweens.killTweensOf(ring);
      ring.setScale(ring.scaleX * 1.15);
      this.tweens.add({ targets: ring, scaleX: (pl.laneW * 0.86) / 128, scaleY: (pl.laneW * 0.86) / 128, duration: 140 });
    }
    // your dancer does the move either way (dancing is never "wrong")
    this.pose(pl.dancer, POSE[lane]);
    pl.moves++;
    if (now < -this.windows.good) return;
    let best = -1;
    let bestAbs = Infinity;
    for (let i = pl.next; i < pl.notes.length; i++) {
      const nv = pl.notes[i];
      if (nv.n.t - now > this.windows.good) break;
      if (nv.state !== 'live' || nv.n.lane !== lane) continue;
      const a = Math.abs(now - nv.n.t);
      if (a < bestAbs) {
        best = i;
        bestAbs = a;
      }
    }
    if (best < 0) return;
    const nv = pl.notes[best];
    const j = autoplay ? 'perfect' : judge(now - nv.n.t, this.windows);
    if (!j) return;
    nv.state = 'hit';
    if (nv.img) {
      const img = nv.img;
      nv.img = null;
      this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.5, duration: 160, onComplete: () => img.destroy() });
    }
    this.judged(pl, j, lane);
  }

  private judged(pl: PlayerLanes, j: Judgement, lane: Lane): void {
    pl.score = addJudgement(pl.score, j);
    const relaxed = this.setup.relaxed;
    if (j !== 'miss') {
      pl.hits++;
      const g = pl.glow[LANES.indexOf(lane)];
      if (g) {
        g.setAlpha(0.9);
        this.tweens.add({ targets: g, alpha: 0, duration: 260 });
      }
      audio.sfx(j === 'perfect' ? 'perfect' : 'hit', { vol: 0.35 });
      if (pl.score.combo > 0 && pl.score.combo % 10 === 0) {
        this.pose(pl.dancer, 'dance-clap', 420);
        this.shout(pl.score.combo >= 30 ? 'Shiver me timbers!' : `${pl.score.combo} in a row!`);
        if (this.biscuit) this.tweens.add({ targets: this.biscuit.sprite, y: { from: -40 * this.dpr, to: 0 }, duration: 380, ease: 'Quad.easeOut' });
      } else if (pl.hits % 6 === 0) this.shout(this.style.moves[lane]);
    }
    const text = relaxed ? (j === 'miss' ? '' : j === 'good' ? 'Nice!' : 'Yay!') : { perfect: 'Perfect!', great: 'Great!', good: 'Good!', miss: 'Oops!' }[j];
    const color = { perfect: '#d9a23a', great: '#3f8a44', good: '#3f5a8a', miss: '#8a7f78' }[j];
    if (text) {
      pl.pop.setText(text).setColor(color).setAlpha(1).setScale(1.2);
      this.tweens.killTweensOf(pl.pop);
      this.tweens.add({ targets: pl.pop, scale: 1, duration: 140, ease: 'Back.easeOut' });
      this.tweens.add({ targets: pl.pop, alpha: 0, delay: 380, duration: 250 });
    }
    this.refreshScores();
  }

  private pose(dn: Dancer, frame: string, ms = 280): void {
    if (dn.kind !== 'person') return;
    dn.sprite.setFrame(frame);
    dn.poseUntil = this.time.now + ms;
  }

  private shout(text: string): void {
    this.callout.setText(text).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.callout);
    this.tweens.add({ targets: this.callout, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.callout, alpha: 0, delay: 700, duration: 300 });
  }

  private refreshScores(): void {
    for (const pl of this.lanes) {
      const name = app.data?.players[pl.player]?.name || `Player ${pl.player + 1}`;
      pl.scoreText.setText(this.setup.relaxed ? `${name} · ${pl.hits} moves` : `${name} · ${pl.score.points.toLocaleString()}${pl.score.combo >= 3 ? `  ×${pl.score.combo}` : ''}`);
    }
  }

  // ------------------------------------------------------------------ the end
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const total = this.chart.length;
    const acc = this.lanes.map((pl) => accuracy(pl.score, total));
    const best = Math.max(0, ...this.lanes.map((pl) => pl.score.points));
    const rival = this.setup.rival && !this.setup.relaxed ? this.rivalFinal : null;
    const won = this.setup.relaxed || (rival !== null ? best >= rival : Math.max(0, ...acc) >= 0.45);
    for (const dn of this.dancers) if (dn.kind === 'person') dn.sprite.setFrame(won ? 'dance-cheer' : 'wave');
    this.biscuit?.sprite.setFrame('happy');
    for (const pl of this.lanes) for (const nv of pl.notes) nv.img?.destroy();
    audio.sfx(won ? 'cheer' : 'chime');
    const outcome: DanceOutcome = { finished: true, scores: this.lanes.map((pl) => pl.score), acc, stars: acc.map((a) => (this.setup.relaxed ? 3 : starsFor(a))), rival, won, notes: total };
    this.time.delayedCall(900, () => this.done(outcome));
  }

  /** Quit early (Pip's break, back to the title): the story treats it as "not yet". */
  abort(): void {
    if (this.finished) return;
    this.finished = true;
    const total = this.chart.length;
    this.done({ finished: false, scores: this.lanes.map((pl) => pl.score), acc: this.lanes.map((pl) => accuracy(pl.score, total)), stars: this.lanes.map(() => 1), rival: null, won: false, notes: total });
  }

  debugState(): ReturnType<typeof danceDebug.state> {
    return {
      running: !this.finished,
      pos: this.songPos(),
      notes: this.chart.slice(),
      players: this.lanes.map((pl) => ({ player: pl.player, points: pl.score.points, combo: pl.score.combo, counts: { ...pl.score.counts }, frame: String(pl.dancer.sprite.frame.name), moves: pl.moves })),
      rival: this.setup.rival ? this.rivalFinal : null,
    };
  }
}
