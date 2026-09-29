import { PAL, shade } from './palette';
import { makeCanvas, OUTLINE } from './draw';

/**
 * Paper-doll characters. A single rig (head, torso, arms, legs) is posed per frame and clothing
 * layers draw onto it, so every outfit change is instantly visible in the world, the dance floor
 * and the bowling lane. Players are human kids; neighbours use the same body with animal heads.
 */

export const FW = 96;
/** frame height includes headroom above the rig for tall hats and bunny ears */
export const TOP_PAD = 26;
export const FH = 128 + TOP_PAD;
/** y of the feet inside a frame (sprite origin) */
export const FEET_Y = 122 + TOP_PAD;

export type Facing = 'down' | 'up' | 'side';
export type Pose = 'idle' | 'walkA' | 'walkB' | 'cheer' | 'left' | 'right' | 'squat' | 'clap' | 'bowl' | 'wave' | 'sit';

export const FRAMES: { name: string; facing: Facing; pose: Pose }[] = [
  { name: 'down-idle', facing: 'down', pose: 'idle' },
  { name: 'down-walkA', facing: 'down', pose: 'walkA' },
  { name: 'down-walkB', facing: 'down', pose: 'walkB' },
  { name: 'up-idle', facing: 'up', pose: 'idle' },
  { name: 'up-walkA', facing: 'up', pose: 'walkA' },
  { name: 'up-walkB', facing: 'up', pose: 'walkB' },
  { name: 'side-idle', facing: 'side', pose: 'idle' },
  { name: 'side-walkA', facing: 'side', pose: 'walkA' },
  { name: 'side-walkB', facing: 'side', pose: 'walkB' },
  { name: 'dance-cheer', facing: 'down', pose: 'cheer' },
  { name: 'dance-left', facing: 'down', pose: 'left' },
  { name: 'dance-right', facing: 'down', pose: 'right' },
  { name: 'dance-squat', facing: 'down', pose: 'squat' },
  { name: 'dance-clap', facing: 'down', pose: 'clap' },
  { name: 'bowl', facing: 'side', pose: 'bowl' },
  { name: 'wave', facing: 'down', pose: 'wave' },
];

export type Species =
  | 'human'
  | 'cat'
  | 'dog'
  | 'bear'
  | 'fox'
  | 'rabbit'
  | 'mouse'
  | 'owl'
  | 'frog'
  | 'hedgehog'
  | 'raccoon'
  | 'goat'
  | 'badger'
  | 'flamingo'
  | 'parrot';

/** A clothing piece ready to draw: which drawing routine plus its colours. */
export interface WornPiece {
  kind: string;
  main: string;
  accent: string;
  extra?: string;
}

export interface CharSpec {
  species: Species;
  skin: string; // skin or main fur
  fur2?: string; // muzzle / belly / markings
  hair?: string;
  hairStyle?: number;
  eye?: string;
  outfit: {
    hat?: WornPiece | null;
    top?: WornPiece | null;
    bottom?: WornPiece | null;
    shoes?: WornPiece | null;
    acc?: WornPiece | null;
  };
}

interface Pt {
  x: number;
  y: number;
}
interface Limb {
  s: Pt; // shoulder / hip
  e: Pt; // hand / foot end
}
export interface Rig {
  facing: Facing;
  pose: Pose;
  head: { x: number; y: number; r: number };
  torso: { x: number; y: number; w: number; h: number };
  armBack: Limb; // left arm (front view) / far arm (side)
  armFront: Limb; // right arm (front view) / near arm (side)
  legBack: Limb;
  legFront: Limb;
  lean: number;
}

const L = OUTLINE - 0.5;
const INK = PAL.ink;

