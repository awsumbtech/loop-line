// One kind of block, such as a bush or a mountain.
export class BlockType {
  constructor({ id, name = id, hp, value }) {
    if (!id) throw new Error('A block type needs an id');
    this.id = id;
    this.name = name;
    this.hp = hp;
    this.value = value;
  }

  // rules.length stretches every island; later islands are tougher and richer.
  hpOn(islandNumber, rules) {
    return this.hp * (rules.length || 1) * Math.pow(rules.hpGrowth, islandNumber - 1);
  }

  valueOn(islandNumber, rules) {
    return this.value * Math.pow(rules.valueGrowth, islandNumber - 1);
  }
}
