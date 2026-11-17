import { RINGS } from '../config.js';
import { seededRandom } from '../core/math.js';
import { Island } from './Island.js';
import { Tile } from './Tile.js';

// Lays out island number n. The same number always gives the same island.
// Blocks are picked ring by ring from the ring mixes. Swap in another
// generator to make different kinds of islands.
export class IslandGenerator {
  constructor(config, catalog, rings = RINGS) {
    this.config = config;
    this.catalog = catalog;
    this.rings = rings;
  }

  // Ring 1 touches the starting ground. Rings are stretched to the island's
  // shape so the coast is the same ring all the way round.
  ringOf(x, y, island) {
    const { x: cx, y: cy } = island.center;
    const ax = cx - 1, ay = cy - 1;
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    return Math.max(dx, Math.round(dy * ax / ay)) - this.config.start.claimRadius;
  }

  mixFor(ring) {
    if (!this.rings.length) return {};
    return this.rings[Math.max(0, Math.min(this.rings.length - 1, ring - 1))];
  }

  generate(number) {
    const { width: W, height: H, coastWaterChance, ringJitter } = this.config.grid;
    const radius = this.config.start.claimRadius;
    const rules = this.config.islands;
    const random = seededRandom(number * 7919 + 13);
    const center = { x: Math.floor((W - 1) / 2), y: Math.floor((H - 1) / 2) };
    const shape = { center };
    const tiles = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        // The corners of the outer land ring are always sea, so no land is cut off.
        const ringCorner = edge === 1 && (x === 1 || x === W - 2) && (y === 1 || y === H - 2);
        const water = edge === 0 || (edge === 1 && (ringCorner || random() < coastWaterChance));
        if (water) { tiles.push(new Tile(x, y, 'water')); continue; }

        const dx = Math.abs(x - center.x), dy = Math.abs(y - center.y);
        let block = null;
        if (dx > radius || dy > radius) {               // the starting ground is clear
          let ring = this.ringOf(x, y, shape);
          if (ring > 1 && random() < ringJitter) ring += random() < 0.5 ? -1 : 1;
          block = this.catalog.pick(this.mixFor(ring), random);
        }
        tiles.push(new Tile(x, y, 'land', block, block ? block.hpOn(number, rules) : 0));
      }
    }
    return new Island(number, W, H, tiles, center);
  }
}