export function makeRig(facing: Facing, pose: Pose): Rig {
  const cx = 48;
  let bob = 0;
  if (pose === 'walkA' || pose === 'walkB') bob = -2;
  if (pose === 'squat') bob = 7;
  if (pose === 'cheer') bob = -3;
  if (pose === 'sit') bob = 10;
  const headY = 44 + bob;
  const ty = 70 + bob;
  const side = facing === 'side';
  const torso = side ? { x: cx - 13, y: ty, w: 26, h: 29 } : { x: cx - 18, y: ty, w: 36, h: 29 };
  const hipY = ty + 25;
  const footY = 118;
  let legBack: Limb;
  let legFront: Limb;
  if (!side) {
    let lx = cx - 8;
    let rx = cx + 8;
    let lLift = 0;
    let rLift = 0;
    if (pose === 'walkA') lLift = 5;
    if (pose === 'walkB') rLift = 5;
    if (pose === 'squat') {
      lx -= 6;
      rx += 6;
    }
    if (pose === 'left') lx -= 3;
    if (pose === 'right') rx += 3;
    legBack = { s: { x: cx - 8, y: hipY }, e: { x: lx, y: footY - lLift } };
    legFront = { s: { x: cx + 8, y: hipY }, e: { x: rx, y: footY - rLift } };
  } else {
    let swing = 0;
    if (pose === 'walkA') swing = 7;
    if (pose === 'walkB') swing = -7;
    if (pose === 'bowl') swing = 9;
    legBack = { s: { x: cx - 3, y: hipY }, e: { x: cx - 3 - swing, y: footY - (swing < 0 ? 2 : 0) } };
    legFront = { s: { x: cx + 3, y: hipY }, e: { x: cx + 3 + swing, y: footY - (swing > 0 ? 2 : 0) } };
  }
  if (pose === 'sit') {
    legBack = { s: { x: cx - 8, y: hipY }, e: { x: cx - 10, y: hipY + 12 } };
    legFront = { s: { x: cx + 8, y: hipY }, e: { x: cx + 10, y: hipY + 12 } };
  }

  const sy = ty + 6;
  let armBack: Limb;
  let armFront: Limb;
  if (!side) {
    const lS = { x: cx - 17, y: sy };
    const rS = { x: cx + 17, y: sy };
    let lH = { x: cx - 23, y: ty + 25 };
    let rH = { x: cx + 23, y: ty + 25 };
    switch (pose) {
      case 'walkA':
        lH = { x: cx - 22, y: ty + 21 };
        rH = { x: cx + 24, y: ty + 27 };
        break;
      case 'walkB':
        lH = { x: cx - 24, y: ty + 27 };
        rH = { x: cx + 22, y: ty + 21 };
        break;
      case 'cheer':
        lH = { x: cx - 27, y: headY - 34 };
        rH = { x: cx + 27, y: headY - 34 };
        break;
      case 'left':
        lH = { x: cx - 44, y: ty + 0 };
        rH = { x: cx + 22, y: ty + 24 };
        break;
      case 'right':
        lH = { x: cx - 22, y: ty + 24 };
        rH = { x: cx + 44, y: ty + 0 };
        break;
      case 'squat':
        lH = { x: cx - 32, y: ty + 12 };
        rH = { x: cx + 32, y: ty + 12 };
        break;
      case 'clap':
        lH = { x: cx - 5, y: ty + 12 };
        rH = { x: cx + 5, y: ty + 12 };
        break;
      case 'wave':
        rH = { x: cx + 32, y: headY - 18 };
        break;
      case 'sit':
        lH = { x: cx - 20, y: ty + 22 };
        rH = { x: cx + 20, y: ty + 22 };
        break;
    }
    armBack = { s: lS, e: lH };
    armFront = { s: rS, e: rH };
  } else {
    const s = { x: cx, y: sy };
    let front = { x: cx + 2, y: ty + 26 };
    let back = { x: cx - 2, y: ty + 25 };
    if (pose === 'walkA') {
      front = { x: cx + 11, y: ty + 22 };
      back = { x: cx - 9, y: ty + 22 };
    } else if (pose === 'walkB') {
      front = { x: cx - 9, y: ty + 23 };
      back = { x: cx + 10, y: ty + 21 };
    } else if (pose === 'bowl') {
      front = { x: cx + 32, y: ty + 30 };
      back = { x: cx - 16, y: ty + 8 };
    }
    armBack = { s: { ...s }, e: back };
    armFront = { s, e: front };
  }
  return {
    facing,
    pose,
    head: { x: cx + (pose === 'bowl' ? 6 : 0), y: headY + (pose === 'bowl' ? 4 : 0), r: 28 },
    torso,
    armBack,
    armFront,
    legBack,
    legFront,
    lean: pose === 'bowl' ? 0.18 : 0,
  };
}

// ------------------------------------------------------------------ primitives
function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, color: string, outline = true) {
  ctx.lineCap = 'round';
  if (outline) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = w + L * 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, lw = L, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[], fill: string, lw = L) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r as number);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function withClip(ctx: CanvasRenderingContext2D, path: () => void, fn: () => void) {
  ctx.save();
  path();
  ctx.clip();
  fn();
  ctx.restore();
}

// ------------------------------------------------------------------ body parts
const ARM_W = 9;
const LEG_W = 11;

