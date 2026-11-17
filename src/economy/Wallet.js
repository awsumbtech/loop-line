import { isNum } from '../core/math.js';

// The player's coins.
export class Wallet {
  constructor(bus, coins = 0) {
    this.bus = bus;
    this.coins = coins;
    this.earned = 0;   // all coins ever earned, for measuring income
  }

  set(coins) {
    this.coins = coins;
    this.changed();
  }

  add(amount) {
    this.coins += amount;
    this.earned += amount;
    this.changed();
  }

  canAfford(amount) {
    return this.coins >= amount;
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.coins -= amount;
    this.changed();
    return true;
  }

  changed() {
    if (this.bus) this.bus.emit('coins:changed', { coins: this.coins });
  }

  toJSON() {
    return { coins: this.coins };
  }

  restore(data) {
    if (data && isNum(data.coins) && data.coins >= 0) this.set(data.coins);
  }
}
