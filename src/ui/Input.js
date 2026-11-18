// Holding a finger (or the mouse button) on the island speeds the train up;
// letting go eases it back to normal speed.
export class Input {
  constructor(element, game) {
    this.element = element;
    this.game = game;
    this.pointers = new Set();   // fingers currently down, so two-finger holds work too
    this.handlers = {
      pointerdown: e => {
        e.preventDefault();
        this.pointers.add(e.pointerId);
        try { element.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
        this.apply();
      },
      pointerup: e => this.release(e),
      pointercancel: e => this.release(e),
      lostpointercapture: e => this.release(e),
      contextmenu: e => e.preventDefault(),   // a long press should not open a menu
    };
    for (const [type, fn] of Object.entries(this.handlers)) element.addEventListener(type, fn);
    this.onHidden = () => { if (document.hidden) { this.pointers.clear(); this.apply(); } };
    document.addEventListener('visibilitychange', this.onHidden);
  }

  release(e) {
    this.pointers.delete(e.pointerId);
    this.apply();
  }

  get holding() {
    return this.pointers.size > 0;
  }

  // Also called each frame, so a hold carries over to a new island's train.
  apply() {
    if (this.game.train.boosting !== this.holding) this.game.setBoosting(this.holding);
  }

  dispose() {
    for (const [type, fn] of Object.entries(this.handlers)) this.element.removeEventListener(type, fn);
    document.removeEventListener('visibilitychange', this.onHidden);
  }
}
