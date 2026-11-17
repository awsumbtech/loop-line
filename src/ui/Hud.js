import { formatNumber } from '../core/math.js';
import { levelColor } from '../view/styles.js';

// The panels around the island: coins, progress, tips, the cart row and the
// buttons. It reads the game and calls back for actions; it never changes
// the game itself.
export class Hud {
  constructor(root, game, actions) {
    this.game = game;
    this.actions = actions;   // { buy, merge, sail, reset }
    this.shown = new Map();
    this.newSlot = -1;
    const $ = id => root.getElementById(id);
    this.el = {
      coins: $('coins'), coinsWrap: $('coinsWrap'), islandName: $('islandName'),
      clearText: $('clearText'), clearFill: $('clearFill'), tip: $('tip'),
      steam: $('steam'), hint: $('hint'), toast: $('toast'), slots: $('slots'),
      buy: $('buy'), buyStat: $('buyStat'), buyCost: $('buyCost'),
      merge: $('merge'), mergeStat: $('mergeStat'),
      sail: $('sail'), sailName: $('sailName'), sailStat: $('sailStat'), reset: $('reset'),
    };
    this.bindButtons();
    game.bus.on('block:broken', () => this.bumpCoins());
  }

  bindButtons() {
    const { el } = this;
    el.buy.addEventListener('click', () => {
      const level = this.actions.buy();
      if (level) this.newSlot = this.game.train.levels.lastIndexOf(level);
    });
    el.merge.addEventListener('click', () => {
      const level = this.actions.merge();
      if (level) this.newSlot = this.game.train.levels.indexOf(level);
    });
    el.sail.addEventListener('click', () => {
      if (this.actions.sail()) this.toast('Welcome to <b>Island ' + this.game.island.number + '</b>. A fresh start on richer ground.', 4000);
    });
    let resetTimer = 0;
    el.reset.addEventListener('click', () => {
      if (!el.reset.classList.contains('armed')) {
        el.reset.classList.add('armed');
        el.reset.textContent = 'Tap again to erase all progress';
        resetTimer = setTimeout(() => this.disarmReset(), 3000);
        return;
      }
      clearTimeout(resetTimer);
      this.disarmReset();
      this.actions.reset();
    });
  }

  disarmReset() {
    this.el.reset.classList.remove('armed');
    this.el.reset.textContent = 'Reset game';
  }

  setText(node, text) { if (this.shown.get(node) !== text) { this.shown.set(node, text); node.textContent = text; } }
  setHTML(node, html) { if (this.shown.get(node) !== html) { this.shown.set(node, html); node.innerHTML = html; } }
  setAttr(node, name, value) { if (node.getAttribute(name) !== value) node.setAttribute(name, value); }
  show(node, visible) { if (node.hidden === visible) node.hidden = !visible; }

  bumpCoins() {
    const w = this.el.coinsWrap;
    w.classList.remove('bump');
    void w.offsetWidth;
    w.classList.add('bump');
  }

  toast(html, ms = 4000) {
    const t = this.el.toast;
    t.innerHTML = html;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  update() {
    const { game, el } = this;
    const { train, track, island, shop, wallet } = game;
    this.setText(el.coins, formatNumber(wallet.coins));
    this.setText(el.islandName, 'Island ' + island.number);

    const done = game.canSail();
    const pct = done ? 100 : Math.min(99, Math.floor(island.clearedShare() * 100));
    this.setText(el.clearText, pct + '%');
    if (this.shown.get(el.clearFill) !== pct) { this.shown.set(el.clearFill, pct); el.clearFill.style.width = pct + '%'; }

    this.renderSlots();
    const cap = train.capacity(track), full = train.carts.length >= cap;
    const canBuy = game.canBuyCart();
    this.setHTML(el.buyStat, full ? 'Train is full (' + cap + ' carts)' : 'Adds a level <b>' + shop.levelFor(train) + '</b> cart');
    this.setText(el.buyCost, formatNumber(shop.price()));
    this.setAttr(el.buy, 'aria-disabled', String(!canBuy));
    el.buy.classList.toggle('ready', canBuy);

    const pair = train.mergeLevel();
    this.setHTML(el.mergeStat, pair ? 'Two level <b>' + pair + '</b> → one level <b>' + (pair + 1) + '</b>' : 'Needs two carts of the same level');
    this.setAttr(el.merge, 'aria-disabled', String(!pair));
    el.merge.classList.toggle('ready', !!pair && full);

    this.show(el.sail, done);
    if (done) {
      this.setText(el.sailName, 'Sail to Island ' + (island.number + 1));
      this.setText(el.sailStat, 'Start fresh on an island with richer blocks');
    }

    let tip;
    if (done) tip = 'Island cleared. Sail on to the next one.';
    else if (full && pair) tip = 'The train is full. Merge two matching carts to make room.';
    else if (canBuy) tip = 'Another cart means more mining every lap.';
    else tip = 'Each block you clear lets the track grow a little.';
    this.setText(el.tip, tip);

    if (train.steam > 0.02) { this.show(el.steam, true); this.setText(el.steam, 'Speed ×' + (1 + train.steam).toFixed(2)); }
    else this.show(el.steam, false);
    this.show(el.hint, game.stats.taps < 5);
  }

  renderSlots() {
    const { train, track } = this.game;
    const cap = train.capacity(track), pair = train.mergeLevel(), levels = train.levels;
    const key = levels.join(',') + '|' + cap + '|' + pair + '|' + this.newSlot;
    if (this.shown.get(this.el.slots) === key) return;
    this.shown.set(this.el.slots, key);
    let html = '';
    for (let i = 0; i < cap; i++) {
      const level = levels[i];
      if (!level) { html += '<div class="slot empty" aria-hidden="true"></div>'; continue; }
      const cls = 'slot' + (level === pair ? ' pair' : '') + (i === this.newSlot ? ' new' : '');
      html += '<div class="' + cls + '" style="background:' + levelColor(level) + '" aria-label="Level ' + level + ' cart">' + level + '</div>';
    }
    this.el.slots.innerHTML = html;
  }
}
