import { seededRandom } from '../../core/math.js';
import { roundRect } from '../shapes.js';
import { COLORS } from '../styles.js';

// Sea, sand and grass. Painted once per island and size, then copied each frame.
export class GroundLayer {
  constructor() {
    this.id = 'ground';
    this.order = 0;
    this.buffer = null;
    this.unsubscribe = null;
  }

  attach(renderer) {
    this.unsubscribe = renderer.game.bus.on('island:started', () => this.paint(renderer));
  }

  detach() {
    if (this.unsubscribe) this.unsubscribe();
  }

  resize(renderer) {
    this.paint(renderer);
  }

  paint(renderer) {
    if (!renderer.width) return;
    this.buffer = renderer.makeBuffer();
    const c = this.buffer.ctx, cam = renderer.camera, T = cam.size;
    const island = renderer.game.island;
    const random = seededRandom(island.number * 31 + 7);
    const land = (x, y) => { const t = island.tileAt(x, y); return t && !t.isWater; };

    c.fillStyle = COLORS.sea;
    c.fillRect(0, 0, renderer.width, renderer.height);
    c.strokeStyle = COLORS.wave; c.lineWidth = Math.max(1, T * 0.06); c.lineCap = 'round';
    for (let i = 0; i < Math.round(renderer.width * renderer.height / 2200); i++) {
      const x = random() * renderer.width, y = random() * renderer.height, len = T * (0.4 + random() * 0.5);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y - T * 0.12, x + len, y); c.stroke();
    }
    const eachLand = fn => {
      for (let y = 0; y < island.height; y++) for (let x = 0; x < island.width; x++) if (land(x, y)) fn(x, y);
    };
    c.fillStyle = COLORS.shallows;
    eachLand((x, y) => { roundRect(c, cam.sx(x - 0.38), cam.sy(y - 0.38), T * 1.76, T * 1.76, T * 0.7); c.fill(); });
    c.fillStyle = COLORS.sand;
    eachLand((x, y) => { roundRect(c, cam.sx(x - 0.16), cam.sy(y - 0.16), T * 1.32, T * 1.32, T * 0.45); c.fill(); });
    eachLand((x, y) => {
      c.fillStyle = (x + y) % 2 ? COLORS.grass : COLORS.grassAlt;
      c.fillRect(cam.sx(x) - 0.5, cam.sy(y) - 0.5, T + 1, T + 1);
    });
    c.fillStyle = COLORS.tuft;
    eachLand((x, y) => {
      for (let k = 0; k < 2; k++) {
        c.beginPath(); c.ellipse(cam.sx(x + 0.15 + random() * 0.7), cam.sy(y + 0.15 + random() * 0.7), T * 0.05, T * 0.03, 0, 0, 7); c.fill();
      }
    });
  }

  draw(ctx, renderer) {
    if (!this.buffer) this.paint(renderer);
    ctx.drawImage(this.buffer.canvas, 0, 0, renderer.width, renderer.height);
  }
}
