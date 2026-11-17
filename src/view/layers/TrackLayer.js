import { COLORS } from '../styles.js';

// The rails, drawn as smooth lines every frame. When the track changes shape
// the old shape fades out under the new one, so growth looks smooth.
export class TrackLayer {
  constructor({ fadeSeconds = 0.4 } = {}) {
    this.id = 'track';
    this.order = 10;
    this.fadeSeconds = fadeSeconds;
    this.previous = null;   // { shape, alpha } of the track before the last change
    this.shapes = new WeakMap();
    this.lastTrack = null;
    this.unsubscribers = [];
  }

  attach(renderer) {
    const bus = renderer.game.bus;
    this.lastTrack = renderer.game.track;
    this.unsubscribers = [
      bus.on('track:changed', e => {
        if (this.lastTrack && !renderer.reduceMotion) this.previous = { track: this.lastTrack, alpha: 1 };
        this.lastTrack = e.track;
      }),
      bus.on('island:started', () => { this.previous = null; }),
    ];
  }

  detach() {
    this.unsubscribers.forEach(off => off());
  }

  // The centre line plus the two rails, worked out once per track.
  shapeOf(track) {
    let shape = this.shapes.get(track);
    if (shape) return shape;
    const pts = track.points, n = pts.length;
    const normals = pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      return { x: -dy / len, y: dx / len };
    });
    const offset = d => pts.map((p, i) => ({ x: p.x + normals[i].x * d, y: p.y + normals[i].y * d }));
    shape = { centre: pts, railA: offset(0.15), railB: offset(-0.15) };
    this.shapes.set(track, shape);
    return shape;
  }

  stroke(ctx, cam, pts, color, width, dash) {
    ctx.beginPath();
    pts.forEach((p, i) => { const x = cam.sx(p.x), y = cam.sy(p.y); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.stroke();
  }

  drawTrack(ctx, renderer, track) {
    const cam = renderer.camera, T = cam.size;
    const shape = this.shapeOf(track);
    ctx.lineJoin = 'round';
    this.stroke(ctx, cam, shape.centre, 'rgba(20, 30, 18, 0.25)', T * 0.66);
    this.stroke(ctx, cam, shape.centre, COLORS.ballast, T * 0.56);
    this.stroke(ctx, cam, shape.centre, COLORS.sleeper, T * 0.44, [T * 0.09, T * 0.17]);
    const rail = Math.max(1, T * 0.05);
    this.stroke(ctx, cam, shape.railA, COLORS.rail, rail);
    this.stroke(ctx, cam, shape.railB, COLORS.rail, rail);
    ctx.setLineDash([]);
  }

  draw(ctx, renderer, dt) {
    if (this.previous) {
      this.previous.alpha -= dt / this.fadeSeconds;
      if (this.previous.alpha <= 0) this.previous = null;
      else {
        ctx.globalAlpha = this.previous.alpha;
        this.drawTrack(ctx, renderer, this.previous.track);
        ctx.globalAlpha = 1;
      }
    }
    this.drawTrack(ctx, renderer, renderer.game.track);
  }
}
