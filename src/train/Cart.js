// One mining cart. Higher levels hit harder.
export class Cart {
  constructor(level = 1) {
    this.level = level;
  }

  power(rules) {
    return Math.round(Math.pow(rules.powerGrowth, this.level - 1));
  }
}
