// One square of the island: sea or land, possibly holding a block.
export class Tile {
  constructor(x, y, terrain, block = null, hp = 0) {
    this.x = x;
    this.y = y;
    this.terrain = terrain;     // 'land' or 'water'
    this.block = block;         // a BlockType, or null; kept after breaking so the spot can be drawn
    this.maxHp = hp;
    this.hp = hp;
  }

  get isWater() { return this.terrain === 'water'; }
  get hasBlock() { return this.block !== null && this.hp > 0; }
  get isClear() { return !this.isWater && !this.hasBlock; }
  get health() { return this.maxHp > 0 ? this.hp / this.maxHp : 0; }

  // Returns the damage actually taken.
  damage(amount) {
    if (!this.hasBlock) return 0;
    const before = this.hp;
    this.hp = this.hp - amount <= 1e-9 ? 0 : this.hp - amount;
    return before - this.hp;
  }
}
