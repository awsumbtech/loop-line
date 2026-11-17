import { formatNumber } from '../../core/math.js';
import { BlockPainters } from '../BlockPainters.js';
import { COLORS, FONT } from '../styles.js';

// Small moments on the map: chips when blocks are hit, a burst and coin number
// when they break (bigger for tougher blocks), sparkles where the ground grows,
// and engine smoke. Everything is kept in tile coordinates so it stays put as
// the camera moves.
export class EffectsLayer {
  constructor(painters = new BlockPainters()) {
    this.id = 'effects';
    this.order = 40;
    this.painters = painters;
    this.chips = [];
    this.sparks = [];
    this.floats = [];
    this.puffs = [];
    this.puffClock = 0;
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    this.unsubscribers = [
      bus.on('block:hit', e => this.burst(renderer, e.tile, 2, 1)),
      bus.on('block:broken', e => {
        const toughness = Math.log2(1 + e.tile.maxHp);
        this.burst(renderer, e.tile, Math.round(5 + toughness * 2), 1 + toughness * 0.12);
        this.addFloat(e.tile.x + 0.5, e.tile.y + 0.5, '+' + formatNumber(e.value), COLORS.coinText, 1);
      }),
      bus.on('ground:grew', e => e.tiles.forEach(t => this.sparkle(renderer, t))),
      bus.on('island:started', () => { this.chips = []; this.sparks = []; this.floats = []; }),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  addFloat(x, y, text, color, life, big = false) {
    this.floats.push({ x, y, text, color, age: 0, life, big });
    if (this.floats.length > 40) this.floats.shift();
  }

  burst(renderer, tile, count, speed) {
    if (renderer.reduceMotion || !tile.block) return;
    const color = this.painters.styleFor(tile.block.id).chip;
    for (let k = 0; k < count; k++) {
      const a = Math.random() * Math.PI * 2, v = (1 + Math.random() * 2) * speed;
      this.chips.push({ x: tile.x + 0.5, y: tile.y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, age: 0, life: 0.5 + Math.random() * 0.2, color });
    }
    if (this.chips.length > 160) this.chips.splice(0, this.chips.length - 160);
  }

  sparkle(renderer, tile) {
    if (renderer.reduceMotion) return;
    for (let k = 0; k < 4; k++) {
      this.sparks.push({ x: tile.x + 0.2 + Math.random() * 0.6, y: tile.y + 0.2 + Math.random() * 0.6, age: -k * 0.08, life: 0.6 });
    }
    if (this.sparks.length > 120) this.sparks.splice(0, this.sparks.length - 120);
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
      ctx.beginPath(); ctx.arc(cam.sx(p.x + p.drift * k), cam.sy(p.y - 0.5 * k), T * (0.1 + 0.2 * k), 0, 7); ctx.fill();
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      if (s.age >= s.life) { this.sparks.splice(i, 1); continue; }
      if (s.age < 0) continue;
      const k = s.age / s.life, r = T * 0.14 * Math.sin(k * Math.PI);
      const x = cam.sx(s.x), y = cam.sy(s.y - 0.3 * k);
      ctx.fillStyle = 'rgba(255, 246, 200, ' + (0.9 * (1 - k)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.3, y - r * 0.3); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.3, y + r * 0.3);
      ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.3, y + r * 0.3); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.3, y - r * 0.3);
      ctx.closePath(); ctx.fill();
    }
    for (let i = this.chips.length - 1; i >= 0; i--) {
      const p = this.chips[i];
      p.age += dt;
      if (p.age >= p.life) { this.chips.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 7 * dt;
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(cam.sx(p.x) - T * 0.045, cam.sy(p.y) - T * 0.045, T * 0.09, T * 0.09);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.age += dt;
      if (f.age >= f.life) { this.floats.splice(i, 1); continue; }
      const px = Math.min(30, Math.max(12, Math.round(T * (f.big ? 0.7 : 0.5))));
      ctx.font = '700 ' + px + 'px ' + FONT;
      ctx.lineWidth = px / 5;
      const k = f.age / f.life;
      const x = cam.sx(f.x), y = Math.max(px, cam.sy(f.y - (renderer.reduceMotion ? 0.3 : 0.3 + 0.8 * k)));
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.strokeStyle = COLORS.textOutline; ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  }
}
