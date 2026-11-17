import { isNum } from '../core/math.js';

// Writes the game's parts to storage and reads them back.
export class SaveManager {
  constructor(storage, { key, version, retiredKeys = [] }) {
    this.storage = storage;
    this.key = key;
    this.version = version;
    this.retiredKeys = retiredKeys;
  }

  save(game, now = Date.now()) {
    this.storage.write(this.key, JSON.stringify({ version: this.version, savedAt: now, parts: game.snapshot() }));
  }

  // Restores the game if a save exists. Returns when it was saved, or 0.
  load(game) {
    for (const old of this.retiredKeys) this.storage.remove(old);
    const text = this.storage.read(this.key);
    if (!text) return 0;
    let data;
    try { data = JSON.parse(text); } catch (e) { return 0; }
    if (!data || data.version !== this.version) return 0;
    game.restore(data.parts);
    return isNum(data.savedAt) ? data.savedAt : 0;
  }

  clear() {
    this.storage.remove(this.key);
  }
}
