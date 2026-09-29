import { PAL, shade } from './palette';
import { OUTLINE } from './draw';
import { registerSpecies, type HeadApi, type Rig, type CharSpec } from './character';

/**
 * Animal-folk heads and tails for the paper-doll body. Each head is drawn around rig.head
 * (centre x/y, radius r) for the front ('down'), back ('up') and 'side' (facing right) views.
 */
const L = OUTLINE - 0.5;
const INK = PAL.ink;

type Ctx = CanvasRenderingContext2D;

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, lw = L) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function ellipseF(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, lw = L, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function nose(ctx: Ctx, x: number, y: number, w: number, color: string = INK) {
  ctx.beginPath();
  ctx.moveTo(x - w, y - w * 0.4);
  ctx.quadraticCurveTo(x, y - w * 0.9, x + w, y - w * 0.4);
  ctx.quadraticCurveTo(x, y + w * 0.9, x - w, y - w * 0.4);
  ctx.fillStyle = color;
  ctx.fill();
}

function smile(ctx: Ctx, x: number, y: number, w: number) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x, y + 1);
  ctx.moveTo(x - w, y + 1);
  ctx.quadraticCurveTo(x - w / 2, y + 5, x, y + 1);
  ctx.quadraticCurveTo(x + w / 2, y + 5, x + w, y + 1);
  ctx.stroke();
}

/** Standard round furry head with optional muzzle patch. */
function baseHead(ctx: Ctx, spec: CharSpec, rig: Rig, api: HeadApi, opts: { muzzle?: boolean; muzzleColor?: string; faceY?: number } = {}) {
  const { x, y, r } = rig.head;
  circle(ctx, x, y, r, spec.skin);
  // soft top-left highlight
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.4, r * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (rig.facing === 'up') return;
  const side = rig.facing === 'side';
  if (opts.muzzle) {
    const mc = opts.muzzleColor ?? spec.fur2 ?? '#fff8f0';
    if (side) ellipseF(ctx, x + r * 0.62, y + 9, 11, 9, mc, 2);
    else ellipseF(ctx, x, y + 11, 13, 9.5, mc, 2);
  }
  api.drawFace(ctx, spec, rig, { eyeY: opts.faceY ?? 1, spread: 10.5 });
}

// ---------------------------------------------------------------- rabbit
function rabbitEars(ctx: Ctx, spec: CharSpec, rig: Rig, front: boolean) {
  const { x, y, r } = rig.head;
  const inner = '#f7b6c2';
  const ear = (ex: number, rot: number) => {
    ctx.save();
    ctx.translate(ex, y - r * 0.7);
    ctx.rotate(rot);
    ellipseF(ctx, 0, -22, 8.5, 22, spec.skin);
    if (front) ellipseF(ctx, 0, -20, 4.2, 15, inner, 0);
    ctx.restore();
  };
  if (rig.facing === 'side') ear(x - 4, -0.35);
  else {
    ear(x - 11, -0.18);
    ear(x + 11, 0.18);
  }
}

registerSpecies(
  'rabbit',
  (ctx, spec, rig, api) => {
    rabbitEars(ctx, spec, rig, rig.facing !== 'up');
    baseHead(ctx, spec, rig, api, { muzzle: true });
    if (rig.facing === 'up') return;
    const { x, y, r } = rig.head;
    const side = rig.facing === 'side';
    const nx = side ? x + r * 0.78 : x;
    nose(ctx, nx, y + 8, 3.5, '#e88a9a');
    if (!side) smile(ctx, x, y + 11, 4.5);
    // whiskers
    ctx.strokeStyle = shade(spec.skin, -0.35);
    ctx.lineWidth = 1.6;
    for (const s of side ? [1] : [-1, 1])
      for (const dy of [-2, 3]) {
        ctx.beginPath();
        ctx.moveTo(nx + s * 8, y + 10 + dy);
        ctx.lineTo(nx + s * 18, y + 8 + dy * 1.6);
        ctx.stroke();
      }
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    const bx = rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2;
    circle(ctx, bx, t.y + t.h - 4, 7.5, spec.fur2 ?? '#ffffff', 2.4);
  },
  (ctx, spec, rig) => {
    // ears poke up through any hat
    const { y, r } = rig.head;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 200, y - r * 0.95 - (spec.outfit.hat?.kind === 'chef' ? 22 : 6));
    ctx.clip();
    rabbitEars(ctx, spec, rig, rig.facing !== 'up');
    ctx.restore();
  },
);

