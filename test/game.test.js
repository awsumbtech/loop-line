// Tests the game without a browser.  Usage: node test/game.test.js
import assert from 'node:assert';
import { BLOCK_TYPES, CONFIG, RINGS } from '../src/config.js';
import { Game } from '../src/Game.js';
import { SaveManager } from '../src/save/SaveManager.js';
import { MemoryStorage } from '../src/save/storage.js';
import { Train } from '../src/train/Train.js';
import { BlockCatalog } from '../src/world/BlockCatalog.js';
import { IslandGenerator } from '../src/world/IslandGenerator.js';
import { Territory } from '../src/world/Territory.js';
import { Track } from '../src/world/Track.js';
import { BlockPainters } from '../src/view/BlockPainters.js';
import { Camera } from '../src/view/Camera.js';
import { GroundFraming, IslandFraming } from '../src/view/framing.js';
import { RateMeter } from '../src/core/RateMeter.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  - ' + name); }
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg || ''} expected ~${b}, got ${a}`);

// Plays like a sensible player: buys when it can, merges when full.
function autoplay(game) {
  while (game.canBuyCart()) game.buyCart();
  while (game.train.carts.length >= game.train.capacity(game.track) && game.canMerge()) game.merge();
}

// ---------------------------------------------------------------- world
test('a new island starts with a small loop around the station and one cart', () => {
  const g = new Game();
  assert.strictEqual(g.territory.size, 9);
  assert.strictEqual(g.track.spots.length, 12);
  assert(g.track.valid);
  assert.deepStrictEqual(g.train.levels, [1]);
  for (const spot of g.track.spots) assert(['bush', 'tree'].includes(g.island.tiles[spot.tile].block.id), 'the first ring is soft');
});

test('the island is ringed by sea: soft blocks inside, a jump at ring 5, mountains at the coast', () => {
  const g = new Game();
  const island = g.island;
  const counts = {};
  for (const t of island.tiles) if (t.block) counts[t.block.id] = (counts[t.block.id] || 0) + 1;
  console.log('      island 1: ' + JSON.stringify(counts));
  for (const id of ['bush', 'tree', 'bigTree', 'rock', 'boulder', 'iron', 'gold', 'mountain']) assert(counts[id] > 5, id + ' should appear');
  for (let x = 0; x < island.width; x++) assert(island.tileAt(x, 0).isWater && island.tileAt(x, island.height - 1).isWater);
  // Average hits needed by ring: gentle for rings 1 to 4, then a big jump.
  const byRing = [];
  for (const t of island.tiles) {
    if (!t.block) continue;
    const r = g.generator.ringOf(t.x, t.y, island);
    (byRing[r] = byRing[r] || []).push(t.maxHp);
  }
  const avg = byRing.map(list => list ? list.reduce((a, b) => a + b, 0) / list.length : 0);
  console.log('      average hits by ring: ' + avg.slice(1).map(a => a.toFixed(0)).join(', '));
  assert(avg[4] < 10, 'ring 4 is still soft');
  assert(avg[5] > avg[4] * 4, 'ring 5 is a jump');
  for (let r = 5; r < avg.length - 1; r++) assert(avg[r + 1] > avg[r] * 1.5, 'each outer ring is much harder');
});

test('a cleared block joins the ground and the track bends around it', () => {
  const g = new Game();
  const before = g.track.length;
  const spot = g.track.spots[0];
  const tile = g.island.tiles[spot.tile];
  tile.hp = 0;
  assert(g.territory.grow());
  g.rebuildTrack();
  assert(g.territory.has(tile.x, tile.y));
  assert.strictEqual(g.territory.size, 10);
  assert(g.track.length > before + 1 && g.track.length < before + 2.5, 'one tile adds up to about two tiles of track');
  assert(g.track.valid);
});

test('ground never gets a hole or a corner-only join', () => {
  const g = new Game();
  // Clear a ring two tiles out but leave one block inside it.
  const { x: cx, y: cy } = g.island.center;
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
    if (x === cx + 2 && y === cy) continue;
    const t = g.island.tileAt(x, y);
    if (t.block) t.hp = 0;
  }
  g.territory.grow();
  assert(!g.territory.has(cx + 2, cy), 'the block is still there');
  assert(Track.fromTerritory(g.territory, 0.3).valid, 'the track is still a single loop');
  g.island.tileAt(cx + 2, cy).hp = 0;
  g.territory.grow();
  assert(g.territory.has(cx + 2, cy));
  assert(Track.fromTerritory(g.territory, 0.3).valid);
});

test('the train stays in place when the track grows', () => {
  const g = new Game();
  g.train.placeAt(4.3);
  const before = g.track.pointAt(g.train.pos);
  g.island.tiles[g.track.spots[0].tile].hp = 0;
  g.territory.grow();
  g.rebuildTrack();
  const after = g.track.pointAt(g.train.pos);
  assert(Math.hypot(before.x - after.x, before.y - after.y) < 0.8);
});

test('each cart strikes each neighbouring block once per lap', () => {
  const g = new Game();
  g.removeSystem('territory');                 // keep the track still for this test
  const hits = new Map();
  const count = e => hits.set(e.tile, (hits.get(e.tile) || 0) + 1);
  g.bus.on('block:hit', count); g.bus.on('block:broken', count);
  g.advance(g.track.length / CONFIG.train.speed * 0.999);
  assert.strictEqual(hits.size, 12);
  for (const n of hits.values()) assert.strictEqual(n, 1);
});

test('every island in a long run clears fully and the track is always one loop', () => {
  const g = new Game();
  let changes = 0;
  g.bus.on('track:changed', () => {
    changes++;
    assert(g.track.valid, 'track must stay a single loop');
  });
  for (let n = 1; n <= 2; n++) {
    let t = 0;
    while (!g.canSail() && t < 3600) { g.advance(1); t++; autoplay(g); }
    assert(g.canSail(), `island ${n} should clear within an hour`);
    assert(changes > 60, 'track should grow in many small steps');
    changes = 0;
    g.sail();
  }
});

// ---------------------------------------------------------------- economy
test('carts cost more each time and stop when the train is full', () => {
  const g = new Game();
  g.wallet.set(1e6);
  const prices = [];
  while (g.canBuyCart()) { prices.push(g.shop.price()); g.buyCart(); }
  assert.strictEqual(g.train.carts.length, g.train.capacity(g.track));
  const { baseCost, costGrowth } = CONFIG.shop;
  assert.deepStrictEqual(prices.slice(0, 4), [0, 1, 2, 3].map(n => Math.ceil(baseCost * Math.pow(costGrowth, n))));
});

test('merging joins the lowest matching pair, strongest carts in front', () => {
  const train = new Train(CONFIG, [3, 2, 1, 1, 2]);
  assert.strictEqual(train.merge(), 2);
  assert.deepStrictEqual(train.levels, [3, 2, 2, 2]);
  assert.strictEqual(train.merge(), 3);
  assert.strictEqual(train.merge(), 4);
  assert.deepStrictEqual(train.levels, [4, 2]);
  assert.strictEqual(train.merge(), 0);
});

test('breaking blocks pays into the wallet', () => {
  const g = new Game();
  g.train = new Train(CONFIG, [3]);
  g.advance(g.track.length / CONFIG.train.speed * 0.999);
  assert(g.wallet.coins >= 12, 'twelve trees at one coin each');
});

test('sailing starts the next island fresh', () => {
  const g = new Game();
  assert.strictEqual(g.sail(), false);
  for (const t of g.island.tiles) t.hp = 0;
  g.wallet.set(900); g.train = new Train(CONFIG, [4, 3]); g.shop.purchases = 5;
  assert.strictEqual(g.sail(), true);
  assert.strictEqual(g.island.number, 2);
  assert.strictEqual(g.wallet.coins, 0);
  assert.deepStrictEqual(g.train.levels, [1]);
  assert.strictEqual(g.shop.price(), CONFIG.shop.baseCost);
  assert.strictEqual(g.territory.size, 9);
  const tree = new BlockCatalog(BLOCK_TYPES).get('tree');
  near(tree.hpOn(2, CONFIG.islands), 3 * CONFIG.islands.length * CONFIG.islands.hpGrowth, 1e-9);
  near(tree.valueOn(2, CONFIG.islands), 2 * CONFIG.islands.valueGrowth, 1e-9);
});

// ---------------------------------------------------------------- saving
test('a save survives a round trip', () => {
  const store = new MemoryStorage();
  const saves = new SaveManager(store, CONFIG.save);
  const a = new Game();
  for (let i = 0; i < 90; i++) { a.advance(1); autoplay(a); }
  saves.save(a, 1700000000000);
  const b = new Game();
  assert.strictEqual(saves.load(b), 1700000000000);
  assert.deepStrictEqual(b.train.levels, a.train.levels);
  assert.deepStrictEqual(b.territory.toJSON(), a.territory.toJSON());
  near(b.wallet.coins, a.wallet.coins, 1e-9);
  near(b.train.pos, a.train.pos, 1e-9);
  assert.strictEqual(b.shop.purchases, a.shop.purchases);
  a.island.tiles.forEach((t, i) => near(b.island.tiles[i].hp, t.hp, 1e-3));
});

test('bad, old or partly broken saves fall back safely', () => {
  const store = new MemoryStorage();
  const saves = new SaveManager(store, CONFIG.save);
  const g = new Game();
  store.write(CONFIG.save.key, 'not json');
  assert.strictEqual(saves.load(g), 0);
  store.write(CONFIG.save.key, JSON.stringify({ version: 3, parts: {} }));
  assert.strictEqual(saves.load(g), 0);
  store.write(CONFIG.save.key, JSON.stringify({ version: CONFIG.save.version, savedAt: 5, parts: {
    island: { number: 1, hp: [1, 2] }, territory: [-4, 'x'], train: { levels: ['a'] }, wallet: { coins: -3 }, mystery: { a: 1 },
  } }));
  assert.strictEqual(saves.load(g), 5);
  assert.strictEqual(g.territory.size, 9);
  assert.deepStrictEqual(g.train.levels, [1]);
  assert.strictEqual(g.wallet.coins, 0);
  assert(g.track.valid);
  store.write('loopline.island.v1', 'old');
  saves.load(g);
  assert.strictEqual(store.read('loopline.island.v1'), null, 'old saves are cleared');
});

// ---------------------------------------------------------------- swapping parts
test('removing the mining system stops mining without breaking anything', () => {
  const g = new Game();
  g.removeSystem('mining');
  g.advance(60);
  assert.strictEqual(g.wallet.coins, 0);
  assert(g.train.pos > 0);
});

test('removing the reward system breaks blocks but pays nothing', () => {
  const g = new Game();
  g.removeSystem('reward');
  g.advance(60);
  assert.strictEqual(g.wallet.coins, 0);
  assert(g.island.clearedShare() > 0);
});

test('removing the territory system keeps the track fixed', () => {
  const g = new Game();
  g.removeSystem('territory');
  g.advance(120);
  assert.strictEqual(g.territory.size, 9);
});

test('a new system can be added while playing', () => {
  const g = new Game();
  let ticks = 0;
  g.addSystem({ id: 'counter', update: () => { ticks++; } });
  g.advance(1);
  assert(ticks > 0);
  assert(g.removeSystem('counter'));
});

test('a new block type shows up when added to a ring', () => {
  const catalog = new BlockCatalog([...BLOCK_TYPES, { id: 'crystal', name: 'Crystal', hp: 900, value: 400 }]);
  const rings = RINGS.map((mix, i) => (i === RINGS.length - 1 ? { ...mix, crystal: 4 } : mix));
  const g = new Game({ catalog, generator: new IslandGenerator(CONFIG, catalog, rings) });
  assert(g.island.tiles.some(t => t.block && t.block.id === 'crystal'));
  assert.strictEqual(new BlockPainters().styleFor('crystal').painter, 'rock', 'unknown blocks draw with the fallback');
});

test('the island length setting stretches every block', () => {
  const longer = { ...CONFIG, islands: { ...CONFIG.islands, length: CONFIG.islands.length * 2 } };
  const a = new Game(), b = new Game({ config: longer });
  a.island.tiles.forEach((t, i) => near(b.island.tiles[i].maxHp, t.maxHp * 2, 1e-9));
});

test('a block type can be removed and the game still runs', () => {
  const catalog = new BlockCatalog(BLOCK_TYPES);
  catalog.remove('gold');
  const g = new Game({ catalog });
  assert(!g.island.tiles.some(t => t.block && t.block.id === 'gold'));
  g.advance(30);
  assert(g.wallet.coins > 0);
});

test('the island generator can be swapped', () => {
  class AllTrees extends IslandGenerator {
    generate(n) {
      const island = super.generate(n);
      const tree = this.catalog.get('tree');
      for (const t of island.tiles) if (t.block) { t.block = tree; t.maxHp = t.hp = tree.hpOn(n, this.config.islands); }
      return island;
    }
  }
  const catalog = new BlockCatalog(BLOCK_TYPES);
  const g = new Game({ catalog, generator: new AllTrees(CONFIG, catalog) });
  assert(g.island.tiles.every(t => !t.block || t.block.id === 'tree'));
});

test('a save part can be removed or added', () => {
  const store = new MemoryStorage();
  const saves = new SaveManager(store, CONFIG.save);
  const a = new Game();
  a.removePart('stats');
  a.addPart('note', { save: () => ({ text: 'hello' }), load: () => {} });
  a.advance(30);
  saves.save(a);
  const b = new Game();
  saves.load(b);
  near(b.wallet.coins, a.wallet.coins, 1e-9);
});

// ---------------------------------------------------------------- moments
test('milestones: rings, best levels and a cleared island are announced once each', () => {
  const g = new Game();
  const seen = { ring: [], best: [], cleared: 0, grew: 0, bought: 0, merged: 0 };
  g.bus.on('ring:cleared', e => seen.ring.push(e.ring));
  g.bus.on('level:best', e => seen.best.push(e.level));
  g.bus.on('island:cleared', () => seen.cleared++);
  g.bus.on('ground:grew', e => { seen.grew += e.tiles.length; });
  g.bus.on('cart:bought', () => seen.bought++);
  g.bus.on('cart:merged', () => seen.merged++);
  let t = 0;
  while (!g.canSail() && t < 3600) { g.advance(1); t++; autoplay(g); }
  g.advance(30);
  const rings = g.getSystem('milestones').rings;
  assert.deepStrictEqual(seen.ring, Array.from({ length: rings }, (_, i) => i + 1), 'each ring once, in order');
  assert.strictEqual(g.getSystem('milestones').ringsCleared, rings);
  assert.strictEqual(seen.cleared, 1);
  assert(seen.best.length >= 4 && seen.best.every((l, i) => i === 0 || l > seen.best[i - 1]));
  assert(seen.grew > 300 && seen.bought > 10 && seen.merged > 10);
});

test('removing the milestone system just removes the moments', () => {
  const g = new Game();
  g.removeSystem('milestones');
  let rings = 0;
  g.bus.on('ring:cleared', () => rings++);
  for (let t = 0; t < 300; t++) { g.advance(1); autoplay(g); }
  assert.strictEqual(rings, 0);
  assert(g.territory.size > 9);
});

test('the camera starts close on the ground and ends showing the whole island', () => {
  const g = new Game();
  const view = { game: g, width: 390, height: 530, camera: new Camera(), reduceMotion: false };
  const framing = new GroundFraming();
  framing.snap(view);
  const close = view.camera.size;
  new IslandFraming().snap(view);
  const whole = view.camera.size;
  assert(close > whole * 1.8, 'starts zoomed in');
  for (const t of g.island.tiles) if (t.block) t.hp = 0;
  g.territory.grow();
  framing.snap(view);
  near(view.camera.size, whole, 1e-6, 'ends on the whole island');
  framing.update(view, 1 / 60);
  assert(Number.isFinite(view.camera.ox));
});

test('the income meter measures coins per minute', () => {
  const m = new RateMeter(60);
  for (let t = 0; t <= 120; t++) m.sample(t, t * 2);
  near(m.perMinute(), 120, 1e-6);
  m.sample(121, 0);   // a reset total starts over
  assert.strictEqual(m.perMinute(), null, 'nothing to show until there is enough to measure');
});

// ---------------------------------------------------------------- pacing
(function pacing() {
  const g = new Game();
  const out = [];
  for (let n = 1; n <= 3; n++) {
    let t = 0;
    while (!g.canSail() && t < 3 * 3600) { g.advance(1); t++; autoplay(g); }
    out.push(`island ${n}: ${(t / 60).toFixed(1)} min, ended with carts ${g.train.levels.join(',')}`);
    g.sail();
  }
  console.log('pacing with ideal play:\n      ' + out.join('\n      '));
})();

console.log(`\n${passed} tests passed`);
