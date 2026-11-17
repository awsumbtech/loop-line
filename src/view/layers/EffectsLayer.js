import { formatNumber } from '../../core/math.js';
import { BlockPainters } from '../BlockPainters.js';
import { COLORS, FONT } from '../styles.js';

// Chips when blocks are hit, coin numbers when they break, and engine smoke.
export class EffectsLayer {
  constructor(painters = new BlockPainters()) {
    this.id = 'effects';
    this.order = 40;
    this.painters = painters;
    this.chips = [];
    this.floats = [];
    this.puffs = [];
    this.puffClock = 0;
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    this.unsubscribers = [
      bus.on('block:hit', e => this.burst(renderer, e.tile, 2)),
      bus.on('block:broken', e => {
        this.burst(renderer, e.tile, 6);
        this.floats.push({ x: e.tile.x, y: e.tile.y, text: '+' + formatNumber(e.value), age: 0, life: 1 });
        if (this.floats.length > 40) this.floats.shift();
      }),
      bus.on('island:started', () => { this.chips = []; this.floats = []; }),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  burst(renderer, tile, count) {
    if (renderer.reduceMotion || !tile.block) return;
    const color = this.painters.styleFor(tile.block.id).chip;
    for (let k = 0; k < count; k++) {
      this.chips.push({ x: tile.x + 0.5, y: tile.y + 0.5, vx: (Math.random() - 0.5) * 4, vy: -(1 + Math.random() * 2), age: 0, life: 0.5, color });
    }
    if (this.chips.length > 120) this.chips.splice(0, this.chips.length - 120);
  }

  draw(ctx, renderer, dt) {
    const cam = renderer.camera, T = cam.size;
    const trainLayer = renderer.getLayer('train');
    const engine = trainLayer && trainLayer.engine;
    if (engine && !renderer.reduceMotion) {
      this.puffClock -= dt * (1 + renderer.game.train.steam * 1.5);
      if (this.puffClock <= 0) {
        this.puffClock = 0.25;
        this.puffs.push({ x: engine.x, y: engine.y, age: 0, life: 1, drift: (Math.random() - 0.5) * 0.3 });
      }
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      if (p.age >= p.life) { this.puffs.splice(i, 1); continue; }
      const k = p.age / p.life;
      ctx.fillStyle = 'rgba(' + COLORS.smoke + ', ' + (0.45 * (1 - k)).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x + p.drift * T * k, p.y - T * 0.5 * k, T * (0.1 + 0.2 * k), 0, 7); ctx.fill();
    }
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const p = this.chips[i];
      p.age += dt;
      if (p.age >= p.life) { this.chips.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt;
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(cam.sx(p.x) - T * 0.04, cam.sy(p.y) - T * 0.04, T * 0.08, T * 0.08);
    }
    ctx.globalAlpha = 1;
    const px = Math.max(12, Math.round(T * 0.5));
    ctx.font = '700 ' + px + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = px / 5;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.age += dt;
      if (f.age >= f.life) { this.floats.splice(i, 1); continue; }
      const k = f.age / f.life;
      const c = cam.tileCenter(f.x, f.y);
      const y = Math.max(px, c.y - (renderer.reduceMotion ? 0.3 : 0.3 + 0.7 * k) * T);
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.strokeStyle = COLORS.textOutline; ctx.strokeText(f.text, c.x, y);
      ctx.fillStyle = COLORS.coinText; ctx.fillText(f.text, c.x, y);
    }
    ctx.globalAlpha = 1;
  }
}
