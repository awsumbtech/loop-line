import { mod } from '../core/math.js';

// The loop of rail around the cleared ground. Positions along it are measured
// in tiles from a starting point, running clockwise.
//
// Each tile just outside the ground has a spot on the track where carts reach it.
export class Track {
  // points: the loop as a closed polyline in tile coordinates.
  constructor(points, valid = true) {
    this.points = points;
    this.valid = valid;
    this.spots = [];
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
  }

  // spots: [{ s, tile }] where s is a position along the track.
  setSpots(spots) {
    this.spots = spots;
    return this;
  }

  // Traces the edge of the ground clockwise, pulls the rail a little inside it
  // so it does not run over the blocks, and rounds every corner.
  static fromTerritory(territory, inset, cornerRadius = 0.45) {
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

    // Each corner of the ground's edge moves inward, away from the pieces on either side.
    const n = loop.length;
    const raw = loop.map((cur, i) => {
      const prev = loop[(i - 1 + n) % n];
      let ox = -prev.dy, oy = prev.dx;
      if (prev.dx !== cur.dx || prev.dy !== cur.dy) { ox += -cur.dy; oy += cur.dx; }
      return { x: cur.fx + inset * ox, y: cur.fy + inset * oy };
    });

    // Keep only the turns, then round each one with a curve.
    const turns = [];
    loop.forEach((cur, i) => {
      const prev = loop[(i - 1 + n) % n];
      if (prev.dx !== cur.dx || prev.dy !== cur.dy) turns.push({ p: raw[i], din: prev, dout: cur });
    });
    const points = [];
    const m = turns.length;
    const steps = 6;
    turns.forEach((t, j) => {
      const before = turns[(j - 1 + m) % m].p, after = turns[(j + 1) % m].p;
      const r = Math.min(cornerRadius,
        Math.hypot(t.p.x - before.x, t.p.y - before.y) / 2,
        Math.hypot(after.x - t.p.x, after.y - t.p.y) / 2);
      const a = { x: t.p.x - t.din.dx * r, y: t.p.y - t.din.dy * r };
      const b = { x: t.p.x + t.dout.dx * r, y: t.p.y + t.dout.dy * r };
      for (let k = 0; k <= steps; k++) {
        const u = k / steps, v = 1 - u;
        points.push({ x: v * v * a.x + 2 * v * u * t.p.x + u * u * b.x, y: v * v * a.y + 2 * v * u * t.p.y + u * u * b.y });
      }
    });

    const track = new Track(points, valid);
    // Each tile beside the ground is reached where the track passes the middle of its side.
    const spots = [];
    loop.forEach((e, i) => {
      if (e.outside < 0) return;
      const a = raw[i], b = raw[(i + 1) % n];
      spots.push({ s: track.nearestS({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), tile: e.outside });
    });
    return track.setSpots(spots);
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
