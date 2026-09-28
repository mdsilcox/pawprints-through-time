import Phaser from 'phaser';

/**
 * Crisp rendering on high-DPI screens: the canvas backing store is sized in device pixels
 * (capped at 2x for phone GPUs) and shown at CSS size via Phaser's `zoom`.
 * Scenes lay themselves out from `scale.width/height` and listen for the RESIZE event.
 */
export const MAX_DPR = 2;

export function currentDpr(): number {
  return Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
}

export function viewportCss(): { w: number; h: number } {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  return { w: Math.max(200, w), h: Math.max(150, h) };
}

export function initialScaleConfig(parent: string): Phaser.Types.Core.ScaleConfig {
  const dpr = currentDpr();
  const { w, h } = viewportCss();
  return {
    mode: Phaser.Scale.NONE,
    parent,
    width: Math.round(w * dpr),
    height: Math.round(h * dpr),
    zoom: 1 / dpr,
    autoRound: false,
  };
}

export function installResizeHandling(game: Phaser.Game): () => void {
  let raf = 0;
  const apply = () => {
    raf = 0;
    const dpr = currentDpr();
    const { w, h } = viewportCss();
    const tw = Math.round(w * dpr);
    const th = Math.round(h * dpr);
    if (game.scale.zoom !== 1 / dpr) game.scale.setZoom(1 / dpr);
    if (game.scale.width !== tw || game.scale.height !== th) game.scale.resize(tw, th);
    else game.scale.refresh();
    document.documentElement.style.setProperty('--vh', `${h / 100}px`);
    document.documentElement.style.setProperty('--vw', `${w / 100}px`);
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(apply);
  };
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', () => setTimeout(schedule, 150));
  apply();
  return () => {
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
  };
}

/** True on phones/tablets (coarse pointer or touch points) — used to decide whether to show touch controls. */
export function isTouchDevice(): boolean {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return coarse || (navigator.maxTouchPoints ?? 0) > 0;
}
