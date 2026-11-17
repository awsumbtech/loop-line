import { lump } from './shapes.js';
import { BLOCK_STYLES, COLORS } from './styles.js';

// Draws blocks. Each style names a painter; register new painters for new looks.
// painter(ctx, x, y, size, scale, style, seed): x, y is the tile's centre in
// pixels, size the tile's width, scale 0.55 (nearly broken) to 1 (whole).
export class BlockPainters {
  constructor(styles = BLOCK_STYLES) {
    this.styles = styles;
    this.painters = new Map();
    this.register('bush', paintBush);
    this.register('tree', paintTree);
    this.register('rock', paintRock);
    this.register('mountain', paintMountain);
  }

  register(name, painter) {
    this.painters.set(name, painter);
  }

  styleFor(blockId) {
    return this.styles[blockId] || this.styles.fallback;
  }

  paint(ctx, block, x, y, size, scale, seed) {
    const style = this.styleFor(block.id);
    const painter = this.painters.get(style.painter) || paintRock;
    painter(ctx, x, y, size, scale * (style.size || 1), style, seed);
  }
}

const pick = (list, seed) => list[Math.floor(seed * list.length) % list.length];

function paintBush(ctx, x, y, size, scale, style, seed) {
  const tone = pick(style.leaves, seed);
  const r = size * 0.2 * scale;
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath(); ctx.ellipse(x + size * 0.04, y + size * 0.07, r * 1.7, r * 1.2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = tone[0];
  for (const [ox, oy] of [[-0.8, 0.2], [0.8, 0.2], [0, -0.45], [0, 0.35]]) {
    ctx.beginPath(); ctx.arc(x + ox * r, y + oy * r, r, 0, 7); ctx.fill();
  }
  ctx.fillStyle = tone[1];
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.5, r * 0.6, 0, 7); ctx.fill();
  if (style.berry && seed > 0.4) {
    ctx.fillStyle = style.berry;
    ctx.beginPath(); ctx.arc(x + r * 0.6, y + r * 0.1, r * 0.22, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.5, y + r * 0.5, r * 0.22, 0, 7); ctx.fill();
  }
}

function paintTree(ctx, x, y, size, scale, style, seed) {
  const tone = pick(style.leaves, seed);
  const r = size * 0.36 * scale;
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath(); ctx.ellipse(x + size * 0.05, y + size * 0.08, r, r * 0.85, 0, 0, 7); ctx.fill();
  ctx.fillStyle = tone[0]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = tone[1]; ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.24, r * 0.62, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)'; ctx.beginPath(); ctx.arc(x - r * 0.34, y - r * 0.36, r * 0.28, 0, 7); ctx.fill();
}

function paintRock(ctx, x, y, size, scale, style, seed) {
  const r = size * 0.4 * scale;
  ctx.fillStyle = COLORS.shadow; lump(ctx, x + size * 0.04, y + size * 0.07, r, seed); ctx.fill();
  ctx.fillStyle = style.base; lump(ctx, x, y, r, seed); ctx.fill();
  ctx.fillStyle = style.light; lump(ctx, x - r * 0.18, y - r * 0.2, r * 0.58, seed + 0.3); ctx.fill();
  if (style.fleck) {
    ctx.fillStyle = style.fleck;
    for (let i = 0; i < 3; i++) {
      const a = i * 2.2 + seed * 6.28;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.38, r * 0.17, 0, 7); ctx.fill();
    }
  }
}

// Two peaks with snowy tops.
function paintMountain(ctx, x, y, size, scale, style, seed) {
  const h = size * 0.5 * scale, w = size * 0.5 * scale;
  const peak = (px, ph, pw, base, light) => {
    ctx.fillStyle = base;
    ctx.beginPath(); ctx.moveTo(px - pw, y + h * 0.45); ctx.lineTo(px, y + h * 0.45 - ph); ctx.lineTo(px + pw, y + h * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.moveTo(px, y + h * 0.45 - ph); ctx.lineTo(px + pw, y + h * 0.45); ctx.lineTo(px + pw * 0.15, y + h * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = style.snow;
    ctx.beginPath(); ctx.moveTo(px, y + h * 0.45 - ph); ctx.lineTo(px + pw * 0.32, y + h * 0.45 - ph * 0.66); ctx.lineTo(px - pw * 0.32, y + h * 0.45 - ph * 0.66); ctx.closePath(); ctx.fill();
  };
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath(); ctx.ellipse(x + size * 0.04, y + h * 0.48, w * 1.05, h * 0.18, 0, 0, 7); ctx.fill();
  const flip = seed > 0.5 ? 1 : -1;
  peak(x + flip * w * 0.35, h * 0.75, w * 0.55, style.base, style.light);
  peak(x - flip * w * 0.2, h * 1.0, w * 0.7, style.base, style.light);
}
