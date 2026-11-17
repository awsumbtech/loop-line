// When a block breaks, lets the cleared ground grow and rebuilds the track.
export class TerritorySystem {
  constructor() {
    this.id = 'territory';
    this.dirty = false;
    this.unsubscribe = null;
  }

  attach(game) {
    this.unsubscribe = game.bus.on('block:broken', () => { this.dirty = true; });
  }

  detach() {
    if (this.unsubscribe) this.unsubscribe();
  }

  update(dt, game) {
    if (!this.dirty) return;
    this.dirty = false;
    if (game.territory.grow()) game.rebuildTrack();
  }
}