// ---------------------------------------------------------------- owl
registerSpecies(
  'owl',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    // ear tufts
    for (const s of rig.facing === 'side' ? [-1] : [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.45, y - r * 0.8);
      ctx.lineTo(x + s * r * 0.95, y - r * 1.25);
      ctx.lineTo(x + s * r * 0.85, y - r * 0.55);
      ctx.closePath();
      ctx.fillStyle = shade(spec.skin, -0.12);
      ctx.fill();
      ctx.lineWidth = L;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    circle(ctx, x, y, r, spec.skin);
    if (rig.facing === 'up') {
      ctx.strokeStyle = shade(spec.skin, -0.25);
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y + 6 + i * 7, 10 + i * 2, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }
      return;
    }
    const side = rig.facing === 'side';
    // facial disc
    const fx = side ? x + 8 : x;
    ellipseF(ctx, fx, y + 3, side ? 17 : 23, 18, spec.fur2 ?? '#f3dcb8', 2);
    // big eyes with rings
    const eyes = side ? [fx + 6] : [fx - 10, fx + 10];
    for (const ex of eyes) {
      circle(ctx, ex, y + 1, 7.5, '#fffdf4', 2);
      circle(ctx, ex, y + 1, 4, INK, 0);
      circle(ctx, ex - 1.5, y - 0.5, 1.4, '#fff', 0);
    }
    // beak
    ctx.beginPath();
    ctx.moveTo(fx + (side ? 10 : -4), y + 8);
    ctx.lineTo(fx + (side ? 18 : 4), y + 8);
    ctx.lineTo(fx + (side ? 12 : 0), y + 16);
    ctx.closePath();
    ctx.fillStyle = PAL.gold;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    void api;
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    const bx = rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2;
    for (const a of [-0.4, 0, 0.4]) {
      ctx.save();
      ctx.translate(bx, t.y + t.h);
      ctx.rotate(a);
      ellipseF(ctx, 0, 5, 5, 10, shade(spec.skin, -0.1), 2);
      ctx.restore();
    }
  },
);

