import { isNum } from '../core/math.js';

// Sells carts. Each one costs more than the last, and new carts arrive a couple
// of levels below the best cart so they stay useful.
export class CartShop {
  constructor(rules) {
    this.rules = rules;
    this.purchases = 0;
  }

  price() {
    return Math.ceil(this.rules.baseCost * Math.pow(this.rules.costGrowth, this.purchases));
  }

  levelFor(train) {
    return Math.max(1, train.bestLevel() - this.rules.levelsBelowBest);
  }

  hasRoom(train, track) {
    return train.carts.length < train.capacity(track);
  }

  canBuy(train, track, wallet) {
    return this.hasRoom(train, track) && wallet.canAfford(this.price());
  }

  // Returns the new cart's level, or 0 if it could not be bought.
  buy(train, track, wallet) {
    if (!this.canBuy(train, track, wallet)) return 0;
    const level = this.levelFor(train);
    wallet.spend(this.price());
    this.purchases += 1;
    train.add(level);
    return level;
  }

  reset() {
    this.purchases = 0;
  }

  toJSON() {
    return { purchases: this.purchases };
  }

  restore(data) {
    if (data && isNum(data.purchases) && data.purchases >= 0) this.purchases = Math.floor(data.purchases);
  }
}
