import { clamp, isNum } from '../core/math.js';

// The grid of tiles for one island.
export class Island {
  constructor(number, width, height, tiles, center) {
    this.number = number;
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.center = center;   // the station's tile
  }

  index(x, y) { return y * this.width + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  tileAt(x, y) { return this.inBounds(x, y) ? this.tiles[this.index(x, y)] : null; }

  // Share of the island's block strength that is gone, from 0 to 1.
  clearedShare() {
    let total = 0, left = 0;
    for (const tile of this.tiles) { total += tile.maxHp; left += tile.hp; }
    return total > 0 ? 1 - left / total : 1;
  }

  isCleared() {
    return this.tiles.every(tile => !tile.hasBlock);
  }

  toJSON() {
    return { number: this.number, hp: this.tiles.map(tile => Math.round(tile.hp * 1000) / 1000) };
  }

  // Puts saved block strength back onto a freshly made island of the same number.
  restore(data) {
    if (!data || !Array.isArray(data.hp) || data.hp.length !== this.tiles.length) return false;
    this.tiles.forEach((tile, i) => {
      if (isNum(data.hp[i])) tile.hp = clamp(data.hp[i], 0, tile.maxHp);
    });
    return true;
  }
}
