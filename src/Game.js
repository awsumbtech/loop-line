import { BLOCK_TYPES, CONFIG } from './config.js';
import { EventBus } from './core/EventBus.js';
import { clamp, isNum } from './core/math.js';
import { CartShop } from './economy/CartShop.js';
import { Wallet } from './economy/Wallet.js';
import { MiningSystem } from './systems/MiningSystem.js';
import { RewardSystem } from './systems/RewardSystem.js';
import { TerritorySystem } from './systems/TerritorySystem.js';
import { TrainSystem } from './systems/TrainSystem.js';
import { Train } from './train/Train.js';
import { BlockCatalog } from './world/BlockCatalog.js';
import { IslandGenerator } from './world/IslandGenerator.js';
import { Territory } from './world/Territory.js';
import { Track } from './world/Track.js';

export const defaultSystems = () => [new TrainSystem(), new MiningSystem(), new RewardSystem(), new TerritorySystem()];

// Holds the game's state and runs its systems. Every piece is passed in or
// built from config, so any of them can be replaced:
//   new Game({ config, catalog, generator, systems })
// Systems run in order each tick and can be added or removed while playing.
// Saved state is split into named parts that save and load independently.
export class Game {
  constructor(options = {}) {
    this.config = options.config || CONFIG;
    this.catalog = options.catalog || new BlockCatalog(BLOCK_TYPES);
    this.generator = options.generator || new IslandGenerator(this.config, this.catalog);
    this.bus = new EventBus();
    this.wallet = new Wallet(this.bus);
    this.shop = new CartShop(this.config.shop);
    this.stats = { taps: 0 };
    this.systems = [];
    this.parts = new Map();
    this.addDefaultParts();
    for (const system of options.systems || defaultSystems()) this.addSystem(system);
    this.startIsland(1);
  }

  // ---------------------------------------------------------------- systems
  addSystem(system, index = this.systems.length) {
    this.systems.splice(index, 0, system);
    if (system.attach) system.attach(this);
    return system;
  }

  removeSystem(id) {
    const i = this.systems.findIndex(s => s.id === id);
    if (i < 0) return null;
    const [system] = this.systems.splice(i, 1);
    if (system.detach) system.detach(this);
    return system;
  }

  getSystem(id) {
    return this.systems.find(s => s.id === id) || null;
  }

  // ---------------------------------------------------------------- islands
  // Every island starts fresh: the starting carts and coins, a small loop.
  startIsland(number) {
    this.island = this.generator.generate(number);
    this.territory = Territory.around(this.island, this.config.start.claimRadius);
    this.train = new Train(this.config, this.config.start.carts);
    this.wallet.set(this.config.start.coins);
    this.shop.reset();
    this.track = null;
    this.rebuildTrack();
    this.bus.emit('island:started', { number });
  }

  canSail() {
    return this.island.isCleared();
  }

  sail() {
    if (!this.canSail()) return false;
    this.startIsland(this.island.number + 1);
    return true;
  }

  reset() {
    this.stats.taps = 0;
    this.startIsland(1);
  }

  // Redraws the track around the ground, keeping the train where it was.
  rebuildTrack() {
    const where = this.track ? this.track.pointAt(this.train.pos) : null;
    this.track = Track.fromTerritory(this.territory, this.config.track.inset);
    this.train.pos = where ? this.track.nearestS(where) : 0;
    this.bus.emit('track:changed', { track: this.track });
  }

  // ---------------------------------------------------------------- time
  step(dt) {
    for (const system of this.systems) system.update(dt, this);
  }

  // Runs any amount of time in small slices. Returns coins earned.
  advance(seconds) {
    const before = this.wallet.earned;
    const s = this.config;
    const slice = Math.min(0.1, 0.4 / (s.train.speed * (1 + s.steam.max)));
    for (let left = seconds; left > 1e-9; left -= slice) this.step(Math.min(slice, left));
    return this.wallet.earned - before;
  }

  // Time spent away, up to the offline limit. Returns coins earned.
  catchUp(seconds) {
    if (!(seconds > 0)) return 0;
    this.train.steam = 0;
    return this.advance(Math.min(seconds, this.config.offline.capSeconds));
  }

  // ---------------------------------------------------------------- actions
  boost() {
    this.train.boost();
    this.stats.taps += 1;
  }

  canBuyCart() { return this.shop.canBuy(this.train, this.track, this.wallet); }
  buyCart() { return this.shop.buy(this.train, this.track, this.wallet); }
  canMerge() { return this.train.mergeLevel() > 0; }
  merge() { return this.train.merge(); }

  // ---------------------------------------------------------------- saving
  // A part is { save(): data, load(data) }. Parts load in the order added;
  // one that fails to load is skipped and keeps its fresh state.
  addPart(key, part) {
    this.parts.set(key, part);
  }

  removePart(key) {
    return this.parts.delete(key);
  }

  addDefaultParts() {
    this.addPart('island', {
      save: () => this.island.toJSON(),
      load: data => {
        const number = isNum(data && data.number) ? clamp(Math.floor(data.number), 1, 1000) : 1;
        this.startIsland(number);
        this.island.restore(data);
      },
    });
    this.addPart('territory', {
      save: () => this.territory.toJSON(),
      load: data => {
        const territory = Territory.fromJSON(this.island, data);
        if (!territory) return;
        const track = Track.fromTerritory(territory, this.config.track.inset);
        if (!track.valid) return;
        this.territory = territory;
        this.track = track;
        this.bus.emit('track:changed', { track });
      },
    });
    this.addPart('train', { save: () => this.train.toJSON(), load: data => this.train.restore(data, this.track) });
    this.addPart('wallet', { save: () => this.wallet.toJSON(), load: data => this.wallet.restore(data) });
    this.addPart('shop', { save: () => this.shop.toJSON(), load: data => this.shop.restore(data) });
    this.addPart('stats', {
      save: () => ({ ...this.stats }),
      load: data => { if (data && isNum(data.taps)) this.stats.taps = Math.max(0, Math.floor(data.taps)); },
    });
  }

  snapshot() {
    const out = {};
    for (const [key, part] of this.parts) out[key] = part.save();
    return out;
  }

  restore(data) {
    if (!data || typeof data !== 'object') return;
    for (const [key, part] of this.parts) {
      if (!(key in data)) continue;
      try { part.load(data[key]); } catch (e) { /* keep this part's fresh state */ }
    }
  }
}
