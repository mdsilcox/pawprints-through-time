import Phaser from 'phaser';
import { app } from '../app';
import { audio } from '../audio/audio';
import { activeEffects, hasEffect, tickEffects } from '../soup/effects';
import { SOUP_BY_ID } from '../soup/recipes';
import { addLineFilter } from '../ui/dialogue';
import { hud } from '../ui/hud';
import { ui } from '../ui/ui';
import { TILE } from './collision';
import type { WorldScene } from '../scenes/WorldScene';

const hex = (c: string) => Number.parseInt(c.replace('#', ''), 16);


/** What each running soup effect looks like on the HUD: a little icon and a short name. */
const EFFECT_BADGE: Record<string, [string, string]> = {
  glow: ['💡', 'Glowing'],
  hop: ['🐇', 'Bouncy'],
  whisker: ['💬', 'Animal talk'],
  zoom: ['⚡', 'Zoom'],
  sparkle: ['✨', 'Treasure eyes'],
  ticktock: ['⏳', 'Slow time'],
  calm: ['🌊', 'Calm seas'],
  together: ['💞', 'Together'],
  hiccup: ['🫧', 'Hiccups'],
  squeaky: ['🐭', 'Squeaky'],
  rainbow: ['🌈', 'Rainbow'],
  wobble: ['〰️', 'Wobbly'],
};

/** Whisker Bisque: what Biscuit and the animals really mean. */
const BISCUIT_SAYS = [
  'Hi hi hi! I love you! Have I mentioned I love you?',
  'Is that a snack? That smells like a snack. Please say it’s a snack.',
  'I’m a very good boy. Everybody says so. Especially me.',
  'Follow me! I know where the fun is!',
  'Woof means “hello”, “yes”, “wow” AND “snack”. It’s a very useful word.',
];
const BUNNY_SAYS = ['Carrots? Did someone say carrots?', 'Hop hop hop! Can’t stop!', 'Grandma says we should always say please. Please!', 'My ears are listening. They’re always listening.', 'Have you seen my cousins? They went on a big adventure!'];

/**
 * Soup effects in the world: glowing players (lighting up the dark), bouncy hops, zooming
 * feet, sparkly treasure-sniffing, the two-player buddy boost, and the silly soups.
 */
export class SoupFx {
  private glows: Phaser.GameObjects.Image[] = [];
  /** at night, a ring of light over the night tint (the ground glows; the character stays true) */
  private rings: Phaser.GameObjects.Image[] = [];
  private t = 0;
  private hic = 0;
  private sparkleT = 0;
  private chatterT = 0;
  private heartT = 0;
  private hudT = 0;
  private offFilter: (() => void) | null = null;
  private offEvents: (() => void)[] = [];
  private dark: Phaser.GameObjects.RenderTexture | null = null;
  private eraser: Phaser.GameObjects.Image | null = null;
  private darkOrigin = { x: 0, y: 0 };
  /** little fixed lights in dark places (crystals): x, y, scale */
  private staticLights: [number, number, number][] = [];

