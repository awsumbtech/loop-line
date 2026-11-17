import { mod } from '../core/math.js';

// Each cart strikes every block it passes. Announces hits and breaks on the
// event bus; it does not pay out or grow the track itself.
export class MiningSystem {
  constructor() {
    this.id = 'mining';
  }

  update(dt, game) {
    const { train, track } = game;
    const { from, dist } = train.lastMove;
    if (!(dist > 0) || !track.spots.length) return;
    const length = track.length;
    train.carts.forEach((cart, i) => {
      const start = from - train.offsetOf(i);
      const power = cart.power(game.config.carts);
      for (const spot of track.spots) {
        const ahead = mod(spot.s - start, length);
        if (ahead > 0 && ahead <= dist) this.strike(game, game.island.tiles[spot.tile], power);
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
