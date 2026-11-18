// When a block breaks, lets the cleared ground grow and rebuilds the track.
// Announces ground:grew { tiles } with the tiles that joined.
//
// With config.track.growBehindTrain on, a cleared tile waits to join until no
// car of the train is within config.track.growClearance tiles of it, so the
// track only changes shape behind the train, never under it. If a tile has
// waited a whole lap (possible on a tiny loop packed with carts), it joins anyway.
export class TerritorySystem {
  constructor() {
    this.id = 'territory';
    this.dirty = false;
    this.clock = 0;
    this.waitingSince = new Map();   // tile -> clock time it was first held back
    this.forced = 0;                 // tiles that joined only because they waited a whole lap
    this.unsubscribers = [];
  }

  attach(game) {
    const bus = game.bus;
    const recheck = () => { this.dirty = true; };
    this.unsubscribers = [
      bus.on('block:broken', recheck),
      bus.on('game:restored', recheck),
      bus.on('island:started', () => { this.waitingSince.clear(); this.dirty = true; }),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  update(dt, game) {
    this.clock += dt;
    if (!this.dirty) return;
    const rules = game.config.track;
    const allow = rules.growBehindTrain ? tile => this.trainHasPassed(game, tile, rules.growClearance) : null;
    const grew = game.territory.grow(allow);
    this.dirty = game.territory.deferred > 0;   // keep checking until held-back tiles join
    if (!grew) return;
    game.rebuildTrack();
    game.bus.emit('ground:grew', { tiles: game.territory.lastClaimed });
  }

  trainHasPassed(game, tile, clearance) {
    if (!this.waitingSince.has(tile)) this.waitingSince.set(tile, this.clock);
    const { train, track } = game;
    const lapTime = track.length / game.config.train.speed;
    if (this.clock - this.waitingSince.get(tile) > lapTime) {
      this.waitingSince.delete(tile);
      this.forced++;
      return true;
    }
    const cx = tile.x + 0.5, cy = tile.y + 0.5, limit = clearance * clearance;
    for (let i = -1; i < train.carts.length; i++) {
      const p = track.pointAt(i < 0 ? train.pos : train.pos - train.offsetOf(i));
      if ((p.x - cx) ** 2 + (p.y - cy) ** 2 < limit) return false;
    }
    this.waitingSince.delete(tile);
    return true;
  }
}
