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

test('a new game earns 60 coins a minute on paper', () => {
  near(L.incomePerMin(L.freshState()), 60, 1e-9);
});

test('first lap sells a full wagon of 10 wood for 20 coins', () => {
  const st = L.freshState();
  L.advance(st, 20.5, null);
  near(st.coins, 20, 1e-6);
  assert.strictEqual(st.laps, 1);
});

test('the wagon never holds more than its capacity', () => {
  const st = L.freshState();
  for (let i = 0; i < 400; i++) {
    L.step(st, 0.05, null);
    assert(st.cargo <= L.cargoOf(st) + 1e-9);
  }
});

test('trees never go below zero or above fully grown', () => {
  const st = L.freshState();
  st.levels.speed = 30; st.levels.cargo = 50; st.levels.power = 7;
  for (let i = 0; i < 5000; i++) {
    L.step(st, 0.03, null);
    for (const g of st.trees) assert(g >= -1e-9 && g <= 1 + 1e-9);
  }
});

test('buying needs enough coins and takes the price', () => {
  const st = L.freshState();
  assert.strictEqual(L.buy(st, 'cargo'), false);
  st.coins = 10;
  assert.strictEqual(L.buy(st, 'cargo'), true);
  assert.strictEqual(st.coins, 0);
  assert.strictEqual(st.levels.cargo, 1);
  assert.strictEqual(L.cargoOf(st), 15);
  assert.strictEqual(L.costOf(st, 'cargo'), 13);
});

test('long-run earnings match the on-screen estimate', () => {
  const builds = [
    { speed: 0, cargo: 0, power: 0, regrow: 0 },
    { speed: 0, cargo: 4, power: 0, regrow: 0 },
    { speed: 5, cargo: 10, power: 4, regrow: 0 },
    { speed: 20, cargo: 30, power: 6, regrow: 3 },
    { speed: 12, cargo: 2, power: 9, regrow: 10 },
    { speed: 40, cargo: 100, power: 20, regrow: 26 },
  ];
  for (const levels of builds) {
    const st = L.freshState();
    Object.assign(st.levels, levels);
    L.advance(st, 600, null);              // settle in
    const earned = L.advance(st, 3600, null);
    const perMin = earned / 60;
    const est = L.incomePerMin(st);
    assert(Math.abs(perMin - est) / est < 0.04, `build ${JSON.stringify(levels)}: simulated ${perMin.toFixed(1)}/min vs estimate ${est.toFixed(1)}/min`);
  }
});

test('big and small time slices give the same result', () => {
  const a = L.freshState(), b = L.freshState();
  a.levels.speed = b.levels.speed = 8;
  L.advance(a, 300, null);
  for (let i = 0; i < 300 * 60; i++) L.step(b, 1 / 60, null);
  near(a.coins, b.coins, a.coins * 0.02 + 1);
});

test('tapping boosts speed up to double, then fades', () => {
  const st = L.freshState();
  for (let i = 0; i < 10; i++) L.addSteam(st);
  assert.strictEqual(st.steam, 1);
  L.step(st, 0.1, null);
  near(st.pos, 10, 1e-9);                  // 50 units/s doubled for 0.1s
  L.advance(st, 3, null);
  assert.strictEqual(st.steam, 0);
});

test('bottleneck points at the wagon first, then the forest', () => {
  const st = L.freshState();
  assert.strictEqual(L.bottleneck(st), 'cargo');
  st.levels.cargo = 1;
  assert.strictEqual(L.bottleneck(st), 'none');
  st.levels.speed = 15;                    // lap is now shorter than regrow time
  assert.strictEqual(L.bottleneck(st), 'regrow');
});

test('forest upgrade stops at its floor', () => {
  const st = L.freshState();
  st.levels.regrow = 200; st.coins = 1e300;
  assert.strictEqual(L.regrowOf(st), 1.5);
  assert.strictEqual(L.buy(st, 'regrow'), false);
});

test('a save survives a round trip and bad saves fall back safely', () => {
  const st = L.freshState();
  st.levels.speed = 3; st.coins = 123.5;
  L.advance(st, 7.3, null);
  const back = L.deserialize(L.serialize(st, 1700000000000));
  assert.strictEqual(back.levels.speed, 3);
  near(back.coins, st.coins, 1e-9);
  near(back.pos, st.pos, 1e-9);
  assert.strictEqual(back.lastSeen, 1700000000000);
  assert.deepStrictEqual(L.deserialize('not json').levels, L.freshState().levels);
  const bad = L.deserialize(JSON.stringify({ v: 1, coins: -5, cargo: 9999, levels: { speed: 'x' }, trees: [2, -1] }));
  assert.strictEqual(bad.coins, 0);
  assert.strictEqual(bad.cargo, 10);
  assert.strictEqual(bad.levels.speed, 0);
  assert.strictEqual(bad.trees[0], 1);
  assert.strictEqual(bad.trees[1], 0);
});

test('numbers are shortened for display', () => {
  assert.strictEqual(L.fmt(0), '0');
  assert.strictEqual(L.fmt(999.9), '999');
  assert.strictEqual(L.fmt(1000), '1.00K');
  assert.strictEqual(L.fmt(15300), '15.3K');
  assert.strictEqual(L.fmt(2500000), '2.50M');
  assert.strictEqual(L.fmt1(1.5), '1.5');
  assert.strictEqual(L.fmt1(3), '3');
});

// A rough pacing check: how long a player who always buys the cheapest upgrade takes to reach milestones.
(function pacing() {
  const st = L.freshState();
  let t = 0;
  const marks = [5, 15, 30, 60];
  const out = [];
  while (marks.length && t < 4 * 3600) {
    L.advance(st, 1, null); t += 1;
    let best = null;
    for (const k of L.KEYS) if (L.canBuy(st, k) && (!best || L.costOf(st, k) < L.costOf(st, best))) best = k;
    if (best) L.buy(st, best);
    const total = L.KEYS.reduce((s, k) => s + st.levels[k], 0);
    if (total >= marks[0]) { out.push(`${marks.shift()} upgrades at ${(t / 60).toFixed(1)} min (${L.fmt(L.incomePerMin(st))}/min)`); }
  }
  console.log('pacing: ' + out.join(' | '));
})();

console.log(`\n${passed} tests passed`);
