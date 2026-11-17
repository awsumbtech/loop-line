import { roundedLoop } from '../shapes.js';
import { COLORS } from '../styles.js';

// The rails. Redrawn only when the track changes, with a short fade from the
// old shape to the new one so growth looks smooth.
export class TrackLayer {
  constructor({ fadeSeconds = 0.35 } = {}) {
    this.id = 'track';
    this.order = 10;
    this.fadeSeconds = fadeSeconds;
    this.current = null;
    this.previous = null;
    this.fade = 1;
    this.unsubscribe = null;
  }

  attach(renderer) {
    this.unsubscribe = renderer.game.bus.on('track:changed', () => {
      this.previous = this.current;
      this.current = this.paint(renderer);
      this.fade = renderer.reduceMotion || !this.previous ? 1 : 0;
    });
  }

  detach() {
    if (this.unsubscribe) this.unsubscribe();
  }

  resize(renderer) {
    this.current = this.paint(renderer);
    this.previous = null;
    this.fade = 1;
  }

  paint(renderer) {
    if (!renderer.width) return null;
    const cam = renderer.camera, T = cam.size;
    const pts = renderer.game.track.points.map(p => cam.point(p));
    const radius = T * 0.22;
    const bed = renderer.makeBuffer(), c = bed.ctx;
    c.lineJoin = 'round';
    const stroke = (color, width, dash) => {
      roundedLoop(c, pts, radius);
      c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []); c.stroke();
    };
    stroke('rgba(20, 30, 18, 0.25)', T * 0.66);
    stroke(COLORS.ballast, T * 0.56);
    stroke(COLORS.sleeper, T * 0.44, [T * 0.09, T * 0.17]);
    c.setLineDash([]);
    // Two rails: a wide dark band with its middle cut away.
    const rails = renderer.makeBuffer(), r = rails.ctx;
    r.lineJoin = 'round';
    roundedLoop(r, pts, radius); r.strokeStyle = COLORS.rail; r.lineWidth = T * 0.34; r.stroke();
    r.globalCompositeOperation = 'destination-out';
    roundedLoop(r, pts, radius); r.lineWidth = Math.max(T * 0.34 - 2 * Math.max(1, T * 0.05), 1); r.stroke();
    c.drawImage(rails.canvas, 0, 0, renderer.width, renderer.height);
    return bed;
  }

  draw(ctx, renderer, dt) {
    if (!this.current) this.current = this.paint(renderer);
    if (this.fade < 1 && this.previous) {
      this.fade = Math.min(1, this.fade + dt / this.fadeSeconds);
      ctx.globalAlpha = 1 - this.fade;
      ctx.drawImage(this.previous.canvas, 0, 0, renderer.width, renderer.height);
      ctx.globalAlpha = this.fade;
    }
    ctx.drawImage(this.current.canvas, 0, 0, renderer.width, renderer.height);
    ctx.globalAlpha = 1;
  }
}
