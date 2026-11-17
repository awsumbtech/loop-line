import { BlockType } from './BlockType.js';

// The set of block types the game knows. Register or remove types at any time.
export class BlockCatalog {
  constructor(definitions = []) {
    this.types = new Map();
    for (const def of definitions) this.register(def);
  }

  register(definition) {
    const type = definition instanceof BlockType ? definition : new BlockType(definition);
    this.types.set(type.id, type);
    return type;
  }

  remove(id) {
    return this.types.delete(id);
  }

  get(id) {
    return this.types.get(id) || null;
  }

  all() {
    return [...this.types.values()];
  }

  // Picks a block from weights like { bush: 3, tree: 1 }, using random() in [0, 1).
  // Ids the catalog does not know are skipped, so removing a type never breaks a mix.
  pick(weights, random) {
    const options = Object.entries(weights || {}).filter(([id, w]) => w > 0 && this.types.has(id));
    if (!options.length) return this.all()[0] || null;
    const total = options.reduce((s, [, w]) => s + w, 0);
    let roll = random() * total;
    for (const [id, w] of options) {
      roll -= w;
      if (roll < 0) return this.types.get(id);
    }
    return this.types.get(options[options.length - 1][0]);
  }
}
