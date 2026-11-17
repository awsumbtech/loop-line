// One kind of block, such as a tree or a gold rock.
export class BlockType {
  constructor({ id, name = id, hp, value, reach = 0 }) {
    if (!id) throw new Error('A block type needs an id');
    this.id = id;
    this.name = name;
    this.hp = hp;
    this.value = value;
    this.reach = reach;
  }

  // Blocks get tougher and richer on later islands.
  hpOn(islandNumber, rules) {
    return this.hp * Math.pow(rules.hpGrowth, islandNumber - 1);
  }

  valueOn(islandNumber, rules) {
    return this.value * Math.pow(rules.valueGrowth, islandNumber - 1);
  }
}
