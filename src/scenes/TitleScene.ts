import Phaser from 'phaser';
import { app } from '../app';
import { makeCanvas } from '../art/draw';
import { PAL } from '../art/palette';
import { addCanvasTexture } from '../art/textures';
import { showTitleMenu } from '../ui/titleMenu';

/** Title: clocktower on a little island at golden hour, drifting sand, gentle clouds. */
export class TitleScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Image;
  private sea!: Phaser.GameObjects.Image;
  private hill!: Phaser.GameObjects.Image;
  private tower!: Phaser.GameObjects.Image;
  private clouds: Phaser.GameObjects.Image[] = [];
  private sand!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('title');
  }

  create(): void {
    this.makeBackdropTextures();
    this.sky = this.add.image(0, 0, 'title-sky').setOrigin(0, 0);
    this.sea = this.add.image(0, 0, 'title-sea').setOrigin(0, 0);
    for (let i = 0; i < 4; i++) {
      this.clouds.push(this.add.image(0, 0, 'title-cloud').setAlpha(0.9));
    }
    this.hill = this.add.image(0, 0, 'title-hill').setOrigin(0.5, 1);
    this.tower = this.add.image(0, 0, app.flag('hourglassRestored') ? 'clocktower-fixed' : 'clocktower').setOrigin(0.5, 1);
    this.sand = this.add.particles(0, 0, 'fx-sand', {
      lifespan: { min: 5000, max: 9000 },
      speedX: { min: 8, max: 40 },
      speedY: { min: -40, max: -10 },
      scale: { start: 0.9, end: 0.3 },
      // fade in and out over each grain's life
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.9 },
      quantity: 1,
      frequency: 140,
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.cameras.main.fadeIn(500, 255, 244, 224);
    void showTitleMenu();
  }

  private makeBackdropTextures(): void {
    if (!this.textures.exists('title-sky')) {
      const { c, ctx } = makeCanvas(8, 512);
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, '#8ec5e6');
      g.addColorStop(0.55, '#ffd9b0');
      g.addColorStop(1, '#ffe9c9');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 512);
      addCanvasTexture(this, 'title-sky', c);
    }
    if (!this.textures.exists('title-sea')) {
      const { c, ctx } = makeCanvas(8, 256);
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#9fd8e6');
      g.addColorStop(1, PAL.waterDeep);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 256);
      addCanvasTexture(this, 'title-sea', c);
    }
    if (!this.textures.exists('title-cloud')) {
      const { c, ctx } = makeCanvas(260, 110);
      ctx.fillStyle = '#fffaf2';
      for (const [x, y, r] of [
        [60, 70, 38],
        [110, 50, 48],
        [165, 62, 40],
        [205, 75, 30],
        [90, 82, 30],
        [140, 84, 30],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      addCanvasTexture(this, 'title-cloud', c);
    }
    if (!this.textures.exists('title-hill')) {
      const { c, ctx } = makeCanvas(900, 260);
      // sand rim
      ctx.fillStyle = PAL.sand;
      ctx.beginPath();
      ctx.ellipse(450, 250, 440, 120, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = PAL.grassDark;
      ctx.beginPath();
      ctx.ellipse(450, 262, 390, 150, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = PAL.grass;
      ctx.beginPath();
      ctx.ellipse(450, 268, 380, 146, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = PAL.grassLight;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(380, 170, 160, 30, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // flowers
      const cols = [PAL.pink, PAL.gold, '#ffffff', PAL.blue];
      for (let i = 0; i < 40; i++) {
        const x = 140 + ((i * 97) % 620);
        const y = 190 + ((i * 53) % 60);
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      addCanvasTexture(this, 'title-hill', c);
    }
  }

  private layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.cameras.main.setSize(W, H);
    this.sky.setDisplaySize(W, H);
    const horizon = H * 0.62;
    this.sea.setPosition(0, horizon).setDisplaySize(W, H - horizon);
    const s = Math.min(W / 1100, H / 620);
    // Tower fills ~70% of the height (but never crowds the menu on narrow screens).
    const ts = Math.min((H * 0.7) / 660, (W * 0.34) / 300);
    const towerX = W * 0.74;
    this.hill.setPosition(towerX, H + 20 * ts).setScale(ts * 1.25);
    this.tower.setPosition(towerX, H - 150 * ts).setScale(ts);
    this.clouds.forEach((cl, i) => {
      cl.setScale(s * (0.8 + (i % 2) * 0.4));
      cl.setPosition(((i * 0.29 + 0.1) % 1) * W, H * (0.1 + (i % 3) * 0.1));
      this.tweens.killTweensOf(cl);
      this.tweens.add({ targets: cl, x: cl.x + W * 0.08, yoyo: true, repeat: -1, duration: 9000 + i * 1700, ease: 'Sine.easeInOut' });
    });
    // The emitter is scaled as a whole, so its spawn zone is expressed in emitter-local units.
    const k = s * 1.6;
    this.sand.setScale(k);
    this.sand.clearEmitZones();
    this.sand.addEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(0, (H * 0.3) / k, W / k, (H * 0.7) / k) } as never);
  }
}
