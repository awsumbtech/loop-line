// Runs the game rules from index.html on their own, without a browser.
// Usage: node test/logic.test.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\/ <logic>([\s\S]*?)\/\/ <\/logic>/);
assert(m, 'logic markers not found in index.html');
const L = new Function(m[1] + '\nreturn Logic;')();

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  - ' + name); }
const near = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, `${msg || ''} expected ~${b}, got ${a}`);
const { CFG, idx } = L;

test('a new game starts on a small loop in the middle with one cart', () => {
  const st = L.freshState();
  assert.deepStrictEqual(st.track, { x0: L.CX - 1, y0: L.CY - 1, x1: L.CX + 1, y1: L.CY + 1 });
  assert.strictEqual(L.perimOf(st.track), 8);
  assert.deepStrictEqual(st.carts, [1]);
  assert.strictEqual(L.slotsOf(st), 6);
  for (const a of L.adjacency(st.track)) assert.strictEqual(st.tiles[a.i].type, 'tree');
  assert.strictEqual(L.adjacency(st.track).length, 16);
});

test('the island is surrounded by sea and covered from the middle outward', () => {
  const tiles = L.makeIsland(1);
  for (let x = 0; x < CFG.W; x++) { assert.strictEqual(tiles[idx(x, 0)].type, 'water'); assert.strictEqual(tiles[idx(x, CFG.H - 1)].type, 'water'); }
  const counts = {};
  for (const t of tiles) counts[t.type] = (counts[t.type] || 0) + 1;
  console.log('      island 1: ' + JSON.stringify(counts));
  assert(counts.tree > 35 && counts.rock > 15 && counts.copper > 15 && counts.gold > 8);
  for (let y = L.LIMIT.y0; y <= L.LIMIT.y1; y++) for (let x = L.LIMIT.x0; x <= L.LIMIT.x1; x++) assert.notStrictEqual(tiles[idx(x, y)].type, 'water');
});

test('every tile next to the track gets one spot on it', () => {
  const t = { x0: 3, y0: 4, x1: 8, y1: 11 };
  const adj = L.adjacency(t);
  assert.strictEqual(adj.length, 2 * (6 + 8) + 4);   // 6 and 8 tiles along each side, plus 4 corners
  const seen = new Set(adj.map(a => a.i));
  assert.strictEqual(seen.size, adj.length);
  for (const a of adj) {
    const p = L.pointAt(t, a.s);
    assert(Math.abs(p.x - a.x) <= 1 + 1e-9 && Math.abs(p.y - a.y) <= 1 + 1e-9, 'spot is beside the tile');
  }
});

test('a cart hits each neighbouring tile once per lap', () => {
  const st = L.freshState();
  const hits = new Map();
  const events = [];
  L.advance(st, L.perimOf(st.track) / CFG.speed * 0.999, events);
  for (const e of events) if (e.type === 'hit' || e.type === 'break') hits.set(e.i, (hits.get(e.i) || 0) + 1);
  assert.strictEqual(hits.size, 16);
  for (const n of hits.values()) assert.strictEqual(n, 1);
});

test('clearing a side moves it out one tile and the inside stays clear', () => {
  const st = L.freshState();
  const t = st.track;
  for (let x = t.x0; x <= t.x1; x++) st.tiles[idx(x, t.y0 - 1)].hp = 0;
  const before = t.y0;
  assert.strictEqual(L.tryExpand(st, null), true);
  assert.strictEqual(st.track.y0, before - 1);
  assert.strictEqual(st.track.y1, L.CY + 1);
  for (let y = st.track.y0; y <= st.track.y1; y++) for (let x = st.track.x0; x <= st.track.x1; x++) assert.strictEqual(st.tiles[idx(x, y)].hp, 0);
  assert.strictEqual(L.tryExpand(st, null), false);
});

test('the track never grows past the coast', () => {
  const st = L.freshState();
  for (const t of st.tiles) t.hp = 0;
  L.tryExpand(st, null);
  assert.deepStrictEqual(st.track, { x0: L.LIMIT.x0, y0: L.LIMIT.y0, x1: L.LIMIT.x1, y1: L.LIMIT.y1 });
});

test('the train keeps its place on screen when the track grows', () => {
  const st = L.freshState();
  st.pos = 3;   // on the right side
  const p = L.pointAt(st.track, st.pos);
  for (let x = st.track.x0; x <= st.track.x1; x++) st.tiles[idx(x, st.track.y0 - 1)].hp = 0;
  L.tryExpand(st, null);
  const q = L.pointAt(st.track, st.pos);
  near(Math.hypot(p.x - q.x, p.y - q.y), 0, 1e-9);
});

test('breaking a block pays its value', () => {
  const st = L.freshState();
  st.carts = [3];   // 5 damage, enough for any tree
  const events = [];
  L.advance(st, 8 / CFG.speed * 0.999, events);
  assert.strictEqual(events.filter(e => e.type === 'break').length, 16);
  near(st.coins, 16, 1e-9);
});

