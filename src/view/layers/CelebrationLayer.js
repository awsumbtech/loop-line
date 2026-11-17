import { FONT } from '../styles.js';

// Big moments drawn over the whole map: confetti and a banner when an island
// is cleared, and a shorter banner when a cart reaches a new best level.
export class CelebrationLayer {
  constructor() {
    this.id = 'celebration';
    this.order = 50;
    this.confetti = [];
    this.banner = null;   // { title, line, age, life }
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    this.unsubscribers = [
      bus.on('island:cleared', e => {
        this.show('Island ' + e.number + ' cleared!', 'Sail on when you are ready', 4);
        this.throwConfetti(renderer, 140);
      }),
      bus.on('level:best', e => this.show('Level ' + e.level + ' cart!', 'Your strongest yet', 1.8)),
      bus.on('island:started', () => { this.confetti = []; this.banner = null; }),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  show(title, line, life) {
    this.banner = { title, line, age: 0, life };
  }

  throwConfetti(renderer, count) {
    if (renderer.reduceMotion) return;
    const colors = ['#e2a52e', '#7fae4e', '#3f8fc4', '#e0603f', '#f2ecd9', '#9a68d4'];
    for (let i = 0; i < count; i++) {
      this.confetti.push({
        x: Math.random(), y: -0.05 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.15, vy: 0.25 + Math.random() * 0.3,
        spin: Math.random() * 6, rot: Math.random() * 6, color: colors[i % colors.length], age: 0,
      });
    }
  }

  draw(ctx, renderer, dt) {
    const W = renderer.width, H = renderer.height;
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.age += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.spin * dt;
      if (c.y > 1.1) { this.confetti.splice(i, 1); continue; }
      ctx.save(); ctx.translate(c.x * W, c.y * H); ctx.rotate(c.rot);
      ctx.fillStyle = c.color; ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
    const b = this.banner;
    if (!b) return;
    b.age += dt;
    if (b.age >= b.life) { this.banner = null; return; }
    const fadeIn = Math.min(1, b.age / 0.25), fadeOut = Math.min(1, (b.life - b.age) / 0.4);
    const alpha = Math.min(fadeIn, fadeOut);
    const pop = renderer.reduceMotion ? 1 : 0.85 + 0.15 * Math.min(1, b.age / 0.25);
    const titlePx = Math.round(Math.min(44, W / 9) * pop), linePx = Math.round(Math.min(18, W / 22));
    const cy = H * 0.36;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(20, 28, 24, 0.78)';
    const boxW = Math.min(W - 32, titlePx * 9), boxH = titlePx + linePx + 34;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W / 2 - boxW / 2, cy - boxH / 2, boxW, boxH, 14); else ctx.rect(W / 2 - boxW / 2, cy - boxH / 2, boxW, boxH);
    ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + titlePx + 'px ' + FONT;
    ctx.fillStyle = '#ffd970';
    ctx.fillText(b.title, W / 2, cy - linePx / 2 - 2);
    ctx.font = '500 ' + linePx + 'px ' + FONT;
    ctx.fillStyle = '#f2ecd9';
    ctx.fillText(b.line, W / 2, cy + titlePx / 2 + 2);
    ctx.globalAlpha = 1;
  }
}
