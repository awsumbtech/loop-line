import { BlockPainters } from '../BlockPainters.js';
import { COLORS } from '../styles.js';

// Trees, rocks and ore. Blocks shrink as they take damage and wobble when hit.
export class BlockLayer {
  constructor(painters = new BlockPainters()) {
    this.id = 'blocks';
    this.order = 20;
    this.painters = painters;
    this.hitAt = new Map();   // tile -> clock time of the last hit
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    const mark = e => this.hitAt.set(e.tile, renderer.clock);
    this.unsubscribers = [
      bus.on('block:hit', mark),
      bus.on('block:broken', mark),
      bus.on('island:started', () => this.hitAt.clear()),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  draw(ctx, renderer) {
    const cam = renderer.camera, T = cam.size;
    for (const tile of renderer.game.island.tiles) {
      if (!tile.block) continue;
      const p = cam.tileCenter(tile.x, tile.y);
      if (!tile.hasBlock) {
        // A cleared spot keeps a faint mark.
        ctx.fillStyle = COLORS.cleared;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, T * 0.26, T * 0.2, 0, 0, 7); ctx.fill();
        continue;
      }
      const since = renderer.clock - (this.hitAt.has(tile) ? this.hitAt.get(tile) : -9);
      if (since < 0.18 && !renderer.reduceMotion) p.x += Math.sin(since * 90) * T * 0.06 * (1 - since / 0.18);
      const scale = 0.55 + 0.45 * tile.health;
      const seed = ((tile.x * 7 + tile.y * 13) % 17) / 17;
      this.painters.paint(ctx, tile.block, p.x, p.y, T, scale, seed);
    }
  }
}
