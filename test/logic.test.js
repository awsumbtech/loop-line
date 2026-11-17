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
function stateAt(land, levels) {
  const st = L.freshState();
  st.land = land;
  st.nodes = Array.from({ length: L.LANDS[land].nodes }, () => 1);
  Object.assign(st.levels, levels || {});
  return st;
}

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
  for (const land of [0, 3, 5]) {
    const st = stateAt(land, { power: 6 });
    for (let i = 0; i < 2000; i++) {
      L.step(st, 0.05, null);
      assert(L.cargoTotal(st) <= L.cargoOf(st) + 1e-9);
    }
  }
});

test('trees and rocks never go below zero or above fully grown', () => {
  const st = stateAt(5, { speed: 30, cargo: 50, power: 7 });
  for (let i = 0; i < 5000; i++) {
    L.step(st, 0.03, null);
    for (const g of st.nodes) assert(g >= -1e-9 && g <= 1 + 1e-9);
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

test('the loop is a closed, evenly measured track that starts at the depot', () => {
  for (const land of L.LANDS) {
    const lp = L.loopAt(land.size);
    near(lp.perim, 1000 * land.size, 1e-9);
    const start = lp.at(0);
    near(start.x, 0, 1e-9); near(start.y, 0, 1e-9);
    const n = 2000;
    let prev = lp.at(0), total = 0;
    for (let i = 1; i <= n; i++) {
      const p = lp.at(i / n);
      const d = Math.hypot(p.x - prev.x, p.y - prev.y);
      assert(d < lp.perim / n * 1.01, 'no jumps along the track');
      total += d; prev = p;
    }
    near(total, lp.perim, lp.perim * 0.001, 'measured length');
  }
});

test('each land has the right number of spots, and new ground opens in order', () => {
  const rows = L.LANDS.map((land, i) => {
    const c = L.countsFor(i);
    assert.strictEqual(L.RES_KEYS.reduce((s, k) => s + c[k], 0), land.nodes);
    // Land i reaches exactly the first i + 1 kinds of ground, and a fair share of the newest.
    L.RES_KEYS.forEach((k, j) => assert(j <= i ? c[k] > 0 : c[k] === 0, `${land.name} ${k}: ${c[k]}`));
    if (i > 0) assert(c[L.RES_KEYS[i]] >= land.nodes * 0.25, `${land.name} should have plenty of ${L.RES_KEYS[i]}`);
    return `${land.name}: ` + L.RES_KEYS.filter(k => c[k]).map(k => `${c[k]} ${k}`).join(', ');
  });
  console.log('      ' + rows.join('\n      '));
});

test('extending the line costs coins, grows the lap and keeps the train in place', () => {
  const st = L.freshState();
  assert.strictEqual(L.expand(st), false);
  st.coins = 250; st.pos = 500; st.cargo.wood = 4; st.nodes[3] = 0.2;
  assert.strictEqual(L.expand(st), true);
  assert.strictEqual(st.land, 1);
  assert.strictEqual(st.coins, 100);
  near(L.trackLenOf(st), 1400, 1e-9);
  near(st.pos, 700, 1e-9);                 // still halfway round
  assert.strictEqual(st.nodes.length, 18);
  assert(st.nodes.every(g => g === 1));
  assert.strictEqual(st.cargo.wood, 4);
  st.land = L.LANDS.length - 1; st.coins = 1e12;
  assert.strictEqual(L.expand(st), false);  // nothing beyond the last land
});

test('every land is worth more than the one before for the same train', () => {
  const builds = [{ speed: 6, cargo: 12, power: 3, regrow: 3 }, { speed: 15, cargo: 40, power: 8, regrow: 8 }];
  for (const levels of builds) {
    let prev = 0;
    const line = [];
    for (let land = 0; land < L.LANDS.length; land++) {
      const inc = L.incomePerMin(stateAt(land, levels));
      line.push(L.fmt(inc));
      assert(inc > prev * 1.3, `land ${land} should clearly out-earn land ${land - 1} with ${JSON.stringify(levels)}`);
      prev = inc;
    }
    console.log('      coins/min by land: ' + line.join(' → '));
  }
});

test('richer ground sells for more', () => {
  const st = stateAt(4, { cargo: 100 });
  const seen = {};
  for (const k of L.RES_KEYS) seen[k] = 0;
  const events = [];
  L.advance(st, L.lapTimeOf(st) + 1, events);
  let sold = 0, value = 0;
  for (const e of events) {
    if (e.type === 'cut') { seen[e.res] += e.amount; }
    if (e.type === 'sell') sold += e.amount;
  }
  const c = L.countsFor(4);
  value = c.wood * 2 + c.hardwood * 4 + c.stone * 8 + c.iron * 16 + c.gold * 32;
  assert(seen.stone > 0 && seen.gold > 0 && seen.crystal === 0);
  near(sold, value, 1e-6, 'one full lap sale');
});

test('long-run earnings match the on-screen estimate in every land', () => {
  const builds = [
    [0, { speed: 0, cargo: 0, power: 0, regrow: 0 }],
    [0, { speed: 0, cargo: 4, power: 0, regrow: 0 }],
    [1, { speed: 5, cargo: 10, power: 4, regrow: 0 }],
    [2, { speed: 8, cargo: 3, power: 2, regrow: 1 }],
    [3, { speed: 20, cargo: 30, power: 6, regrow: 3 }],
    [4, { speed: 12, cargo: 2, power: 9, regrow: 10 }],
    [5, { speed: 40, cargo: 100, power: 20, regrow: 26 }],
    [5, { speed: 60, cargo: 300, power: 30, regrow: 12 }],
  ];
  for (const [land, levels] of builds) {
    const st = stateAt(land, levels);
    L.advance(st, 600, null);              // settle in
    const earned = L.advance(st, 3600, null);
    const perMin = earned / 60;
    const est = L.incomePerMin(st);
    assert(Math.abs(perMin - est) / est < 0.05, `land ${land} ${JSON.stringify(levels)}: simulated ${perMin.toFixed(1)}/min vs estimate ${est.toFixed(1)}/min`);
  }
});

test('big and small time slices give the same result', () => {
  const a = stateAt(2, { speed: 8 }), b = stateAt(2, { speed: 8 });
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

test('bottleneck points at the wagon first, then growth', () => {
  const st = L.freshState();
  assert.strictEqual(L.bottleneck(st), 'cargo');
  st.levels.cargo = 1;
  assert.strictEqual(L.bottleneck(st), 'none');
  st.levels.speed = 15;                    // lap is now shorter than regrow time
  assert.strictEqual(L.bottleneck(st), 'regrow');
});

test('growth upgrade stops at its floor', () => {
  const st = L.freshState();
  st.levels.regrow = 200; st.coins = 1e300;
  assert.strictEqual(L.regrowOf(st), 1.5);
  assert.strictEqual(L.buy(st, 'regrow'), false);
});

test('a save survives a round trip, including land and mixed cargo', () => {
  const st = stateAt(4, { speed: 3, cargo: 20 });
  st.coins = 123.5;
  L.advance(st, 17.3, null);
  const back = L.deserialize(L.serialize(st, 1700000000000));
  assert.strictEqual(back.land, 4);
  assert.strictEqual(back.levels.speed, 3);
  assert.strictEqual(back.nodes.length, L.LANDS[4].nodes);
  near(back.coins, st.coins, 1e-9);
  near(back.pos, st.pos, 1e-9);
  for (const k of L.RES_KEYS) near(back.cargo[k], st.cargo[k], 1e-9);
  assert.strictEqual(back.lastSeen, 1700000000000);
});

test('a version 0.1 save still loads', () => {
  const old = JSON.stringify({
    v: 1, coins: 340, totalEarned: 900, laps: 31, pos: 612.5, cargo: 7, taps: 12,
    levels: { speed: 3, cargo: 4, power: 2, regrow: 1 },
    trees: [1, 0.4, 0, 1, 1, 1, 0.9, 1, 1, 1, 1, 0.2], lastSeen: 1700000000000,
  });
  const st = L.deserialize(old);
  assert.strictEqual(st.land, 0);
  assert.strictEqual(st.coins, 340);
  assert.deepStrictEqual(st.cargo, { wood: 7, hardwood: 0, stone: 0, iron: 0, gold: 0, crystal: 0 });
  assert.deepStrictEqual(st.levels, { speed: 3, cargo: 4, power: 2, regrow: 1 });
  assert.strictEqual(st.nodes.length, 12);
  assert.strictEqual(st.nodes[1], 0.4);
  near(st.pos, 612.5, 1e-9);
  L.advance(st, 60, null);                 // and it keeps playing
  assert(st.coins > 340);
});

test('bad saves fall back safely', () => {
  assert.deepStrictEqual(L.deserialize('not json').levels, L.freshState().levels);
  const bad = L.deserialize(JSON.stringify({ v: 2, coins: -5, land: 99, cargo: { wood: 9999, stone: 5 }, levels: { speed: 'x' }, nodes: [2, -1] }));
  assert.strictEqual(bad.coins, 0);
  assert.strictEqual(bad.land, L.LANDS.length - 1);
  assert.strictEqual(bad.cargo.wood, 10);
  assert.strictEqual(bad.cargo.stone, 0);
  assert.strictEqual(bad.levels.speed, 0);
  assert.strictEqual(bad.nodes.length, L.LANDS[bad.land].nodes);
  assert.strictEqual(bad.nodes[0], 1);
  assert.strictEqual(bad.nodes[1], 0);
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

// A rough pacing check: a player who always goes for whatever raises income
// most per coin (upgrades or new land) and saves up when that is out of reach.
(function pacing() {
  const st = L.freshState();
  const clone = () => JSON.parse(JSON.stringify(st));
  const out = [];
  let t = 0;
  while (t < 8 * 3600 && L.nextLand(st)) {
    L.advance(st, 1, null); t += 1;
    for (let guard = 0; guard < 5; guard++) {
      const base = L.incomePerMin(st);
      let best = null, bestV = -1;
      for (const k of L.KEYS) {
        if (L.isMaxed(st, k)) continue;
        const c = clone(); c.levels[k] += 1;
        const v = (L.incomePerMin(c) - base + 1e-6) / L.costOf(st, k);
        if (v > bestV) { bestV = v; best = k; }
      }
      const next = L.nextLand(st);
      if (next) {
        const c = clone(); c.land += 1; c.levels.cargo += 3;   // new land is judged with a wagon sized for it
        const v = (L.incomePerMin(c) - base) / next.cost;
        if (v > bestV) { bestV = v; best = 'land'; }
      }
      if (best === 'land') {
        if (!L.expand(st)) break;
        const ups = L.KEYS.reduce((s, k) => s + st.levels[k], 0);
        out.push(`${L.LANDS[st.land].name} at ${(t / 60).toFixed(0)} min (${ups} upgrades, ${L.fmt(L.incomePerMin(st))}/min)`);
      } else if (!best || !L.buy(st, best)) break;
    }
  }
  console.log('pacing with ideal play:\n      ' + out.join('\n      '));
})();

console.log(`\n${passed} tests passed`);
