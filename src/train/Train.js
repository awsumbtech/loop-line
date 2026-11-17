import { clamp, isNum, mod } from '../core/math.js';
import { Cart } from './Cart.js';

// The engine and its carts. It knows where it is on the track and how fast it
// goes; what the carts do as they pass things is up to the systems.
export class Train {
  constructor(config, levels = [1]) {
    this.config = config;
    this.carts = levels.map(level => new Cart(level));
    this.pos = 0;            // the engine's position on the track
    this.steam = 0;          // extra speed from tapping, 0 to steam.max
    this.lastMove = { from: 0, dist: 0 };
    this.sort();
  }

  get levels() { return this.carts.map(c => c.level); }
  get speed() { return this.config.train.speed * (1 + this.steam); }

  move(dt, track) {
    const dist = this.speed * dt;
    this.steam = Math.max(0, this.steam - this.config.steam.decayPerSecond * dt);
    this.lastMove = { from: this.pos, dist };
    this.pos = mod(this.pos + dist, track.length);
  }

  boost() {
    const s = this.config.steam;
    this.steam = Math.min(s.max, this.steam + s.perTap);
  }

  // How far behind the engine cart i rides.
  offsetOf(i) {
    return (i + 1) * this.config.train.carLength;
  }

  // How many carts fit on a track without the train catching its own tail.
  capacity(track) {
    const { maxCarts, carLength } = this.config.train;
    return Math.max(1, Math.min(maxCarts, Math.floor(track.length * 0.85 / carLength) - 1));
  }

  bestLevel() {
    return this.carts.reduce((m, c) => Math.max(m, c.level), 0);
  }

  add(level) {
    this.carts.push(new Cart(level));
    this.sort();
  }

  // Strongest carts ride right behind the engine.
  sort() {
    this.carts.sort((a, b) => b.level - a.level);
  }

  // The lowest level with two carts, or 0 if no pair exists.
  mergeLevel() {
    const seen = new Set();
    let best = 0;
    for (const { level } of this.carts) {
      if (seen.has(level) && (best === 0 || level < best)) best = level;
      seen.add(level);
    }
    return best;
  }

  // Joins the lowest pair into one cart a level higher. Returns the new level, or 0.
  merge() {
    const level = this.mergeLevel();
    if (!level) return 0;
    for (let n = 0; n < 2; n++) this.carts.splice(this.carts.findIndex(c => c.level === level), 1);
    this.add(level + 1);
    return level + 1;
  }

  toJSON() {
    return { levels: this.levels, pos: this.pos };
  }

  restore(data, track) {
    if (!data) return;
    if (Array.isArray(data.levels)) {
      const levels = data.levels.filter(isNum).map(l => clamp(Math.floor(l), 1, 60)).slice(0, this.capacity(track));
      if (levels.length) { this.carts = levels.map(l => new Cart(l)); this.sort(); }
    }
    if (isNum(data.pos)) this.pos = mod(data.pos, track.length);
  }
}
