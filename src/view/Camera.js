// Turns tile coordinates into screen pixels. A framing (see framing.js)
// decides which part of the island to show; the camera just does the maths.
export class Camera {
  constructor() {
    this.size = 20;   // pixels per tile
    this.ox = 0;      // screen position of tile coordinate (0, 0)
    this.oy = 0;
  }

  // Shows the rectangle { x0, y0, x1, y1 } (in tiles) as large as it fits,
  // centred in a view of width x height pixels.
  showRect(rect, width, height) {
    const rw = Math.max(1e-6, rect.x1 - rect.x0), rh = Math.max(1e-6, rect.y1 - rect.y0);
    this.size = Math.min(width / rw, height / rh);
    this.ox = width / 2 - ((rect.x0 + rect.x1) / 2) * this.size;
    this.oy = height / 2 - ((rect.y0 + rect.y1) / 2) * this.size;
  }

  // A point in tile coordinates (tile x covers x to x + 1).
  sx(x) { return this.ox + x * this.size; }
  sy(y) { return this.oy + y * this.size; }
  point(p) { return { x: this.sx(p.x), y: this.sy(p.y) }; }
  tileCenter(x, y) { return { x: this.sx(x + 0.5), y: this.sy(y + 0.5) }; }

  // The tiles currently on screen, for skipping drawing work.
  visibleTiles(width, height) {
    return {
      x0: Math.floor(-this.ox / this.size) - 1, y0: Math.floor(-this.oy / this.size) - 1,
      x1: Math.ceil((width - this.ox) / this.size) + 1, y1: Math.ceil((height - this.oy) / this.size) + 1,
    };
  }
}
