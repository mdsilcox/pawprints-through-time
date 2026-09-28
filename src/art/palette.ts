/**
 * Pawprints Through Time — house art style.
 * Soft rounded shapes, chunky 3px warm-brown outlines, top-left light with a single soft highlight,
 * dot eyes with a white shine, rosy cheeks. Everything is drawn procedurally (Canvas 2D) at boot.
 * These hex values are the single source of truth (mirrored in DECISIONS.md and main.css).
 */
export const PAL = {
  ink: '#4a3b35', // outlines, text
  inkSoft: '#7a655b',
  cream: '#fff4e0',
  paper: '#fff8ec',
  white: '#ffffff',
  blush: '#f7a7a0',

  grass: '#8fcf6f',
  grassDark: '#6fae55',
  grassLight: '#b5e08a',
  leaf: '#5fa85a',
  leafDark: '#4a8f4a',

  sand: '#f3dca2',
  sandDark: '#dfc084',
  water: '#6cc4d8',
  waterDeep: '#4fa6c4',
  foam: '#e8fbff',

  path: '#e9c89a',
  pathDark: '#d2ad7c',
  stone: '#cfc2b0',
  stoneDark: '#a99c8a',

  wood: '#b57a4e',
  woodDark: '#8a5a3a',
  woodLight: '#d49a6a',
  wall: '#fbe7c6',
  wallShade: '#ecd2a8',

  roofRed: '#e0715b',
  roofTeal: '#5fb3a8',
  roofPurple: '#9b86c9',
  roofBlue: '#6f9fd8',

  gold: '#f7c65a',
  goldDark: '#d9a23a',
  orange: '#f29e4c',
  pink: '#f4a3b4',
  red: '#e46a6a',
  blue: '#6fb3e0',
  navy: '#3f5a8a',
  purple: '#a58bd6',
  mint: '#9fe0c0',
  green: '#7cc47f',

  night: '#2d2a5a',
  lamp: '#ffd98a',
  firefly: '#f6ff9a',
} as const;

/** Colorblind-safe (Okabe–Ito based) set used for rhythm arrows and puzzle colors when the option is on. */
export const CB_SAFE = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000'];
/** Default friendly set for the same purposes. */
export const FRIENDLY = ['#f07b7b', '#6fb3e0', '#7cc47f', '#f7c65a', '#a58bd6', '#f29e4c', '#f4a3b4', '#4a3b35'];

export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export function shade(hex: string, amt: number): string {
  // amt in [-1, 1]: negative darkens toward ink, positive lightens toward white
  const n = hexToInt(hex);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (amt >= 0) {
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
  } else {
    const t = -amt;
    r = Math.round(r + (74 - r) * t);
    g = Math.round(g + (59 - g) * t);
    b = Math.round(b + (53 - b) * t);
  }
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
