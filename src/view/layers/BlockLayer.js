import { BlockPainters } from '../BlockPainters.js';
import { COLORS } from '../styles.js';

// Bushes, trees, rocks and mountains. Blocks shrink as they take damage, flash
// and wobble when hit, and leave a mark that fades once broken.
export class BlockLayer {
  constructor(painters = new BlockPainters(), { markSeconds = 5 } = {}) {
    this.id = 'blocks';
    this.order = 20;
    this.painters = painters;
    this.markSeconds = markSeconds;
    this.hitAt = new Map();      // tile -> clock time of the last hit
    this.brokenAt = new Map();   // tile -> clock time it broke
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    this.unsubscribers = [
      bus.on('block:hit', e => this.hitAt.set(e.tile, renderer.clock)),
      bus.on('block:broken', e => this.brokenAt.set(e.tile, renderer.clock)),
      bus.on('island:started', () => { this.hitAt.clear(); this.brokenAt.clear(); }),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  draw(ctx, renderer) {
    const cam = renderer.camera, T = cam.size, island = renderer.game.island;
    const view = cam.visibleTiles(renderer.width, renderer.height);
    for (let y = Math.max(0, view.y0); y <= Math.min(island.height - 1, view.y1); y++) {
      for (let x = Math.max(0, view.x0); x <= Math.min(island.width - 1, view.x1); x++) {
        const tile = island.tiles[island.index(x, y)];
        if (!tile.block) continue;
        const p = cam.tileCenter(x, y);
        if (!tile.hasBlock) {
          const since = renderer.clock - (this.brokenAt.has(tile) ? this.brokenAt.get(tile) : -1e9);
          if (since < this.markSeconds) {
            ctx.globalAlpha = 1 - since / this.markSeconds;
            ctx.fillStyle = COLORS.cleared;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, T * 0.26, T * 0.2, 0, 0, 7); ctx.fill();
            ctx.globalAlpha = 1;
          } else this.brokenAt.delete(tile);
          continue;
        }
        const since = renderer.clock - (this.hitAt.has(tile) ? this.hitAt.get(tile) : -9);
        const struck = since < 0.18 && !renderer.reduceMotion;
        if (struck) p.x += Math.sin(since * 90) * T * 0.06 * (1 - since / 0.18);
        const scale = 0.55 + 0.45 * tile.health;
        const seed = ((x * 7 + y * 13) % 17) / 17;
        this.painters.paint(ctx, tile.block, p.x, p.y, T, scale, seed);
        if (struck) {
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.35 * (1 - since / 0.18)).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, T * 0.34 * scale, 0, 7); ctx.fill();
        }
      }
    }
  }
}
