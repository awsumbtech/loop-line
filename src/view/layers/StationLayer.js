import { roundRect } from '../shapes.js';
import { COLORS } from '../styles.js';

// The little station in the middle of the island.
export class StationLayer {
  constructor() {
    this.id = 'station';
    this.order = 15;
  }

  draw(ctx, renderer) {
    const { x, y } = renderer.game.island.center;
    const p = renderer.camera.tileCenter(x, y), s = renderer.camera.size;
    ctx.fillStyle = COLORS.shadow; roundRect(ctx, p.x - s * 0.27, p.y - s * 0.19, s * 0.64, s * 0.52, s * 0.08); ctx.fill();
    ctx.fillStyle = COLORS.station; roundRect(ctx, p.x - s * 0.32, p.y - s * 0.26, s * 0.64, s * 0.52, s * 0.08); ctx.fill();
    ctx.fillStyle = COLORS.stationRoof; roundRect(ctx, p.x - s * 0.26, p.y - s * 0.2, s * 0.52, s * 0.4, s * 0.05); ctx.fill();
    ctx.strokeStyle = COLORS.trim; ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.beginPath(); ctx.moveTo(p.x - s * 0.26, p.y); ctx.lineTo(p.x + s * 0.26, p.y); ctx.stroke();
  }
}
