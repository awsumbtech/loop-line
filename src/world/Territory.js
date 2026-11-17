// The cleared ground the track runs around. A cleared tile next to it joins as
// soon as it can, so the track grows one tile at a time.
//
// A tile may join only if the ground stays one solid piece with no holes and
// no two tiles touching only at a corner. That keeps the track a single clean
// loop. A tile that cannot join yet waits until its neighbours are cleared.
export class Territory {
  constructor(island, indices = []) {
    this.island = island;
    this.claimed = new Uint8Array(island.width * island.height);
    for (const i of indices) this.claimed[i] = 1;
    this.lastClaimed = [];   // tiles that joined in the last grow()
  }

  // A square of ground around the station.
  static around(island, radius) {
    const { x: cx, y: cy } = island.center;
    const indices = [];
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) indices.push(island.index(x, y));
    }
    return new Territory(island, indices);
  }

  has(x, y) {
    return this.island.inBounds(x, y) && this.claimed[this.island.index(x, y)] === 1;
  }

  get size() {
    let n = 0;
    for (const c of this.claimed) n += c;
    return n;
  }

  indices() {
    const out = [];
    this.claimed.forEach((c, i) => { if (c) out.push(i); });
    return out;
  }

  touches(x, y) {
    return this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1);
  }

  canClaim(x, y) {
    const tile = this.island.tileAt(x, y);
    if (!tile || !tile.isClear || this.has(x, y) || !this.touches(x, y)) return false;
    return !this.wouldPinch(x, y) && !this.wouldEncloseHole(x, y);
  }

  claim(x, y) {
    this.claimed[this.island.index(x, y)] = 1;
  }

  // Claims every tile that can join, repeating until nothing changes.
  // Returns true if anything joined; the tiles are in lastClaimed.
  grow() {
    this.lastClaimed = [];
    for (let again = true; again;) {
      again = false;
      for (const tile of this.island.tiles) {
        if (this.canClaim(tile.x, tile.y)) { this.claim(tile.x, tile.y); this.lastClaimed.push(tile); again = true; }
      }
    }
    return this.lastClaimed.length > 0;
  }

  // Would claiming (x, y) leave two claimed tiles touching only at a corner?
  wouldPinch(x, y) {
    const owned = (ax, ay) => (ax === x && ay === y) || this.has(ax, ay);
    for (let wy = y - 1; wy <= y; wy++) {
      for (let wx = x - 1; wx <= x; wx++) {
        const a = owned(wx, wy), b = owned(wx + 1, wy), c = owned(wx, wy + 1), d = owned(wx + 1, wy + 1);
        if ((a && d && !b && !c) || (b && c && !a && !d)) return true;
      }
    }
    return false;
  }

  // Would claiming (x, y) wall off unclaimed tiles from the sea?
  wouldEncloseHole(x, y) {
    const { width: W, height: H } = this.island;
    const skip = this.island.index(x, y);
    const seen = new Uint8Array(W * H);
    const stack = [];
    const push = (px, py) => {
      if (px < 0 || py < 0 || px >= W || py >= H) return;
      const i = py * W + px;
      if (seen[i] || this.claimed[i] || i === skip) return;
      seen[i] = 1;
      stack.push(i);
    };
    for (let px = 0; px < W; px++) { push(px, 0); push(px, H - 1); }
    for (let py = 0; py < H; py++) { push(0, py); push(W - 1, py); }
    let reached = 0;
    while (stack.length) {
      const i = stack.pop();
      reached++;
      const px = i % W, py = (i - px) / W;
      push(px - 1, py); push(px + 1, py); push(px, py - 1); push(px, py + 1);
    }
    return reached < W * H - this.size - 1;
  }

  toJSON() {
    return this.indices();
  }

  // Rebuilds saved ground, or returns null if the save does not fit this island.
  static fromJSON(island, data) {
    if (!Array.isArray(data) || !data.length) return null;
    const total = island.width * island.height;
    if (!data.every(i => Number.isInteger(i) && i >= 0 && i < total)) return null;
    const territory = new Territory(island, data);
    const center = island.index(island.center.x, island.center.y);
    if (!territory.claimed[center]) return null;
    if (data.some(i => !island.tiles[i].isClear)) return null;
    return territory;
  }
}
