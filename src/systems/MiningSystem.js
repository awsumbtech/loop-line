// Each cart strikes every block it passes. Announces hits and breaks on the
// event bus; it does not pay out or grow the track itself.
//
// Passes are counted from the train's running distance, so a block exactly on
// the boundary between two ticks is struck once, never zero or two times.
export class MiningSystem {
  constructor() {
    this.id = 'mining';
  }

  update(dt, game) {
    const { train, track } = game;
    const { from, to } = train.lastMove;
    if (!(to > from) || !track.spots.length) return;
    const length = track.length;
    train.carts.forEach((cart, i) => {
      const back = train.offsetOf(i);
      const power = cart.power(game.config.carts);
      for (const spot of track.spots) {
        const passes = Math.floor((to - back - spot.s) / length) - Math.floor((from - back - spot.s) / length);
        for (let k = 0; k < passes; k++) this.strike(game, game.island.tiles[spot.tile], power);
      }
    });
  }

  strike(game, tile, power) {
    if (!tile || !tile.hasBlock) return;
    tile.damage(power);
    if (tile.hasBlock) {
      game.bus.emit('block:hit', { tile });
    } else {
      const value = tile.block.valueOn(game.island.number, game.config.islands);
      game.bus.emit('block:broken', { tile, block: tile.block, value });
    }
  }
}
