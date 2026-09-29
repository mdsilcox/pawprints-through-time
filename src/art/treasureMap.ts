import { PAL } from './palette';
import { makeCanvas } from './draw';

/**
 * Captain Marigold's treasure map, drawn procedurally: parchment, islands, the dotted route
 * from Sandy Cove past the Swirling Shoals to Treasure Island, a big X and a compass rose.
 * Every part of the map looks different, so torn pieces can be told apart (and turned right).
 */
const cache = new Map<string, string>();

export function treasureMapUrl(w = 600, h = 400): string {
  const key = `${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = makeCanvas(w, h);
  const sx = w / 600;
  const sy = h / 400;
  ctx.scale(sx, sy);
  // parchment
  const g = ctx.createRadialGradient(300, 200, 60, 300, 200, 380);
  g.addColorStop(0, '#f6e7c4');
  g.addColorStop(1, '#dcbf87');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 600, 400);
  // sea waves
  ctx.strokeStyle = 'rgba(79,166,196,0.55)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = 30 + ((i * 97) % 540);
    const y = 30 + ((i * 61) % 340);
    ctx.beginPath();
    ctx.arc(x, y, 7, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(x + 12, y, 7, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  const island = (pts: number[][], fill: string) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
  };
  // Sandy Cove (top-left) with a little harbour
  island(
    [
      [40, 60],
      [120, 40],
      [180, 70],
      [170, 130],
      [110, 150],
      [50, 120],
    ],
    '#e9d59a',
  );
  ctx.fillStyle = '#7cc47f';
  ctx.beginPath();
  ctx.ellipse(105, 90, 40, 22, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // little town
  for (const [x, y] of [
    [90, 82],
    [112, 78],
    [100, 98],
  ]) {
    ctx.fillStyle = '#e0715b';
    ctx.fillRect(x - 6, y - 6, 12, 10);
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 6, y - 6, 12, 10);
  }
  // a rocky islet (middle top)
  island(
    [
      [300, 50],
      [340, 40],
      [360, 70],
      [320, 90],
      [290, 76],
    ],
    '#cfc2b0',
  );
  // Treasure Island (bottom-right) with palm and the X
  island(
    [
      [400, 250],
      [470, 225],
      [550, 250],
      [565, 320],
      [500, 365],
      [420, 345],
      [385, 300],
    ],
    '#e9d59a',
  );
  ctx.fillStyle = '#7cc47f';
  ctx.beginPath();
  ctx.ellipse(470, 290, 55, 35, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // palm
  ctx.strokeStyle = PAL.woodDark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(440, 300);
  ctx.quadraticCurveTo(436, 280, 444, 262);
  ctx.stroke();
  ctx.fillStyle = '#5fa85a';
  for (const a of [-2.6, -1.9, -1.2, -0.5]) {
    ctx.beginPath();
    ctx.ellipse(444 + Math.cos(a) * 16, 262 + Math.sin(a) * 10, 16, 6, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // the Swirling Shoals (middle): swirls
  ctx.strokeStyle = '#3f7fb3';
  ctx.lineWidth = 3;
  for (const [x, y] of [
    [270, 190],
    [320, 230],
    [230, 250],
  ]) {
    ctx.beginPath();
    for (let t = 0; t < 12; t += 0.2) ctx.lineTo(x + Math.cos(t) * t * 1.6, y + Math.sin(t) * t * 1.6);
    ctx.stroke();
  }
  // dotted route
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = '#c0464b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(165, 125);
  ctx.bezierCurveTo(240, 150, 200, 280, 300, 300);
  ctx.bezierCurveTo(360, 312, 400, 280, 480, 300);
  ctx.stroke();
  ctx.setLineDash([]);
  // X marks the spot
  ctx.strokeStyle = '#c0464b';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(488, 292);
  ctx.lineTo(512, 316);
  ctx.moveTo(512, 292);
  ctx.lineTo(488, 316);
  ctx.stroke();
  // compass rose (bottom-left)
  ctx.save();
  ctx.translate(90, 320);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(9, 0);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#f7c65a' : '#e46a6a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
  }
  ctx.restore();
  ctx.font = '700 22px Fredoka, sans-serif';
  ctx.fillStyle = PAL.ink;
  ctx.textAlign = 'center';
  ctx.fillText('N', 90, 262);
  // labels
  ctx.font = '700 20px Fredoka, sans-serif';
  ctx.fillText('Sandy Cove', 110, 30);
  ctx.fillText('Treasure Island', 480, 385);
  ctx.font = '600 16px Fredoka, sans-serif';
  ctx.fillText('Swirling Shoals', 270, 150);
  // torn-edge border
  ctx.strokeStyle = '#a8804a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 592, 392);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
