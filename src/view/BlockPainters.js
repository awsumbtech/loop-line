import { lump } from './shapes.js';
import { BLOCK_STYLES, COLORS } from './styles.js';

// Draws blocks. Each style names a painter; register new painters for new looks.
// painter(ctx, x, y, size, scale, style, seed): x, y is the tile's centre in pixels.
export class BlockPainters {
  constructor(styles = BLOCK_STYLES) {
    this.styles = styles;
    this.painters = new Map();
    this.register('tree', paintTree);
    this.register('rock', paintRock);
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
    painter(ctx, x, y, size, scale, style, seed);
  }
}

function paintTree(ctx, x, y, size, scale, style, seed) {
  const tone = style.leaves[Math.floor(seed * style.leaves.length) % style.leaves.length];
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
