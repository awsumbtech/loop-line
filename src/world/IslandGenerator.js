import { seededRandom } from '../core/math.js';
import { Island } from './Island.js';
import { Tile } from './Tile.js';

// Lays out island number n. The same number always gives the same island.
// Swap in another generator to make different kinds of islands.
export class IslandGenerator {
  constructor(config, catalog) {
    this.config = config;
    this.catalog = catalog;
  }

  generate(number) {
    const { width: W, height: H, coastWaterChance, roughness, scatter } = this.config.grid;
    const radius = this.config.start.claimRadius;
    const rules = this.config.islands;
    const random = seededRandom(number * 7919 + 13);
    const cx = Math.floor((W - 1) / 2), cy = Math.floor((H - 1) / 2);
    const first = this.catalog.innermost();
    const scatterType = scatter ? this.catalog.get(scatter.block) : null;
    const tiles = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        // The corners of the outer land ring are always sea, so no land is cut off.
        const ringCorner = edge === 1 && (x === 1 || x === W - 2) && (y === 1 || y === H - 2);
        const water = edge === 0 || (edge === 1 && (ringCorner || random() < coastWaterChance));
        if (water) { tiles.push(new Tile(x, y, 'water')); continue; }

        const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
        let block;
        if (dx <= radius && dy <= radius) block = null;                 // the starting ground is clear
        else if (dx <= radius + 1 && dy <= radius + 1) block = first;   // the first ring is the easiest block
        else {
          const distance = Math.max(dx / (cx - 1), dy / (cy - 1));
          block = this.catalog.forReach(distance + (random() - 0.5) * roughness);
          if (scatterType && block !== scatterType && random() < scatter.chance) block = scatterType;
        }
        tiles.push(new Tile(x, y, 'land', block, block ? block.hpOn(number, rules) : 0));
      }
    }
    return new Island(number, W, H, tiles, { x: cx, y: cy });
  }
}
