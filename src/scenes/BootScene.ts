import Phaser from 'phaser';
import { app } from '../app';
import { registerAllTextures } from '../art/textures';

/** Waits for fonts, generates every procedural texture, then shows the title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const fontReady = Promise.race([
      Promise.all([
        document.fonts.load('600 24px Fredoka'),
        document.fonts.load('400 24px Fredoka'),
        document.fonts.load('700 24px Fredoka'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => undefined);

    void fontReady.then(() => {
      registerAllTextures(this);
      app.booted = true;
      document.getElementById('boot-splash')?.classList.add('gone');
      this.scene.start('title');
    });
  }
}
