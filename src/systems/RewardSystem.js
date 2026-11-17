// Pays the block's value into the wallet when a block breaks.
export class RewardSystem {
  constructor() {
    this.id = 'reward';
    this.unsubscribe = null;
  }

  attach(game) {
    this.unsubscribe = game.bus.on('block:broken', e => game.wallet.add(e.value));
  }

  detach() {
    if (this.unsubscribe) this.unsubscribe();
  }

  update() {}
}
