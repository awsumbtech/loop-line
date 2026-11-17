import { Camera } from './Camera.js';

// Draws the game as a stack of layers, lowest order first. A layer is an
// object with an id, an order and draw(ctx, renderer, dt); it may also have
// attach(renderer), detach(renderer) and resize(renderer). Add, remove or
// replace layers freely.
export class Renderer {
  constructor(canvas, game, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.camera = new Camera();
    this.layers = [];
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.clock = 0;
    this.reduceMotion = !!options.reduceMotion;
  }

  addLayer(layer) {
    this.layers.push(layer);
    this.layers.sort((a, b) => a.order - b.order);
    if (layer.attach) layer.attach(this);
    if (this.width && layer.resize) layer.resize(this);
    return layer;
  }

  removeLayer(id) {
    const i = this.layers.findIndex(l => l.id === id);
    if (i < 0) return null;
    const [layer] = this.layers.splice(i, 1);
    if (layer.detach) layer.detach(this);
    return layer;
  }

  getLayer(id) {
    return this.layers.find(l => l.id === id) || null;
  }

  resize(width, height, dpr) {
    if (width < 10 || height < 10) return;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const { width: cols, height: rows } = this.game.island;
    this.camera.fit(width, height, cols, rows);
    for (const layer of this.layers) if (layer.resize) layer.resize(this);
  }

  render(dt) {
    if (!this.width) return;
    this.clock += dt;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const layer of this.layers) layer.draw(this.ctx, this, dt);
  }

  // An offscreen canvas the size of the view, for layers that cache drawings.
  makeBuffer() {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvas.width;
    canvas.height = this.canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.scale(this.dpr, this.dpr);
    return { canvas, ctx };
  }
}
