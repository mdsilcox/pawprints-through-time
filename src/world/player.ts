import Phaser from 'phaser';
import type { PlayerProfile } from '../core/state';
import { ensureCharacterTexture } from '../art/textures';
import { lookKey, specForPlayer } from '../data/clothes';
import { TILE, type Box } from './collision';
import { FEET_Y, FH } from '../art/character';

export type Facing4 = 'down' | 'up' | 'left' | 'right';

/** A player character in the world: sprite + shadow + (in 2P) a coloured marker. */
export class PlayerEntity {
  readonly container: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly marker: Phaser.GameObjects.Image;
  x: number;
  y: number;
  facing: Facing4 = 'down';
  moving = false;
  speedMult = 1;
  private animT = 0;
  private bob = 0;
  textureKey = '';
  /** extra visual offset (e.g. jumps) */
  hop = 0;
  /** mid-jump (a scripted hop): soup bounces leave `hop` alone */
  jumping = false;
  onStep: (() => void) | null = null;
  private lastStepFrame = -1;

  static readonly FEET: Omit<Box, 'x' | 'y'> = { hw: TILE * 0.26, hh: TILE * 0.14 };
  static readonly SPEED = TILE * 3.7; // world units per second

  constructor(
    private scene: Phaser.Scene,
    readonly index: 0 | 1,
    x: number,
    y: number,
    profile: PlayerProfile,
  ) {
    this.x = x;
    this.y = y;
    this.shadow = scene.add.image(0, 0, 'fx-shadow').setScale(1.1, 1);
    this.sprite = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, FEET_Y / FH);
    this.marker = scene.add.image(0, -150, index === 0 ? 'marker-p1' : 'marker-p2').setScale(0.9).setVisible(false);
    this.container = scene.add.container(x, y, [this.shadow, this.sprite, this.marker]);
    this.refreshLook(profile);
  }

  refreshLook(profile: PlayerProfile): void {
    const key = `pc-${lookKey(profile)}`;
    const old = this.textureKey;
    ensureCharacterTexture(this.scene, key, specForPlayer(profile));
    this.textureKey = key;
    this.applyFrame();
    // each outfit is a big sprite sheet: drop the old one unless the other player wears the same
    const others = (this.scene as unknown as { players?: { textureKey?: string }[] }).players ?? [];
    if (old && old !== key && !others.some((p) => p !== (this as unknown) && p.textureKey === old)) {
      this.scene.time.delayedCall(0, () => {
        if (this.scene.textures.exists(old)) this.scene.textures.remove(old);
      });
    }
  }

  setMarkerVisible(v: boolean): void {
    this.marker.setVisible(v);
  }

  get feet(): Box {
    return { x: this.x, y: this.y, ...PlayerEntity.FEET };
  }

  face(dx: number, dy: number): void {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
    if (Math.abs(dx) > Math.abs(dy) * 1.05) this.facing = dx > 0 ? 'right' : 'left';
    else this.facing = dy > 0 ? 'down' : 'up';
  }

  /** Called once per frame after the position was resolved. */
  tick(dtMs: number, moving: boolean): void {
    this.moving = moving;
    if (moving) this.animT += dtMs * (this.speedMult > 1.2 ? 1.5 : 1);
    else this.animT = 0;
    const stepFrame = moving ? Math.floor(this.animT / 260) : -1;
    if (stepFrame !== this.lastStepFrame && stepFrame >= 0) this.onStep?.();
    this.lastStepFrame = stepFrame;
    this.bob = moving ? Math.abs(Math.sin((this.animT / 260) * Math.PI)) * -3 : 0;
    this.container.setPosition(this.x, this.y);
    this.sprite.y = this.bob - this.hop;
    // squash & stretch on each step
    const step = moving ? Math.sin((this.animT / 260) * Math.PI * 2) : 0;
    this.sprite.setScale((this.facing === 'left' ? -1 : 1) * (1 + step * 0.025), 1 - step * 0.025);
    this.marker.y = -150 + Math.sin(performance.now() / 300) * 5 - this.hop;
    this.shadow.setScale(1.1 - this.hop / 300, 1 - this.hop / 300);
    this.container.setDepth(this.y);
    this.applyFrame();
  }

  private applyFrame(): void {
    if (!this.textureKey) return;
    const dir = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    let pose = 'idle';
    if (this.moving) pose = Math.floor(this.animT / 260) % 2 === 0 ? 'walkA' : 'walkB';
    this.sprite.setTexture(this.textureKey, `${dir}-${pose}`);
  }

  /** Cheerful little hop (e.g. when joining the game). */
  hopOnce(): void {
    this.scene.tweens.add({ targets: this, hop: 30, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
  }

  destroy(): void {
    this.container.destroy();
  }
}
