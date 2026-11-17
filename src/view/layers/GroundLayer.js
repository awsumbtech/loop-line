import { seededRandom } from '../../core/math.js';
import { roundRect } from '../shapes.js';
import { COLORS } from '../styles.js';

// Sea, sand and grass. Painted once per island onto a picture of the whole
// island at a fixed resolution, then drawn wherever the camera points.
export class GroundLayer {
  constructor({ pixelsPerTile = 64, seaMargin = 4 } = {}) {
    this.id = 'ground';
    this.order = 0;
    this.pixelsPerTile = pixelsPerTile;
    this.seaMargin = seaMargin;   // tiles of sea painted around the island
    this.picture = null;
    this.unsubscribe = null;
  }

  attach(renderer) {
    this.unsubscribe = renderer.game.bus.on('island:started', () => { this.picture = null; });
  }

  detach() {
    if (this.unsubscribe) this.unsubscribe();
  }

  paint(renderer) {
    const island = renderer.game.island;
    const P = this.pixelsPerTile, M = this.seaMargin;
    const canvas = document.createElement('canvas');
    canvas.width = (island.width + 2 * M) * P;
    canvas.height = (island.height + 2 * M) * P;
    const c = canvas.getContext('2d');
    const random = seededRandom(island.number * 31 + 7);
    const X = x => (x + M) * P, Y = y => (y + M) * P;
    const land = (x, y) => { const t = island.tileAt(x, y); return t && !t.isWater; };
    const eachLand = fn => {
      for (let y = 0; y < island.height; y++) for (let x = 0; x < island.width; x++) if (land(x, y)) fn(x, y);
    };

    c.fillStyle = COLORS.sea;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = COLORS.wave; c.lineWidth = P * 0.05; c.lineCap = 'round';
    const waves = Math.round((island.width + 2 * M) * (island.height + 2 * M) / 3);
    for (let i = 0; i < waves; i++) {
      const x = random() * canvas.width, y = random() * canvas.height, len = P * (0.4 + random() * 0.5);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y - P * 0.12, x + len, y); c.stroke();
    }
    c.fillStyle = COLORS.shallows;
    eachLand((x, y) => { roundRect(c, X(x - 0.38), Y(y - 0.38), P * 1.76, P * 1.76, P * 0.7); c.fill(); });
    c.fillStyle = COLORS.sand;
    eachLand((x, y) => { roundRect(c, X(x - 0.16), Y(y - 0.16), P * 1.32, P * 1.32, P * 0.45); c.fill(); });
    eachLand((x, y) => {
      c.fillStyle = (x + y) % 2 ? COLORS.grass : COLORS.grassAlt;
      c.fillRect(X(x) - 0.5, Y(y) - 0.5, P + 1, P + 1);
    });
    c.fillStyle = COLORS.tuft;
    eachLand((x, y) => {
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.ellipse(X(x + 0.12 + random() * 0.76), Y(y + 0.12 + random() * 0.76), P * 0.05, P * 0.03, 0, 0, 7); c.fill();
      }
    });
    this.picture = canvas;
  }

  draw(ctx, renderer) {
    if (!this.picture) this.paint(renderer);
    const cam = renderer.camera, M = this.seaMargin;
    ctx.fillStyle = COLORS.sea;
    ctx.fillRect(0, 0, renderer.width, renderer.height);
    const island = renderer.game.island;
    ctx.drawImage(this.picture, cam.sx(-M), cam.sy(-M), (island.width + 2 * M) * cam.size, (island.height + 2 * M) * cam.size);
  }
}
