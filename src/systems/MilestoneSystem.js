// Watches for moments worth celebrating and announces them:
//   ring:cleared   when every block in the next ring out is gone
//   island:cleared when the last block breaks
//   level:best     when a cart reaches a new best level
// It also keeps ring progress for the panels. It only reads the game and sends
// events, so removing it just removes those moments.
export class MilestoneSystem {
  constructor() {
    this.id = 'milestones';
    this.rings = 0;          // rings of blocks on this island
    this.ringsCleared = 0;   // rings 1..ringsCleared have no blocks left
    this.remaining = [];     // blocks left in each ring
    this.best = 1;
    this.cleared = false;
    this.unsubscribers = [];
  }

  attach(game) {
    const bus = game.bus;
    this.unsubscribers = [
      bus.on('island:started', () => this.reset(game)),
      bus.on('game:restored', () => this.reset(game)),
      bus.on('block:broken', e => this.onBroken(game, e.tile)),
      bus.on('cart:bought', () => this.checkBest(game)),
      bus.on('cart:merged', () => this.checkBest(game)),
    ];
    this.reset(game);
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  // Rings come from the island generator; a generator without rings just gets no ring moments.
  ringOf(game, tile) {
    const g = game.generator;
    return g && typeof g.ringOf === 'function' ? Math.max(0, g.ringOf(tile.x, tile.y, game.island)) : 0;
  }

  reset(game) {
    if (!game.island) return;
    this.rings = 0;
    for (const tile of game.island.tiles) if (tile.block) this.rings = Math.max(this.rings, this.ringOf(game, tile));
    this.remaining = new Array(this.rings + 1).fill(0);
    for (const tile of game.island.tiles) if (tile.hasBlock) this.remaining[this.ringOf(game, tile)]++;
    this.ringsCleared = 0;
    while (this.ringsCleared < this.rings && this.remaining[this.ringsCleared + 1] === 0) this.ringsCleared++;
    this.best = game.train ? game.train.bestLevel() : 1;
    this.cleared = game.island.isCleared();
  }

  onBroken(game, tile) {
    if (this.rings) {
      this.remaining[this.ringOf(game, tile)]--;
      while (this.ringsCleared < this.rings && this.remaining[this.ringsCleared + 1] <= 0) {
        this.ringsCleared++;
        game.bus.emit('ring:cleared', { ring: this.ringsCleared, rings: this.rings, next: this.namesIn(game, this.ringsCleared + 1) });
      }
    }
    if (!this.cleared && game.island.isCleared()) {
      this.cleared = true;
      game.bus.emit('island:cleared', { number: game.island.number });
    }
  }

  // Names of the blocks still standing in a ring.
  namesIn(game, ring) {
    const names = new Set();
    for (const tile of game.island.tiles) if (tile.hasBlock && this.ringOf(game, tile) === ring) names.add(tile.block.name);
    return [...names];
  }

  checkBest(game) {
    const best = game.train.bestLevel();
    if (best <= this.best) return;
    this.best = best;
    game.bus.emit('level:best', { level: best });
  }

  update() {}
}
