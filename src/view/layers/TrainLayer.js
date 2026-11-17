import { roundRect } from '../shapes.js';
import { COLORS, FONT, levelColor } from '../styles.js';

// The engine and carts. Each car glides to its spot, so when the track
// changes shape under the train it slides over instead of jumping. A car
// that was just bought or merged glows for a moment.
export class TrainLayer {
  constructor() {
    this.id = 'train';
    this.order = 30;
    this.shown = [];        // last drawn position of each car, in tile coordinates
    this.engine = null;     // where the engine was drawn, in tile coordinates
    this.glow = { level: 0, until: 0 };
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    const shine = e => { this.glow = { level: e.level, until: renderer.clock + 1.2 }; };
    this.unsubscribers = [bus.on('cart:merged', shine), bus.on('cart:bought', shine), bus.on('island:started', () => { this.shown = []; })];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  // A car sits between two points a little ahead and behind, so it turns smoothly at corners.
  spot(track, s) {
    const a = track.pointAt(s + 0.38), b = track.pointAt(s - 0.38);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, ang: Math.atan2(a.y - b.y, a.x - b.x) };
  }

  settle(i, target, renderer, dt) {
    const prev = this.shown[i];
    if (!prev || renderer.reduceMotion || Math.hypot(prev.x - target.x, prev.y - target.y) > 1.5) {
      this.shown[i] = target;
      return target;
    }
    const k = 1 - Math.exp(-dt * 18);
    let dAng = target.ang - prev.ang;
    dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng));
    const next = { x: prev.x + (target.x - prev.x) * k, y: prev.y + (target.y - prev.y) * k, ang: prev.ang + dAng * k };
    this.shown[i] = next;
    return next;
  }

  draw(ctx, renderer, dt) {
    const { train, track } = renderer.game;
    const cam = renderer.camera, T = cam.size, len = T * 0.78, wide = T * 0.5;
    this.shown.length = train.carts.length + 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.max(9, Math.round(T * 0.4)) + 'px ' + FONT;
    const glowing = renderer.clock < this.glow.until;
    let glowDone = false;
    for (let i = train.carts.length - 1; i >= 0; i--) {
      const at = this.settle(i + 1, this.spot(track, train.pos - train.offsetOf(i)), renderer, dt);
      const x = cam.sx(at.x), y = cam.sy(at.y);
      const level = train.carts[i].level;
      if (glowing && !glowDone && level === this.glow.level) {
        glowDone = true;
        const left = (this.glow.until - renderer.clock) / 1.2;
        ctx.fillStyle = 'rgba(255, 236, 160, ' + (0.55 * left).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, T * (0.55 + 0.35 * (1 - left)), 0, 7); ctx.fill();
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(at.ang);
      ctx.fillStyle = COLORS.shadow; roundRect(ctx, -len / 2 + T * 0.04, -wide / 2 + T * 0.07, len, wide, T * 0.1); ctx.fill();
      ctx.fillStyle = COLORS.iron; roundRect(ctx, -len / 2, -wide / 2, len, wide, T * 0.1); ctx.fill();
      ctx.fillStyle = levelColor(level); roundRect(ctx, -len / 2 + T * 0.04, -wide / 2 + T * 0.04, len - T * 0.08, wide - T * 0.1, T * 0.08); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'; roundRect(ctx, -len / 2 + T * 0.08, -wide / 2 + T * 0.06, len - T * 0.16, wide * 0.25, T * 0.05); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#1c2721'; ctx.fillText(String(level), x, y + T * 0.01);
    }
    const e = this.settle(0, this.spot(track, train.pos), renderer, dt);
    ctx.save(); ctx.translate(cam.sx(e.x), cam.sy(e.y)); ctx.rotate(e.ang);
    ctx.fillStyle = COLORS.shadow; roundRect(ctx, -len / 2 + T * 0.04, -wide / 2 + T * 0.07, len, wide, T * 0.13); ctx.fill();
    ctx.fillStyle = COLORS.engineDark; roundRect(ctx, -len / 2, -wide / 2, len, wide, T * 0.13); ctx.fill();
    ctx.fillStyle = COLORS.engine; roundRect(ctx, -len / 2, -wide / 2, len, wide - T * 0.05, T * 0.13); ctx.fill();
    ctx.fillStyle = COLORS.iron; roundRect(ctx, -len / 2 + T * 0.06, -wide / 2 + T * 0.07, T * 0.24, wide - T * 0.17, T * 0.05); ctx.fill();
    ctx.fillStyle = COLORS.trim; ctx.fillRect(-T * 0.02, -wide / 2 + T * 0.02, T * 0.05, wide - T * 0.07);
    ctx.fillStyle = COLORS.iron; ctx.beginPath(); ctx.arc(T * 0.18, -T * 0.02, T * 0.1, 0, 7); ctx.fill();
    ctx.fillRect(len / 2 - T * 0.05, -wide / 2 - T * 0.06, T * 0.07, wide + T * 0.1);
    ctx.restore();
    this.engine = e;
  }
}
