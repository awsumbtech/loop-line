import { mod } from '../core/math.js';

// The loop of rail around the cleared ground. Positions along it are measured
// in tiles from a starting point, running clockwise.
//
// Each piece of rail sits beside one tile outside the ground; that tile's spot
// is where carts reach it.
export class Track {
  // points: corners of the loop in tile coordinates; outside: for each piece
  // from points[i] to points[i + 1], the index of the tile beside it (or -1).
  constructor(points, outside, valid = true) {
    this.points = points;
    this.valid = valid;
    this.lengths = [];
    this.starts = [];
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.starts.push(total);
      this.lengths.push(len);
      total += len;
    }
    this.length = total;
    this.spots = [];
    outside.forEach((tile, i) => {
      if (tile >= 0) this.spots.push({ s: this.starts[i] + this.lengths[i] / 2, tile });
    });
  }

  // Traces the edge of the ground clockwise, then pulls the rail a little
  // inside it so it does not run over the blocks.
  static fromTerritory(territory, inset) {
    const island = territory.island;
    const edges = new Map();
    let first = null, clash = false;
    const add = (fx, fy, tx, ty, dx, dy, ox, oy) => {
      const key = fx + ',' + fy;
      if (edges.has(key)) clash = true;
      const edge = { fx, fy, tx, ty, dx, dy, outside: island.inBounds(ox, oy) ? island.index(ox, oy) : -1 };
      edges.set(key, edge);
      if (!first || fy < first.fy || (fy === first.fy && fx < first.fx)) first = edge;
    };
    for (const i of territory.indices()) {
      const x = i % island.width, y = (i - x) / island.width;
      if (!territory.has(x, y - 1)) add(x, y, x + 1, y, 1, 0, x, y - 1);
      if (!territory.has(x + 1, y)) add(x + 1, y, x + 1, y + 1, 0, 1, x + 1, y);
      if (!territory.has(x, y + 1)) add(x + 1, y + 1, x, y + 1, -1, 0, x, y + 1);
      if (!territory.has(x - 1, y)) add(x, y + 1, x, y, 0, -1, x - 1, y);
    }
    const loop = [];
    let edge = first;
    do {
      loop.push(edge);
      edge = edges.get(edge.tx + ',' + edge.ty);
    } while (edge && edge !== first && loop.length <= edges.size);
    const valid = !clash && edge === first && loop.length === edges.size;

    // Each corner moves inward, away from the pieces on either side of it.
    const n = loop.length;
    const points = loop.map((cur, i) => {
      const prev = loop[(i - 1 + n) % n];
      let ox = -prev.dy, oy = prev.dx;   // inward side of the piece before
      if (prev.dx !== cur.dx || prev.dy !== cur.dy) { ox += -cur.dy; oy += cur.dx; }
      return { x: cur.fx + inset * ox, y: cur.fy + inset * oy };
    });
    return new Track(points, loop.map(e => e.outside), valid);
  }

  segmentAt(s) {
    s = mod(s, this.length);
    let lo = 0, hi = this.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid] <= s) lo = mid; else hi = mid - 1;
    }
    return { i: lo, along: s - this.starts[lo] };
  }

  pointAt(s) {
    const { i, along } = this.segmentAt(s);
    const a = this.points[i], b = this.points[(i + 1) % this.points.length];
    const k = this.lengths[i] > 0 ? along / this.lengths[i] : 0;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  // The position on the track closest to a point.
  nearestS(p) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i], b = this.points[(i + 1) % this.points.length];
      const len = this.lengths[i];
      const k = len > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len))) : 0;
      const qx = a.x + (b.x - a.x) * k, qy = a.y + (b.y - a.y) * k;
      const d = Math.hypot(qx - p.x, qy - p.y);
      if (d < bestD) { bestD = d; best = this.starts[i] + k * len; }
    }
    return best;
  }
}