// ---------------------------------------------------------------- badger
registerSpecies(
  'badger',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    for (const s of rig.facing === 'side' ? [-0.3] : [-1, 1]) circle(ctx, x + s * r * 0.72, y - r * 0.7, 8, INK, 0);
    baseHead(ctx, spec, rig, api, { muzzle: false, faceY: 2 });
    const side = rig.facing === 'side';
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
    ctx.clip();
    // dark eye stripes
    ctx.fillStyle = '#3d3a3e';
    if (rig.facing === 'up') {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    } else if (side) {
      ctx.beginPath();
      ctx.ellipse(x + 6, y - 4, 22, 9, -0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + s * 12, y - 2, 8, 20, s * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // white centre stripe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (side) ctx.ellipse(x + 2, y - 12, 26, 6, -0.25, 0, Math.PI * 2);
    else ctx.ellipse(x, y - 8, 6.5, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    circle(ctx, x, y, r, 'rgba(0,0,0,0)');
    if (rig.facing === 'up') return;
    ellipseF(ctx, side ? x + r * 0.62 : x, y + 12, 10, 7, '#ffffff', 2);
    nose(ctx, side ? x + r * 0.85 : x, y + 9, 4.5);
    api.drawFace(ctx, spec, rig, { eyeY: 1, spread: 11, big: false });
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    ellipseF(ctx, rig.facing === 'side' ? t.x - 3 : t.x + t.w / 2, t.y + t.h - 2, 7, 5, spec.skin, 2);
  },
);

// ---------------------------------------------------------------- frog
registerSpecies('frog', (ctx, spec, rig, api) => {
  const { x, y, r } = rig.head;
  const side = rig.facing === 'side';
  // wide head
  ellipseF(ctx, x, y + 4, r + 5, r - 4, spec.skin);
  // eye bumps
  const eyes = side ? [x + 8] : [x - 13, x + 13];
  for (const ex of eyes) {
    circle(ctx, ex, y - r * 0.55, 11, spec.skin);
    if (rig.facing !== 'up') {
      circle(ctx, ex, y - r * 0.55, 7, '#fffdf4', 2);
      circle(ctx, ex + (side ? 2 : 0), y - r * 0.53, 3.6, INK, 0);
      circle(ctx, ex - 1, y - r * 0.6, 1.3, '#fff', 0);
    }
  }
  if (rig.facing === 'up') return;
  ellipseF(ctx, side ? x + 8 : x, y + 14, side ? 14 : 20, 7, spec.fur2 ?? '#e8f5c8', 0);
  // wide grin
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (side) ctx.arc(x + 14, y + 6, 10, 0.2 * Math.PI, 0.7 * Math.PI);
  else ctx.arc(x, y + 2, 16, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(247,140,140,0.5)';
  for (const bx of side ? [x + 6] : [x - 17, x + 17]) {
    ctx.beginPath();
    ctx.ellipse(bx, y + 9, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  void api;
});

// ---------------------------------------------------------------- goat
registerSpecies(
  'goat',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    const side = rig.facing === 'side';
    // horns
    for (const s of side ? [-0.4] : [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * 8, y - r * 0.8);
      ctx.quadraticCurveTo(x + s * 20, y - r * 1.5, x + s * 26, y - r * 0.95);
      ctx.lineWidth = 7 + L * 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#d9c9a6';
      ctx.stroke();
    }
    // floppy side ears
    for (const s of side ? [-1] : [-1, 1]) ellipseF(ctx, x + s * (r + 2), y + 2, 12, 6, spec.skin, L, s * 0.5);
    baseHead(ctx, spec, rig, api, { muzzle: true, muzzleColor: shade(spec.skin, -0.06) });
    if (rig.facing === 'up') return;
    nose(ctx, side ? x + r * 0.8 : x, y + 9, 4, '#e88a9a');
    // little beard
    const bx = side ? x + r * 0.55 : x;
    ctx.beginPath();
    ctx.moveTo(bx - 5, y + 17);
    ctx.lineTo(bx + 5, y + 17);
    ctx.lineTo(bx, y + 29);
    ctx.closePath();
    ctx.fillStyle = spec.fur2 ?? '#d9cbb3';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    ellipseF(ctx, rig.facing === 'side' ? t.x - 3 : t.x + t.w / 2, t.y + t.h - 4, 5, 7, spec.skin, 2);
  },
);

// ---------------------------------------------------------------- raccoon
registerSpecies(
  'raccoon',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    const side = rig.facing === 'side';
    for (const s of side ? [-0.3] : [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.35, y - r * 0.8);
      ctx.lineTo(x + s * r * 0.85, y - r * 1.2);
      ctx.lineTo(x + s * r * 0.95, y - r * 0.4);
      ctx.closePath();
      ctx.fillStyle = spec.skin;
      ctx.fill();
      ctx.lineWidth = L;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    baseHead(ctx, spec, rig, api, { muzzle: false });
    if (rig.facing === 'up') return;
    // mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#4f4a4a';
    ctx.beginPath();
    if (side) ctx.ellipse(x + 10, y + 1, 16, 7, 0, 0, Math.PI * 2);
    else ctx.ellipse(x, y + 1, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ellipseF(ctx, side ? x + r * 0.62 : x, y + 12, 11, 8, spec.fur2 ?? '#e8e2da', 2);
    nose(ctx, side ? x + r * 0.86 : x, y + 9, 4);
    // eyes shine on the mask
    const eyes = side ? [x + 13] : [x - 10.5, x + 10.5];
    for (const ex of eyes) {
      circle(ctx, ex, y + 1, 4.2, '#fffdf4', 0);
      circle(ctx, ex, y + 1, 2.6, INK, 0);
    }
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    const bx = rig.facing === 'side' ? t.x - 6 : t.x + t.w / 2 + 10;
    ctx.save();
    ctx.translate(bx, t.y + t.h - 4);
    ctx.rotate(rig.facing === 'side' ? -0.9 : 0.5);
    ellipseF(ctx, 0, 0, 8, 17, spec.skin);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 17, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#4f4a4a';
    for (const dy of [-8, 2, 12]) ctx.fillRect(-10, dy, 20, 4.5);
    ctx.restore();
    ctx.restore();
  },
);

// ---------------------------------------------------------------- flamingo
registerSpecies(
  'flamingo',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    circle(ctx, x, y, r, spec.skin);
    if (rig.facing === 'up') return;
    const side = rig.facing === 'side';
    // curved beak
    ctx.save();
    ctx.translate(side ? x + r * 0.7 : x, y + 8);
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.quadraticCurveTo(side ? 16 : 0, side ? -4 : 2, side ? 20 : 3, side ? 10 : 18);
    ctx.quadraticCurveTo(side ? 8 : -3, side ? 8 : 12, -7, 4);
    ctx.closePath();
    ctx.fillStyle = '#fff4e0';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(side ? 18 : 2, side ? 9 : 16, 4, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
    api.drawFace(ctx, spec, rig, { eyeY: -3, spread: 12 });
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    const bx = rig.facing === 'side' ? t.x - 4 : t.x + t.w / 2;
    for (const a of [-0.5, 0, 0.5]) {
      ctx.save();
      ctx.translate(bx, t.y + t.h - 6);
      ctx.rotate(a + (rig.facing === 'side' ? -1 : 0));
      ellipseF(ctx, 0, 8, 5, 11, shade(spec.skin, -0.12), 2);
      ctx.restore();
    }
  },
);

// ---------------------------------------------------------------- bear / dog / cat / fox / mouse / hedgehog / parrot
function roundEars(ctx: Ctx, spec: CharSpec, rig: Rig, size: number, inner?: string) {
  const { x, y, r } = rig.head;
  for (const s of rig.facing === 'side' ? [-0.4] : [-1, 1]) {
    circle(ctx, x + s * r * 0.72, y - r * 0.72, size, spec.skin);
    if (inner && rig.facing !== 'up') circle(ctx, x + s * r * 0.72, y - r * 0.72, size * 0.55, inner, 0);
  }
}
function pointyEars(ctx: Ctx, spec: CharSpec, rig: Rig, h: number, inner?: string) {
  const { x, y, r } = rig.head;
  for (const s of rig.facing === 'side' ? [-0.3] : [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * r * 0.25, y - r * 0.85);
    ctx.lineTo(x + s * r * 0.8, y - r * 0.85 - h);
    ctx.lineTo(x + s * r * 0.98, y - r * 0.35);
    ctx.closePath();
    ctx.fillStyle = spec.skin;
    ctx.fill();
    ctx.lineWidth = L;
    ctx.strokeStyle = INK;
    ctx.stroke();
    if (inner && rig.facing !== 'up') {
      ctx.beginPath();
      ctx.moveTo(x + s * r * 0.4, y - r * 0.8);
      ctx.lineTo(x + s * r * 0.78, y - r * 0.8 - h * 0.7);
      ctx.lineTo(x + s * r * 0.88, y - r * 0.45);
      ctx.closePath();
      ctx.fillStyle = inner;
      ctx.fill();
    }
  }
}
function muzzleNose(ctx: Ctx, spec: CharSpec, rig: Rig, color: string = INK) {
  if (rig.facing === 'up') return;
  const { x, y, r } = rig.head;
  const side = rig.facing === 'side';
  nose(ctx, side ? x + r * 0.85 : x, y + 9, 4.5, color);
  if (!side) smile(ctx, x, y + 12, 5);
}

registerSpecies(
  'bear',
  (ctx, spec, rig, api) => {
    roundEars(ctx, spec, rig, 9, spec.fur2);
    baseHead(ctx, spec, rig, api, { muzzle: true });
    muzzleNose(ctx, spec, rig);
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    circle(ctx, rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2, t.y + t.h - 3, 5, spec.skin, 2);
  },
);

registerSpecies(
  'dog',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    baseHead(ctx, spec, rig, api, { muzzle: true });
    for (const s of rig.facing === 'side' ? [-1] : [-1, 1]) ellipseF(ctx, x + s * (r - 2), y - 2, 8, 16, shade(spec.skin, -0.2), L, s * 0.3);
    muzzleNose(ctx, spec, rig);
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    ctx.save();
    ctx.translate(rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2 + 6, t.y + t.h - 6);
    ctx.rotate(-0.8);
    ellipseF(ctx, 0, -8, 4.5, 11, spec.skin, 2);
    ctx.restore();
  },
);

registerSpecies(
  'cat',
  (ctx, spec, rig, api) => {
    pointyEars(ctx, spec, rig, 14, '#f7b6c2');
    baseHead(ctx, spec, rig, api, { muzzle: false });
    if (rig.facing === 'up') return;
    const { x, y, r } = rig.head;
    const side = rig.facing === 'side';
    const nx = side ? x + r * 0.84 : x;
    nose(ctx, nx, y + 8, 3.5, '#e88a9a');
    if (!side) smile(ctx, x, y + 11, 4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    for (const s of side ? [1] : [-1, 1])
      for (const dy of [-2, 3]) {
        ctx.beginPath();
        ctx.moveTo(nx + s * 7, y + 10 + dy);
        ctx.lineTo(nx + s * 19, y + 8 + dy * 1.7);
        ctx.stroke();
      }
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    const bx = rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2 + 8;
    ctx.beginPath();
    ctx.moveTo(bx, t.y + t.h - 4);
    ctx.quadraticCurveTo(bx + 18, t.y + t.h - 10, bx + 12, t.y + t.h - 30);
    ctx.lineWidth = 6 + L * 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = spec.skin;
    ctx.stroke();
  },
);

registerSpecies(
  'fox',
  (ctx, spec, rig, api) => {
    pointyEars(ctx, spec, rig, 16, INK);
    baseHead(ctx, spec, rig, api, { muzzle: true, muzzleColor: '#ffffff' });
    muzzleNose(ctx, spec, rig);
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    ctx.save();
    ctx.translate(rig.facing === 'side' ? t.x - 8 : t.x + t.w / 2 + 12, t.y + t.h - 2);
    ctx.rotate(rig.facing === 'side' ? -1.1 : 0.6);
    ellipseF(ctx, 0, 0, 9, 18, spec.skin);
    ellipseF(ctx, 0, 12, 6, 6, '#ffffff', 0);
    ctx.restore();
  },
);

registerSpecies(
  'mouse',
  (ctx, spec, rig, api) => {
    roundEars(ctx, spec, rig, 14, '#f7b6c2');
    baseHead(ctx, spec, rig, api, { muzzle: false });
    muzzleNose(ctx, spec, rig, '#e88a9a');
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    const bx = rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2 + 6;
    ctx.beginPath();
    ctx.moveTo(bx, t.y + t.h - 4);
    ctx.bezierCurveTo(bx + 20, t.y + t.h, bx + 10, t.y + t.h - 26, bx + 24, t.y + t.h - 28);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e88a9a';
    ctx.stroke();
  },
);

registerSpecies('hedgehog', (ctx, spec, rig, api) => {
  const { x, y, r } = rig.head;
  // spikes behind
  ctx.fillStyle = shade(spec.skin, -0.35);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a - 0.2) * r, y + Math.sin(a - 0.2) * r);
    ctx.lineTo(x + Math.cos(a) * (r + 13), y + Math.sin(a) * (r + 13));
    ctx.lineTo(x + Math.cos(a + 0.2) * r, y + Math.sin(a + 0.2) * r);
    ctx.fill();
    ctx.stroke();
  }
  baseHead(ctx, { ...spec, skin: spec.fur2 ?? '#f3dcb8' }, rig, api, { muzzle: false });
  muzzleNose(ctx, spec, rig);
});

registerSpecies(
  'parrot',
  (ctx, spec, rig, api) => {
    const { x, y, r } = rig.head;
    // crest
    for (const a of [-0.3, 0, 0.3]) {
      ctx.save();
      ctx.translate(x, y - r + 2);
      ctx.rotate(a);
      ellipseF(ctx, 0, -9, 4.5, 11, spec.fur2 ?? PAL.gold, 2);
      ctx.restore();
    }
    circle(ctx, x, y, r, spec.skin);
    if (rig.facing === 'up') return;
    const side = rig.facing === 'side';
    ctx.beginPath();
    const bx = side ? x + r * 0.7 : x;
    ctx.moveTo(bx - 7, y + 3);
    ctx.quadraticCurveTo(bx + 12, y, bx + 6, y + 19);
    ctx.quadraticCurveTo(bx - 2, y + 12, bx - 7, y + 3);
    ctx.fillStyle = '#fff4e0';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    api.drawFace(ctx, spec, rig, { eyeY: -3, spread: 12 });
  },
  (ctx, spec, rig) => {
    const t = rig.torso;
    for (const [a, c] of [
      [-0.2, PAL.blue],
      [0.1, PAL.gold],
      [0.4, spec.skin],
    ] as [number, string][]) {
      ctx.save();
      ctx.translate(rig.facing === 'side' ? t.x - 2 : t.x + t.w / 2, t.y + t.h - 6);
      ctx.rotate(a + (rig.facing === 'side' ? -0.8 : 0));
      ellipseF(ctx, 0, 12, 4, 13, c, 2);
      ctx.restore();
    }
  },
);
