// Turns tile coordinates into screen pixels, fitting the island to the view.
export class Camera {
  constructor() {
    this.size = 20;   // pixels per tile
    this.ox = 0;
    this.oy = 0;
  }

  // bleed: how many tiles of the outer sea may fall off the screen.
  fit(width, height, cols, rows, bleed = 0.9) {
    this.size = Math.min(width / (cols - bleed), height / (rows - bleed));
    this.ox = (width - cols * this.size) / 2;
    this.oy = (height - rows * this.size) / 2;
  }

  // A point in tile coordinates (tile x covers x to x + 1).
  sx(x) { return this.ox + x * this.size; }
  sy(y) { return this.oy + y * this.size; }
  point(p) { return { x: this.sx(p.x), y: this.sy(p.y) }; }
  tileCenter(x, y) { return { x: this.sx(x + 0.5), y: this.sy(y + 0.5) }; }
}
