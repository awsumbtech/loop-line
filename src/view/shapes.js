// Drawing helpers shared by the layers.

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// An uneven seven-sided lump, for rocks.
export function lump(ctx, cx, cy, r, seed) {
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + seed * 6.28;
    const rr = r * (0.8 + 0.2 * Math.sin(seed * 40 + i * 2.4));
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.88;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

// A closed path through screen points, with rounded corners.
export function roundedLoop(ctx, pts, radius) {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const p = pts[i], next = pts[(i + 1) % n];
    const m = mid(p, next);
    ctx.arcTo(p.x, p.y, m.x, m.y, radius);
  }
  ctx.closePath();
}
