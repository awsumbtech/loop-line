// Starts the game in the browser: builds the game, the screen layers and the
// panels, then runs the loop. Swap any piece here without touching the rest.
import { CONFIG } from './config.js';
import { formatNumber } from './core/math.js';
import { Game } from './Game.js';
import { SaveManager } from './save/SaveManager.js';
import { BrowserStorage } from './save/storage.js';
import { Hud } from './ui/Hud.js';
import { Input } from './ui/Input.js';
import { registerServiceWorker } from './ui/pwa.js';
import { BlockPainters } from './view/BlockPainters.js';
import { Renderer } from './view/Renderer.js';
import { BlockLayer } from './view/layers/BlockLayer.js';
import { EffectsLayer } from './view/layers/EffectsLayer.js';
import { GroundLayer } from './view/layers/GroundLayer.js';
import { StationLayer } from './view/layers/StationLayer.js';
import { TrackLayer } from './view/layers/TrackLayer.js';
import { TrainLayer } from './view/layers/TrainLayer.js';

const game = new Game({ config: CONFIG });
const saves = new SaveManager(new BrowserStorage(), CONFIG.save);
const savedAt = saves.load(game);

const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const map = document.getElementById('map');
const renderer = new Renderer(document.getElementById('c'), game, { reduceMotion });
const painters = new BlockPainters();
[new GroundLayer(), new TrackLayer(), new StationLayer(), new BlockLayer(painters), new TrainLayer(), new EffectsLayer(painters)]
  .forEach(layer => renderer.addLayer(layer));

const save = () => saves.save(game);
const hud = new Hud(document, game, {
  buy: () => { const l = game.buyCart(); save(); return l; },
  merge: () => { const l = game.merge(); save(); return l; },
  sail: () => { const ok = game.sail(); save(); return ok; },
  reset: () => { game.reset(); save(); },
});
new Input(map, game);

function fitToScreen() {
  const box = map.getBoundingClientRect();
  renderer.resize(box.width, box.height, Math.min(3, window.devicePixelRatio || 1));
}
if (window.ResizeObserver) new ResizeObserver(fitToScreen).observe(map);
else window.addEventListener('resize', fitToScreen);
fitToScreen();

function awayText(sec) {
  if (sec < 3600) return Math.max(1, Math.round(sec / 60)) + ' min';
  const h = sec / 3600;
  return (h < 10 ? h.toFixed(1) : Math.round(h)) + ' h';
}
function catchUp(seconds) {
  const earned = game.catchUp(seconds);
  if (seconds >= 60 && earned >= 1) {
    const cap = CONFIG.offline.capSeconds;
    const note = seconds > cap ? ' The train keeps working for up to ' + awayText(cap) + ' while you are away.' : '';
    hud.toast('Away for ' + awayText(seconds) + '. The train earned <b>' + formatNumber(earned) + ' coins</b>.' + note, 5000);
  }
}
if (savedAt > 0) catchUp((Date.now() - savedAt) / 1000);

let last = Date.now(), lastSave = Date.now();
function frame() {
  const now = Date.now();
  const dt = (now - last) / 1000;
  last = now;
  if (dt > 1) catchUp(dt);            // the page was asleep
  else if (dt > 0) game.advance(dt);
  renderer.render(Math.min(Math.max(dt, 0), 0.1));
  hud.update();
  if (now - lastSave > 5000) { lastSave = now; save(); }
  requestAnimationFrame(frame);
}
hud.update();
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
registerServiceWorker();
