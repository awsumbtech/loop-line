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
    return [...this.types.values()].sort((a, b) => a.reach - b.reach);
  }

  // The block nearest the middle of the island.
  innermost() {
    return this.all()[0] || null;
  }

  // The block that belongs at a distance from the middle (0 middle, 1 coast).
  forReach(distance) {
    let pick = null;
    for (const type of this.all()) if (distance >= type.reach) pick = type;
    return pick || this.innermost();
  }
}