test('buying carts costs more each time and stops when the train is full', () => {
  const st = L.freshState();
  st.coins = 1e6;
  const costs = [];
  while (L.canBuyCart(st)) { costs.push(L.cartCostOf(st)); L.buyCart(st); }
  assert.strictEqual(st.carts.length, 6);
  assert.deepStrictEqual(costs, [10, 15, 22, 31, 45]);   // the starting cart fills the first slot
});

test('merging joins the lowest matching pair and keeps the strongest at the front', () => {
  const st = L.freshState();
  st.carts = [3, 2, 1, 1, 2];
  assert.strictEqual(L.mergeLevel(st), 1);
  assert.strictEqual(L.merge(st), 2);
  assert.deepStrictEqual(st.carts, [3, 2, 2, 2]);
  assert.strictEqual(L.merge(st), 3);
  assert.deepStrictEqual(st.carts, [3, 3, 2]);
  assert.strictEqual(L.merge(st), 4);
  assert.deepStrictEqual(st.carts, [4, 2]);
  assert.strictEqual(L.merge(st), 0);
});

test('higher level carts hit harder and new carts keep up with the train', () => {
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6].map(L.powerOf), [1, 2, 5, 11, 23, 52]);
  const st = L.freshState();
  st.carts = [6, 2];
  assert.strictEqual(L.buyLevelOf(st), 4);
});

test('a cleared island leads to a tougher one, keeping carts and coins', () => {
  const st = L.freshState();
  assert.strictEqual(L.sail(st), false);
  for (const t of st.tiles) t.hp = 0;
  st.coins = 500; st.carts = [4, 3];
  assert.strictEqual(L.islandDone(st), true);
  assert.strictEqual(L.sail(st), true);
  assert.strictEqual(st.island, 2);
  assert.strictEqual(st.coins, 500);
  assert.deepStrictEqual(st.carts, [4, 3]);
  assert.strictEqual(L.perimOf(st.track), 8);
  assert.strictEqual(L.maxHpOf('tree', 2), 4);
  assert.strictEqual(L.valueOf('gold', 2), 40);
  near(L.clearedShare(st), 0, 1e-9);
});

test('a save survives a round trip', () => {
  const st = L.freshState();
  st.carts = [2, 1, 1];
  L.advance(st, 60, null);
  const back = L.deserialize(L.serialize(st, 1700000000000));
  assert.deepStrictEqual(back.track, st.track);
  assert.deepStrictEqual(back.carts, st.carts);
  near(back.coins, st.coins, 1e-9);
  near(back.pos, st.pos, 1e-9);
  st.tiles.forEach((t, i) => near(back.tiles[i].hp, t.hp, 1e-3));
});

test('bad or old saves fall back safely', () => {
  assert.deepStrictEqual(L.deserialize('not json').carts, [1]);
  assert.strictEqual(L.deserialize(JSON.stringify({ v: 2, coins: 5000 })).coins, 0);
  const bad = L.deserialize(JSON.stringify({ v: 3, coins: -1, carts: [], track: { x0: -5, y0: 99, x1: 0, y1: 0 }, hp: [1, 2] }));
  assert.strictEqual(bad.coins, 0);
  assert.deepStrictEqual(bad.carts, [1]);
  assert(bad.track.x0 >= L.LIMIT.x0 && bad.track.y1 <= L.LIMIT.y1 && bad.track.x0 < bad.track.x1);
});

test('big and small time slices give the same result', () => {
  const a = L.freshState(), b = L.freshState();
  a.carts = [3, 2, 2]; b.carts = [3, 2, 2];
  L.advance(a, 120, null);
  for (let i = 0; i < 120 * 60; i++) L.step(b, 1 / 60, null);
  near(a.coins, b.coins, a.coins * 0.03 + 2);
});

// A rough pacing check: a player who buys a cart whenever there is room and
// money, merges when the train is full, and sails as soon as an island is clear.
(function pacing() {
  const st = L.freshState();
  const out = [];
  let t = 0, grows = 0;
  const marks = [0.25, 0.5, 0.75];
  while (t < 4 * 3600 && st.island <= 3) {
    const ev = [];
    L.advance(st, 1, ev); t += 1;
    if (ev.some(e => e.type === 'grow')) grows++;
    while (L.canBuyCart(st)) L.buyCart(st);
    while (st.carts.length >= L.slotsOf(st) && L.mergeLevel(st)) L.merge(st);
    const share = L.clearedShare(st);
    while (marks.length && share >= marks[0]) out.push(`island ${st.island} ${marks.shift() * 100}% at ${(t / 60).toFixed(1)} min (carts ${st.carts.join(',')})`);
    if (L.islandDone(st)) {
      out.push(`island ${st.island} cleared at ${(t / 60).toFixed(1)} min, carts ${st.carts.join(',')}, track grew ${grows} times`);
      L.sail(st); grows = 0; marks.push(0.25, 0.5, 0.75);
    }
  }
  console.log('pacing:\n      ' + out.join('\n      '));
})();

console.log(`\n${passed} tests passed`);