  constructor(private scene: WorldScene) {
    // dark places (caves, tombs): nearly black, except around the players (brightly, with Glowbroth)
    if (scene.def.lighting === 'dark') {
      const pad = TILE * 2;
      this.darkOrigin = { x: -pad, y: -pad };
      this.dark = scene.add.renderTexture(-pad, -pad, scene.mapW + pad * 2, scene.mapH + pad * 2).setOrigin(0).setDepth(1e5);
      this.eraser = scene.make.image({ key: 'fx-light', add: false }).setOrigin(0.5);
      // crystals along the walls keep a faint glow of their own
      this.staticLights = [
        [1.2, 2.3],
        [3.1, 2.1],
        [9.4, 2.2],
        [10.6, 2.5],
        [1.1, 6.5],
        [10.8, 6.2],
      ].map(([x, y]) => [x * TILE, y * TILE, 0.7] as [number, number, number]);
    }
    for (let i = 0; i < 2; i++) {
      this.glows.push(scene.add.image(0, 0, 'fx-light').setBlendMode(Phaser.BlendModes.ADD).setDepth(1e5 + 3).setVisible(false));
      this.rings.push(scene.add.image(0, 0, 'fx-light-ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(1e5 + 1).setVisible(false));
    }
    // Whisker Bisque turns barks into words
    this.offFilter = addLineFilter((who, text) => {
      if (!hasEffect('whisker') || who !== 'biscuit') return text;
      return `${text} (${BISCUIT_SAYS[Math.floor(Math.random() * BISCUIT_SAYS.length)]})`;
    });
    const on = <K extends 'soup-drunk' | 'effects'>(ev: K, fn: (v: never) => void) => {
      app.events.on(ev, fn as never);
      this.offEvents.push(() => app.events.off(ev, fn as never));
    };
    on('soup-drunk', ((id: string) => this.drinkBurst(id)) as never);
    on('effects', (() => this.syncHud()) as never);
    this.syncHud();
  }

  destroy(): void {
    this.offFilter?.();
    this.offEvents.forEach((f) => f());
    hud.setEffects([]);
  }

  private drinkBurst(soupId: string): void {
    const s = SOUP_BY_ID[soupId];
    if (!s) return;
    audio.sfx('gulp');
    for (const p of this.scene.players) {
      const burst = this.scene.add.particles(p.x, p.y - TILE * 0.8, 'fx-dot', {
        speed: { min: 60, max: 200 },
        lifespan: 800,
        scale: { start: 0.55, end: 0 },
        tint: [hex(s.color), 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      });
      burst.setDepth(1e5 + 4);
      burst.explode(22);
      this.scene.time.delayedCall(1000, () => burst.destroy());
    }
    if (s.effect === 'rainbow') {
      audio.sfx('squeak');
      for (const p of this.scene.players) {
        const cols = [0xe46a6a, 0xf29e4c, 0xf7c65a, 0x7cc47f, 0x6fb3e0, 0xa58bd6];
        cols.forEach((c, i) => {
          const arc = this.scene.add.particles(p.x, p.y - TILE * 1.1, 'fx-dot', { speed: 140 + i * 18, angle: { min: 200, max: 340 }, lifespan: 900, scale: { start: 0.5, end: 0.1 }, tint: c, emitting: false });
          arc.setDepth(1e5 + 4);
          arc.explode(8);
          this.scene.time.delayedCall(1100, () => arc.destroy());
        });
      }
    }
    this.syncHud();
  }

  private syncHud(): void {
    hud.setEffects(
      activeEffects().map((e) => {
        const s = SOUP_BY_ID[e.soup];
        const [icon, label] = EFFECT_BADGE[e.effect] ?? ['🍲', s?.name ?? e.effect];
        return { id: e.effect, name: s?.name ?? e.effect, icon, label, color: s?.color ?? '#fff', left: Math.max(0, Math.ceil(e.left)), total: e.total };
      }),
    );
  }

  /** Per frame (dt in seconds). Returns the speed multiplier soups give each player. */
  update(dt: number): void {
    const sc = this.scene;
    const playing = !ui.menuOpen;
    if (playing) tickEffects(dt);
    this.t += dt;
    this.hudT += dt;
    if (this.hudT > 0.5) {
      this.hudT = 0;
      this.syncHud();
    }
    const glow = hasEffect('glow');
    const zoom = hasEffect('zoom');
    const hop = hasEffect('hop');
    const together = hasEffect('together') && sc.players.length === 2;
    const close = together && Math.hypot(sc.players[0].x - sc.players[1].x, sc.players[0].y - sc.players[1].y) < TILE * 2.6;
    const wobble = hasEffect('wobble');
    const glowColor = hex(SOUP_BY_ID[activeEffects().find((e) => e.effect === 'glow')?.soup ?? 'glowbroth']?.color ?? '#b8f28a');

    sc.players.forEach((p, i) => {
      p.speedMult = (zoom ? 1.7 : 1) * (close ? 1.35 : 1);
      // bouncy steps (Hopscotch Chowder) and wobbly legs (Wibble-Wobble Soup)
      if (!p.jumping) {
        if (hop && p.moving) p.hop = Math.abs(Math.sin(this.t * 9 + i)) * 16;
        else if (p.hop > 0) p.hop = Math.max(0, p.hop - dt * 80);
      }
      p.sprite.setRotation(wobble ? Math.sin(this.t * 10 + i * 2) * 0.12 : 0);
      // a soft coloured halo (the real "light" in dark places is the hole cut in the darkness)
      const g = this.glows[i];
      if (glow) {
        g.setVisible(true)
          .setPosition(p.x, p.y - TILE * 0.7)
          .setDepth(p.y - 2) // behind the character: light around them, never a wash over them
          .setTint(glowColor)
          .setScale(this.dark ? 3.2 : sc.isNight ? 3.6 : 2.4)
          .setAlpha((sc.isNight || this.dark ? 0.32 : 0.18) + Math.sin(this.t * 4 + i) * 0.04);
      } else g.setVisible(false);
      const ring = this.rings[i];
      if (glow && sc.isNight && !this.dark)
        ring
          .setVisible(true)
          .setPosition(p.x, p.y - TILE * 0.5)
          .setTint(glowColor)
          .setScale(4.2)
          .setAlpha(0.42 + Math.sin(this.t * 4 + i) * 0.05);
      else ring.setVisible(false);
    });
    for (let i = sc.players.length; i < 2; i++) {
      this.glows[i].setVisible(false);
      this.rings[i].setVisible(false);
    }
    if (this.dark && this.eraser) {
      const rt = this.dark;
      rt.clear();
      rt.fill(0x0b0a14, 0.95);
      const hole = (x: number, y: number, scale: number, alpha = 1) => {
        this.eraser!.setScale(scale).setAlpha(alpha);
        rt.erase(this.eraser!, x - this.darkOrigin.x, y - this.darkOrigin.y);
      };
      for (const [x, y, s] of this.staticLights) hole(x, y, s + Math.sin(this.t * 2 + x) * 0.05, 0.6);
      for (const p of sc.players) {
        hole(p.x, p.y - TILE * 0.6, glow ? 7.5 : 1.7);
        if (glow) hole(p.x, p.y - TILE * 0.6, 4.5);
      }
    }
    if (!playing) return;

    // Sparkle Stew: hidden treasure spots near you reveal themselves
    if (hasEffect('sparkle')) {
      this.sparkleT += dt;
      if (this.sparkleT > 0.5) {
        this.sparkleT = 0;
        for (const p of sc.players) if (sc.revealSpotsNear(p.x, p.y, TILE * 5) > 0) audio.sfx('sparkle');
        for (const p of sc.players) {
          if (!p.moving) continue;
          const tr = sc.add.image(p.x + (Math.random() - 0.5) * 40, p.y - 20, 'fx-sparkle').setTint(0xa8d8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(p.y + 5).setScale(0.6);
          sc.tweens.add({ targets: tr, alpha: 0, y: tr.y - 30, scale: 0.2, duration: 700, onComplete: () => tr.destroy() });
        }
      }
    }
    // Two-Spoon Tea: side by side you zoom, trailing hearts
    if (close) {
      this.heartT += dt;
      if (this.heartT > 0.35) {
        this.heartT = 0;
        const [a, b] = sc.players;
        const hrt = sc.add.image((a.x + b.x) / 2, (a.y + b.y) / 2 - TILE, 'emote-heart').setDepth(1e5 + 2).setScale(0.35);
        sc.tweens.add({ targets: hrt, y: hrt.y - 60, alpha: 0, duration: 900, onComplete: () => hrt.destroy() });
      }
    }
    // Hiccup Bubble Soup
    if (hasEffect('hiccup')) {
      this.hic += dt;
      if (this.hic > 1.7) {
        this.hic = 0;
        audio.sfx('hiccup');
        for (const p of sc.players) {
          if (!p.jumping) p.hop = 22;
          const bub = sc.add.image(p.x + 10, p.y - TILE * 1.4, 'fx-dot').setTint(0xc7f0ff).setScale(0.9).setDepth(1e5 + 2).setAlpha(0.85);
          sc.tweens.add({ targets: bub, y: bub.y - 90, x: bub.x + 20, scale: 1.4, alpha: 0, duration: 1400, onComplete: () => bub.destroy() });
        }
      }
    }
    // Whisker Bisque: the meadow bunnies chatter when you're near (and calm)
    if (hasEffect('whisker')) {
      this.chatterT += dt;
      if (this.chatterT > 3.5) {
        const near = sc.bunnies.find((b) => sc.players.some((p) => !p.moving && Math.hypot(p.x - b.x, p.y - b.y) < TILE * 2.2));
        if (near) {
          this.chatterT = 0;
          sc.floatText(near.x, near.y - TILE * 1.2, BUNNY_SAYS[Math.floor(Math.random() * BUNNY_SAYS.length)]);
        }
      }
    }
    audio.voiceShift = hasEffect('squeaky') ? 12 : 0;
  }

  /** Tick-Tock Tomato slows the island clock. */
  clockRate(): number {
    return hasEffect('ticktock') ? 0.35 : 1;
  }

  /** Biscuit's sniff, translated (Whisker Bisque). */
  biscuitSays(found: number): string | null {
    if (!hasEffect('whisker')) return null;
    if (found > 0) return found > 1 ? `Sniff sniff… TREASURE! ${found} spots! Dig, dig, dig!` : 'Sniff sniff… right THERE! Something shiny under the dirt!';
    const spots = this.scene.digSpots().filter((s) => !s.revealed);
    const b = this.scene.biscuit;
    if (spots.length && b) {
      const s = spots[0];
      const dx = (s.cx + 0.5) * TILE - b.x;
      const dy = (s.cy + 0.5) * TILE - b.y;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north';
      return `Nothing here… but I smell something shiny to the ${dir}!`;
    }
    return BISCUIT_SAYS[Math.floor(Math.random() * BISCUIT_SAYS.length)];
  }
}