function drawLeg(ctx: CanvasRenderingContext2D, leg: Limb, spec: CharSpec, rig: Rig) {
  const b = spec.outfit.bottom;
  const skin = spec.skin;
  const long = b && ['pants', 'jeans', 'pantaloons', 'hose'].includes(b.kind);
  const knee = b && ['breeches', 'shorts', 'cuffed', 'shendyt'].includes(b.kind);
  limb(ctx, leg.s, leg.e, LEG_W, b?.kind === 'hose' || b?.kind === 'breeches' ? b.accent : skin);
  if (long) {
    limb(ctx, leg.s, lerp(leg.s, leg.e, b!.kind === 'pantaloons' ? 0.78 : 0.92), LEG_W + 3, b!.main);
    if (b!.kind === 'jeans') {
      const cuff = lerp(leg.s, leg.e, 0.8);
      limb(ctx, cuff, lerp(leg.s, leg.e, 0.92), LEG_W + 4, b!.accent);
    }
  } else if (knee && b) {
    const t = b.kind === 'breeches' ? 0.62 : b.kind === 'cuffed' ? 0.72 : 0.45;
    limb(ctx, leg.s, lerp(leg.s, leg.e, t), LEG_W + 3, b.main);
    if (b.kind === 'cuffed') limb(ctx, lerp(leg.s, leg.e, 0.62), lerp(leg.s, leg.e, 0.72), LEG_W + 4, b.accent);
  }
  drawShoe(ctx, leg, spec, rig);
}

