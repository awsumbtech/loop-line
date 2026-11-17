// Framings decide what part of the island the camera shows. Each has
// update(renderer, dt) and snap(renderer). Hand any of them to the Renderer.

// The whole island, always.
export class IslandFraming {
  constructor({ bleed = 0.9 } = {}) {
    this.bleed = bleed;   // tiles of the outer sea allowed to fall off screen
  }

  target(renderer) {
    const { width, height } = renderer.game.island, b = this.bleed / 2;
    return { x0: b, y0: b, x1: width - b, y1: height - b };
  }

  snap(renderer) { this.update(renderer, Infinity); }

  update(renderer) {
    renderer.camera.showRect(this.target(renderer), renderer.width, renderer.height);
  }
}

// Starts close on the cleared ground and glides out as it grows, until the
// whole island fits. margin: tiles of untouched ground shown around it.
export class GroundFraming extends IslandFraming {
  constructor({ margin = 3, minTiles = 9, glide = 2.5, bleed = 0.9 } = {}) {
    super({ bleed });
    this.margin = margin;
    this.minTiles = minTiles;   // never zoom in closer than this many tiles across
    this.glide = glide;         // how quickly the view catches up; higher is faster
    this.rect = null;
  }

  target(renderer) {
    const { territory, island } = renderer.game;
    const whole = super.target(renderer);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const i of territory.indices()) {
      const x = i % island.width, y = (i - x) / island.width;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
    }
    if (!Number.isFinite(x0)) return whole;
    const m = this.margin;
    const rect = { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
    // Keep a minimum size, matched to the screen's shape so the view never looks cramped.
    const aspect = renderer.width / Math.max(1, renderer.height);
    const minW = Math.max(this.minTiles, this.minTiles * aspect), minH = Math.max(this.minTiles, this.minTiles / aspect);
    grow(rect, 'x0', 'x1', minW);
    grow(rect, 'y0', 'y1', minH);
    // Never zoom out past the whole island, and never wander off it.
    const scaleNow = Math.min(renderer.width / (rect.x1 - rect.x0), renderer.height / (rect.y1 - rect.y0));
    const scaleWhole = Math.min(renderer.width / (whole.x1 - whole.x0), renderer.height / (whole.y1 - whole.y0));
    if (scaleNow <= scaleWhole) return whole;
    const viewW = renderer.width / scaleNow, viewH = renderer.height / scaleNow;
    const cx = clampCentre((rect.x0 + rect.x1) / 2, viewW, whole.x0, whole.x1);
    const cy = clampCentre((rect.y0 + rect.y1) / 2, viewH, whole.y0, whole.y1);
    return { x0: cx - viewW / 2, y0: cy - viewH / 2, x1: cx + viewW / 2, y1: cy + viewH / 2 };
  }

  snap(renderer) {
    this.rect = this.target(renderer);
    renderer.camera.showRect(this.rect, renderer.width, renderer.height);
  }

  update(renderer, dt) {
    const goal = this.target(renderer);
    if (!this.rect || renderer.reduceMotion || !Number.isFinite(dt)) this.rect = goal;
    else {
      const k = 1 - Math.exp(-dt * this.glide);
      for (const key of ['x0', 'y0', 'x1', 'y1']) this.rect[key] += (goal[key] - this.rect[key]) * k;
    }
    renderer.camera.showRect(this.rect, renderer.width, renderer.height);
  }
}

function grow(rect, lo, hi, min) {
  const size = rect[hi] - rect[lo];
  if (size >= min) return;
  const extra = (min - size) / 2;
  rect[lo] -= extra;
  rect[hi] += extra;
}

// Moves a view's centre so the view stays inside [lo, hi], or centres it if it is wider.
function clampCentre(c, size, lo, hi) {
  if (size >= hi - lo) return (lo + hi) / 2;
  return Math.max(lo + size / 2, Math.min(hi - size / 2, c));
}