function drawShoe(ctx: CanvasRenderingContext2D, leg: Limb, spec: CharSpec, rig: Rig) {
  const sh = spec.outfit.shoes;
  const { x, y } = leg.e;
  const side = rig.facing === 'side';
  const dir = side ? 4 : 0;
  if (!sh) {
    ellipse(ctx, x + dir, y + 1, side ? 8 : 6.5, 4.5, spec.skin);
    return;
  }
  const w = side ? 10 : 8;
  switch (sh.kind) {
    case 'boots':
    case 'rainboots':
      rrect(ctx, x - 7, y - 12, 14, 15, [4, 4, 6, 6], sh.main);
      ellipse(ctx, x + dir, y + 1, w + 1, 5, sh.main);
      rrect(ctx, x - 7, y - 12, 14, 4, 2, sh.accent, 2);
      break;
    case 'sandals':
      ellipse(ctx, x + dir, y + 2, w, 4, sh.main);
      ellipse(ctx, x + dir, y - 1, w - 2, 3.5, spec.skin, 2);
      ctx.strokeStyle = sh.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 5 + dir, y - 1);
      ctx.lineTo(x + 5 + dir, y - 1);
      ctx.stroke();
      break;
    case 'saddle':
      ellipse(ctx, x + dir, y + 1, w + 1, 5.5, sh.main);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x + dir, y + 1, w + 1, 5.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = sh.accent;
      ctx.fillRect(x + dir - 4, y - 6, 8, 12);
      ctx.restore();
      ctx.lineWidth = L;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.ellipse(x + dir, y + 1, w + 1, 5.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'skates':
      ellipse(ctx, x + dir, y - 1, w + 1, 6, sh.main);
      ctx.fillStyle = INK;
      for (const k of [-5, 5]) {
        ctx.beginPath();
        ctx.arc(x + dir + k, y + 6, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'buckle':
      ellipse(ctx, x + dir, y + 1, w + 1, 5.5, sh.main);
      rrect(ctx, x + dir - 3, y - 3, 6, 5, 1, sh.accent, 1.5);
      break;
    case 'slippers':
      ellipse(ctx, x + dir + (side ? 2 : 0), y + 1, w + 2, 5, sh.main);
      ellipse(ctx, x + dir + (side ? 6 : 0), y - 2, 3, 2.5, sh.accent, 1.5);
      break;
    default: // sneakers
      ellipse(ctx, x + dir, y + 1, w + 1, 5.5, sh.main);
      ctx.fillStyle = sh.accent;
      ctx.beginPath();
      ctx.ellipse(x + dir, y + 4.5, w, 2, 0, 0, Math.PI);
      ctx.fill();
  }
}

function sleeveLen(top: WornPiece | null | undefined): number {
  if (!top) return 0.35;
  switch (top.kind) {
    case 'tee':
    case 'bowling':
    case 'sailor':
    case 'tunic':
      return 0.45;
    case 'vest':
      return 0;
    default:
      return 0.88;
  }
}

function drawArm(ctx: CanvasRenderingContext2D, arm: Limb, spec: CharSpec, puff = false) {
  const top = spec.outfit.top;
  const sl = sleeveLen(top);
  limb(ctx, arm.s, arm.e, ARM_W, spec.skin);
  if (sl > 0) {
    const color = top ? (top.kind === 'jacket' ? top.accent : top.main) : '#ffffff';
    limb(ctx, arm.s, lerp(arm.s, arm.e, sl), ARM_W + 3, color);
    if (puff || top?.kind === 'doublet') ellipse(ctx, lerp(arm.s, arm.e, 0.22).x, lerp(arm.s, arm.e, 0.22).y, 7.5, 7.5, top?.accent ?? color);
    if (top?.kind === 'sailor') {
      ctx.save();
      ctx.strokeStyle = top.accent;
      ctx.lineWidth = 2.5;
      const m = lerp(arm.s, arm.e, 0.3);
      ctx.beginPath();
      ctx.moveTo(m.x - 5, m.y);
      ctx.lineTo(m.x + 5, m.y);
      ctx.stroke();
      ctx.restore();
    }
  }
  // hand
  ellipse(ctx, arm.e.x, arm.e.y, 5.2, 5.2, spec.skin, L - 1);
}

function torsoPath(ctx: CanvasRenderingContext2D, rig: Rig, extraBottom = 0, flare = 0) {
  const t = rig.torso;
  ctx.beginPath();
  if (flare) {
    ctx.moveTo(t.x + 6, t.y);
    ctx.lineTo(t.x + t.w - 6, t.y);
    ctx.quadraticCurveTo(t.x + t.w + 2, t.y + 4, t.x + t.w + flare, t.y + t.h + extraBottom);
    ctx.lineTo(t.x - flare, t.y + t.h + extraBottom);
    ctx.quadraticCurveTo(t.x - 2, t.y + 4, t.x + 6, t.y);
    ctx.closePath();
  } else {
    ctx.roundRect(t.x, t.y, t.w, t.h + extraBottom, [12, 12, 8, 8]);
  }
}

function drawBottomOverTorso(ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig) {
  const b = spec.outfit.bottom;
  if (!b) return;
  const t = rig.torso;
  const hipY = t.y + t.h - 8;
  const side = rig.facing === 'side';
  switch (b.kind) {
    case 'skirt':
    case 'pleated':
    case 'poodle': {
      const flare = b.kind === 'poodle' ? 14 : 8;
      const len = b.kind === 'poodle' ? 22 : 17;
      ctx.beginPath();
      ctx.moveTo(t.x + 2, hipY);
      ctx.lineTo(t.x + t.w - 2, hipY);
      ctx.quadraticCurveTo(t.x + t.w + flare * 0.6, hipY + len * 0.6, t.x + t.w + flare - (side ? 6 : 0), hipY + len);
      ctx.quadraticCurveTo(t.x + t.w / 2, hipY + len + 4, t.x - flare + (side ? 6 : 0), hipY + len);
      ctx.quadraticCurveTo(t.x - flare * 0.6, hipY + len * 0.6, t.x + 2, hipY);
      ctx.closePath();
      ctx.fillStyle = b.main;
      ctx.fill();
      ctx.lineWidth = L;
      ctx.strokeStyle = INK;
      ctx.stroke();
      if (b.kind === 'pleated') {
        ctx.strokeStyle = shade(b.main, -0.3);
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          const x = t.x - 4 + ((t.w + 8) * i) / 4;
          ctx.beginPath();
          ctx.moveTo(x, hipY + 3);
          ctx.lineTo(x + (i - 2) * 3, hipY + len - 1);
          ctx.stroke();
        }
      }
      if (b.kind === 'poodle' && rig.facing !== 'up') {
        // little poodle appliqué
        const px = t.x + t.w * (side ? 0.7 : 0.62);
        const py = hipY + 13;
        ctx.fillStyle = b.accent;
        for (const [dx, dy, r] of [
          [0, 0, 4],
          [5, -3, 3],
          [-4, 3, 2.4],
          [3, 5, 2],
          [7, -7, 2.4],
        ]) {
          ctx.beginPath();
          ctx.arc(px + dx, py + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'shendyt': {
      ctx.beginPath();
      ctx.moveTo(t.x + 1, hipY);
      ctx.lineTo(t.x + t.w - 1, hipY);
      ctx.lineTo(t.x + t.w + 3, hipY + 16);
      ctx.lineTo(t.x - 3, hipY + 16);
      ctx.closePath();
      ctx.fillStyle = b.main;
      ctx.fill();
      ctx.lineWidth = L;
      ctx.strokeStyle = INK;
      ctx.stroke();
      if (rig.facing !== 'up') {
        // pleated front panel + belt
        ctx.beginPath();
        ctx.moveTo(t.x + t.w / 2 - 5, hipY + 2);
        ctx.lineTo(t.x + t.w / 2 + 5, hipY + 2);
        ctx.lineTo(t.x + t.w / 2 + 8, hipY + 16);
        ctx.lineTo(t.x + t.w / 2 - 8, hipY + 16);
        ctx.closePath();
        ctx.fillStyle = shade(b.main, -0.08);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      rrect(ctx, t.x - 1, hipY - 3, t.w + 2, 6, 3, b.accent, 2);
      break;
    }
    case 'pantaloons':
    case 'breeches':
      rrect(ctx, t.x - 2, hipY - 2, t.w + 4, 12, [4, 4, 8, 8], b.main);
      rrect(ctx, t.x - 1, hipY - 3, t.w + 2, 5, 2, b.accent, 2);
      break;
    default: {
      // shorts / pants / jeans waist band
      rrect(ctx, t.x, hipY - 1, t.w, 10, [3, 3, 6, 6], b.main);
      if (b.kind === 'jeans' || b.kind === 'cuffed' || b.kind === 'shorts') {
        ctx.strokeStyle = shade(b.main, 0.35);
        ctx.setLineDash([2, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(t.x + 3, hipY + 3);
        ctx.lineTo(t.x + t.w - 3, hipY + 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

function drawTop(ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig) {
  const top = spec.outfit.top;
  const t = rig.torso;
  const main = top?.main ?? '#ffffff';
  const accent = top?.accent ?? '#e8e0d0';
  const back = rig.facing === 'up';
  const side = rig.facing === 'side';
  const kind = top?.kind ?? 'undershirt';
  let extra = 0;
  let flare = 0;
  if (kind === 'coat') {
    extra = 16;
    flare = 5;
  } else if (kind === 'tunic' || kind === 'smock') {
    extra = 10;
    flare = 4;
  } else if (kind === 'doublet') {
    extra = 6;
    flare = 3;
  }
  torsoPath(ctx, rig, extra, flare);
  ctx.fillStyle = main;
  ctx.fill();
  // patterns
  withClip(
    ctx,
    () => torsoPath(ctx, rig, extra, flare),
    () => {
      if (kind === 'tee' && top?.extra === 'stripes') {
        ctx.fillStyle = accent;
        for (let y = t.y + 6; y < t.y + t.h + extra; y += 9) ctx.fillRect(t.x - 10, y, t.w + 20, 4);
      }
      if (kind === 'sailor') {
        ctx.fillStyle = accent;
        for (let y = t.y + 5; y < t.y + t.h; y += 7) ctx.fillRect(t.x - 10, y, t.w + 20, 3);
      }
      if (kind === 'bowling' && !side) {
        ctx.fillStyle = accent;
        ctx.fillRect(t.x + t.w * 0.28, t.y - 2, t.w * 0.16, t.h + 4);
        ctx.fillRect(t.x + t.w * 0.56, t.y - 2, t.w * 0.16, t.h + 4);
      }
      if (kind === 'jacket' && !back) {
        ctx.fillStyle = accent;
        ctx.fillRect(t.x - 4, t.y + t.h - 6, t.w + 8, 8);
      }
      if (kind === 'smock') {
        const dots = [PAL.red, PAL.blue, PAL.gold, PAL.green];
        dots.forEach((c, i) => {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(t.x + 8 + ((i * 11) % (t.w - 10)), t.y + 10 + ((i * 13) % 22), 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // soft shading
      ctx.fillStyle = 'rgba(74,59,53,0.13)';
      ctx.fillRect(t.x - 10, t.y + t.h + extra - 8, t.w + 20, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(t.x + t.w * 0.3, t.y + 7, t.w * 0.22, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    },
  );
  torsoPath(ctx, rig, extra, flare);
  ctx.lineWidth = L;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // details on the front
  if (!back) {
    const cx = side ? t.x + t.w * 0.65 : t.x + t.w / 2;
    switch (kind) {
      case 'hoodie': {
        if (!side) {
          rrect(ctx, t.x + 8, t.y + 16, t.w - 16, 10, 5, shade(main, -0.12), 2);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx - 5, t.y + 2);
          ctx.lineTo(cx - 6, t.y + 12);
          ctx.moveTo(cx + 5, t.y + 2);
          ctx.lineTo(cx + 6, t.y + 12);
          ctx.stroke();
        }
        break;
      }
      case 'shirt':
      case 'bowling':
      case 'coat':
      case 'jacket':
      case 'cardigan': {
        // collar
        ctx.fillStyle = kind === 'coat' ? accent : '#ffffff';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        if (!side) {
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx, t.y + 1);
            ctx.lineTo(cx + s * 11, t.y - 1);
            ctx.lineTo(cx + s * 7, t.y + 9);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
        const btn = kind === 'coat' ? PAL.gold : shade(main, -0.35);
        for (let i = 0; i < (kind === 'coat' ? 4 : 3); i++) {
          ctx.fillStyle = btn;
          ctx.beginPath();
          ctx.arc(cx + (side ? 2 : 0), t.y + 11 + i * 7, kind === 'coat' ? 2.6 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        if (kind === 'jacket' && !side) {
          ctx.fillStyle = accent;
          ctx.font = 'bold 14px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('T', t.x + 10, t.y + 19);
        }
        break;
      }
      case 'doublet': {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 6, t.y + 8 + i * 7);
          ctx.lineTo(cx + 6, t.y + 8 + i * 7);
          ctx.stroke();
        }
        rrect(ctx, t.x - 1, t.y + t.h - 2, t.w + 2, 5, 2, PAL.woodDark, 1.5);
        break;
      }
      case 'tunic': {
        rrect(ctx, t.x - 1, t.y + t.h - 3, t.w + 2, 5, 2, accent, 1.5);
        break;
      }
      case 'vest': {
        ctx.fillStyle = accent;
        ctx.fillRect(cx - 4, t.y + 2, 8, t.h - 3);
        break;
      }
      case 'tee':
      case 'sailor':
      case 'undershirt':
      default: {
        if (!side) {
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, t.y + 1, 6, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
        if (kind === 'tee' && top?.extra === 'star' && !side) {
          drawStar(ctx, cx, t.y + 16, 7, accent);
        }
        if (kind === 'sailor' && !side) {
          ctx.fillStyle = PAL.navy;
          ctx.beginPath();
          ctx.moveTo(cx - 12, t.y);
          ctx.lineTo(cx + 12, t.y);
          ctx.lineTo(cx, t.y + 11);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = PAL.red;
          ctx.beginPath();
          ctx.moveTo(cx - 4, t.y + 7);
          ctx.lineTo(cx + 4, t.y + 7);
          ctx.lineTo(cx, t.y + 14);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  } else if (kind === 'hoodie') {
    // hood on the back
    rrect(ctx, t.x + 6, t.y - 4, t.w - 12, 14, [2, 2, 10, 10], shade(main, -0.1), 2.5);
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

// ------------------------------------------------------------------ heads
export const HAIR_STYLES = ['Tousled', 'Bob', 'Long', 'Curly', 'Pigtails', 'Ponytail'] as const;

function drawHairBack(ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig) {
  if (spec.species !== 'human' || (spec.hairStyle ?? 0) < 0) return;
  const { x, y, r } = rig.head;
  const c = spec.hair ?? '#5a3a29';
  const st = spec.hairStyle ?? 0;
  const side = rig.facing === 'side';
  if (st === 2) {
    // long hair falls behind shoulders
    rrect(ctx, x - r + (side ? -2 : 1), y - 6, r * 2 - (side ? 12 : 2), r + 26, [10, 10, 14, 14], c);
  } else if (st === 4 && rig.facing !== 'side') {
    ellipse(ctx, x - r - 2, y + 4, 10, 12, c);
    ellipse(ctx, x + r + 2, y + 4, 10, 12, c);
  } else if (st === 4 && side) {
    ellipse(ctx, x - r + 2, y + 6, 10, 12, c);
  } else if (st === 5 && (side || rig.facing === 'up')) {
    const px = side ? x - r - 4 : x;
    ellipse(ctx, px, y + (side ? 4 : 18), 9, 16, c, L, side ? 0.4 : 0);
  } else if (st === 1) {
    rrect(ctx, x - r - 2, y - 8, r * 2 + 4, r + 12, [16, 16, 8, 8], c);
  } else if (st === 3) {
    for (const [dx, dy] of [
      [-r, 0],
      [r, 0],
      [-r + 4, 12],
      [r - 4, 12],
    ])
      ellipse(ctx, x + dx, y + dy, 11, 11, c);
  }
}

function hairCap(ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig) {
  if ((spec.hairStyle ?? 0) < 0) return; // mannequin
  const { x, y, r } = rig.head;
  const c = spec.hair ?? '#5a3a29';
  const st = spec.hairStyle ?? 0;
  const facing = rig.facing;
  const hi = shade(c, 0.25);
  if (facing === 'up') {
    // back of head fully covered by hair
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = L;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.strokeStyle = shade(c, -0.25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r + 6);
    ctx.quadraticCurveTo(x + 3, y, x - 2, y + r - 8);
    ctx.stroke();
    if (st === 3) {
      for (let i = 0; i < 6; i++) ellipse(ctx, x - r + 6 + i * 9, y - r + 8 + (i % 2) * 4, 8, 8, c, 2);
    }
    return;
  }
  const side = facing === 'side';
  ctx.save();
  ctx.beginPath();
  // hair mass over the top of the head
  if (st === 3) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      ctx.moveTo(x + Math.cos(a) * r * 0.9 + 9, y + Math.sin(a) * r * 0.9);
      ctx.arc(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9 - 2, 10, 0, Math.PI * 2);
    }
  } else if (side) {
    ctx.moveTo(x + r * 0.9, y - 6);
    ctx.quadraticCurveTo(x + r * 0.7, y - r - 6, x - 2, y - r - 4);
    ctx.quadraticCurveTo(x - r - 6, y - r + 2, x - r - 2, y + 10);
    ctx.lineTo(x - 6, y + 6);
    ctx.quadraticCurveTo(x + 4, y - 12, x + r * 0.9, y - 6);
  } else {
    ctx.moveTo(x - r - 1, y + 4);
    ctx.quadraticCurveTo(x - r - 2, y - r - 4, x, y - r - 4);
    ctx.quadraticCurveTo(x + r + 2, y - r - 4, x + r + 1, y + 4);
    // bangs
    if (st === 1 || st === 2) {
      ctx.lineTo(x + r - 4, y - 6);
      ctx.lineTo(x - r + 4, y - 6);
    } else {
      ctx.quadraticCurveTo(x + r * 0.6, y - 16, x + r * 0.3, y - 6);
      ctx.quadraticCurveTo(x + r * 0.15, y - 16, x - 2, y - 8);
      ctx.quadraticCurveTo(x - r * 0.3, y - 18, x - r * 0.5, y - 7);
      ctx.quadraticCurveTo(x - r * 0.75, y - 14, x - r - 1, y + 4);
    }
    ctx.closePath();
  }
  ctx.fillStyle = c;
  ctx.fill();
  ctx.lineWidth = L;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
  // shine
  ctx.strokeStyle = hi;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x - (side ? 4 : 8), y - r + 12, 8, Math.PI * 1.1, Math.PI * 1.55);
  ctx.stroke();
  if (st === 0 && !side) {
    // little tuft on top
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - r - 2);
    ctx.quadraticCurveTo(x + 2, y - r - 14, x + 9, y - r - 8);
    ctx.quadraticCurveTo(x + 4, y - r - 4, x + 5, y - r);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function drawFace(ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig, opts: { eyeY?: number; spread?: number; big?: boolean } = {}) {
  const { x, y } = rig.head;
  if (rig.facing === 'up') return;
  const eyeY = y + (opts.eyeY ?? 4);
  const spread = opts.spread ?? 10;
  const er = opts.big ? 5 : 3.8;
  const eye = spec.eye ?? INK;
  const happy = rig.pose === 'cheer' || rig.pose === 'wave' || rig.pose === 'clap';
  const eyesAt = rig.facing === 'side' ? [x + 13] : [x - spread, x + spread];
  for (const ex of eyesAt) {
    if (happy) {
      ctx.strokeStyle = eye;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, eyeY + 2, er, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, er * 0.85, er, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex - er * 0.3, eyeY - er * 0.4, er * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // blush
  ctx.fillStyle = 'rgba(247,140,140,0.45)';
  const bl = rig.facing === 'side' ? [x + 10] : [x - spread - 6, x + spread + 6];
  for (const bx of bl) {
    ctx.beginPath();
    ctx.ellipse(bx, eyeY + 9, 5.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // mouth
  if (spec.species === 'human') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    const mx = rig.facing === 'side' ? x + 20 : x;
    if (happy || rig.pose === 'walkA') {
      ctx.fillStyle = '#c8605a';
      ctx.moveTo(mx - 4, eyeY + 9);
      ctx.quadraticCurveTo(mx, eyeY + 16, mx + 4, eyeY + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.arc(mx, eyeY + 8, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
}

function drawHumanHead(ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig) {
  const { x, y, r } = rig.head;
  // ears
  if (rig.facing !== 'up') {
    if (rig.facing === 'side') ellipse(ctx, x - 2, y + 4, 5, 6.5, spec.skin, L - 1);
    else {
      ellipse(ctx, x - r + 1, y + 5, 5, 6.5, spec.skin, L - 1);
      ellipse(ctx, x + r - 1, y + 5, 5, 6.5, spec.skin, L - 1);
    }
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = spec.skin;
  ctx.fill();
  ctx.lineWidth = L;
  ctx.strokeStyle = INK;
  ctx.stroke();
  drawFace(ctx, spec, rig);
  hairCap(ctx, spec, rig);
}

/** Animal heads are provided by the species module (registered at import time). */
export type HeadDrawer = (ctx: CanvasRenderingContext2D, spec: CharSpec, rig: Rig, api: HeadApi) => void;
export interface HeadApi {
  ellipse: typeof ellipse;
  rrect: typeof rrect;
  drawFace: typeof drawFace;
  limb: typeof limb;
}
const headDrawers: Partial<Record<Species, HeadDrawer>> = {};
const tailDrawers: Partial<Record<Species, HeadDrawer>> = {};
const overHatDrawers: Partial<Record<Species, HeadDrawer>> = {};
export function registerSpecies(s: Species, head: HeadDrawer, tail?: HeadDrawer, overHat?: HeadDrawer): void {
  headDrawers[s] = head;
  if (tail) tailDrawers[s] = tail;
  if (overHat) overHatDrawers[s] = overHat;
}
const headApi: HeadApi = { ellipse, rrect, drawFace, limb };

// ------------------------------------------------------------------ hats & accessories
export type PieceDrawer = (ctx: CanvasRenderingContext2D, p: WornPiece, rig: Rig, spec: CharSpec, api: HeadApi) => void;
const hatDrawers: Record<string, PieceDrawer> = {};
const accDrawers: Record<string, { layer: 'back' | 'neck' | 'face' | 'shoulder'; draw: PieceDrawer }> = {};
export function registerHat(kind: string, d: PieceDrawer): void {
  hatDrawers[kind] = d;
}
export function registerAcc(kind: string, layer: 'back' | 'neck' | 'face' | 'shoulder', d: PieceDrawer): void {
  accDrawers[kind] = { layer, draw: d };
}
export const hasHat = (kind: string) => kind in hatDrawers;
export const hasAcc = (kind: string) => kind in accDrawers;

// Built-in beanie so the default outfit renders even before the item art module loads.
registerHat('beanie', (ctx, p, rig) => {
  const { x, y, r } = rig.head;
  ctx.beginPath();
  ctx.moveTo(x - r - 1, y - 6);
  ctx.quadraticCurveTo(x - r, y - r - 10, x, y - r - 10);
  ctx.quadraticCurveTo(x + r, y - r - 10, x + r + 1, y - 6);
  ctx.closePath();
  ctx.fillStyle = p.main;
  ctx.fill();
  ctx.lineWidth = L;
  ctx.strokeStyle = INK;
  ctx.stroke();
  rrect(ctx, x - r - 2, y - 12, r * 2 + 4, 9, 4, p.accent);
  ellipse(ctx, x + (rig.facing === 'side' ? -6 : 0), y - r - 11, 7, 7, p.accent);
});

// ------------------------------------------------------------------ assemble
export function drawCharacter(ctx: CanvasRenderingContext2D, spec: CharSpec, facing: Facing, pose: Pose): void {
  const rig = makeRig(facing, pose);
  const acc = spec.outfit.acc;
  const accDef = acc ? accDrawers[acc.kind] : undefined;
  const back = facing === 'up';
  ctx.save();
  if (rig.lean) {
    ctx.translate(48, 118);
    ctx.rotate(rig.lean);
    ctx.translate(-48, -118);
  }
  // behind everything: back accessories (front/side views), hair falling behind, tails
  if (accDef?.layer === 'back' && !back) accDef.draw(ctx, acc!, rig, spec, headApi);
  if (!back) drawHairBack(ctx, spec, rig);
  if (!back) tailDrawers[spec.species]?.(ctx, spec, rig, headApi);
  if (facing === 'side') drawArm(ctx, rig.armBack, spec);
  drawLeg(ctx, rig.legBack, spec, rig);
  drawLeg(ctx, rig.legFront, spec, rig);
  if (facing !== 'side') {
    drawArm(ctx, rig.armBack, spec);
    drawArm(ctx, rig.armFront, spec);
  }
  drawTop(ctx, spec, rig);
  drawBottomOverTorso(ctx, spec, rig);
  if (facing === 'side') drawArm(ctx, rig.armFront, spec);
  if (back) tailDrawers[spec.species]?.(ctx, spec, rig, headApi);
  if (accDef?.layer === 'back' && back) accDef.draw(ctx, acc!, rig, spec, headApi);
  if (accDef?.layer === 'neck') accDef.draw(ctx, acc!, rig, spec, headApi);
  // head
  const head = headDrawers[spec.species];
  if (head) head(ctx, spec, rig, headApi);
  else drawHumanHead(ctx, spec, rig);
  if (back && spec.species === 'human') drawHairBack(ctx, spec, rig);
  if (accDef?.layer === 'face' && !back) accDef.draw(ctx, acc!, rig, spec, headApi);
  const hat = spec.outfit.hat;
  if (hat) {
    (hatDrawers[hat.kind] ?? hatDrawers.beanie)(ctx, hat, rig, spec, headApi);
    overHatDrawers[spec.species]?.(ctx, spec, rig, headApi); // e.g. bunny ears poke through hats
  }
  if (accDef?.layer === 'shoulder') accDef.draw(ctx, acc!, rig, spec, headApi);
  ctx.restore();
}

/** Render every frame into one horizontal strip (FW x FH each). */
export function renderCharacterSheet(spec: CharSpec): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(FW * FRAMES.length, FH);
  FRAMES.forEach((f, i) => {
    ctx.save();
    ctx.translate(i * FW, TOP_PAD);
    drawCharacter(ctx, spec, f.facing, f.pose);
    ctx.restore();
  });
  return c;
}

/** A head-and-shoulders portrait (for dialogue boxes and menus). */
export function renderPortrait(spec: CharSpec, size = 160, pose: Pose = 'idle'): HTMLCanvasElement {
  const { c, ctx } = makeCanvas(size, size);
  const s = size / 80;
  ctx.scale(s, s);
  ctx.translate(-8, -6);
  drawCharacter(ctx, spec, 'down', pose);
  return c;
}
