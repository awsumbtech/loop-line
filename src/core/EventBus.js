// A publish/subscribe hub. Parts of the game announce what happened here
// instead of calling each other, so any part can be added or removed without
// the others knowing.
//
// Events the game sends:
//   block:hit      { tile }                    a block took damage
//   block:broken   { tile, block, value }      a block was destroyed
//   track:changed  { track }                   the track was rebuilt
//   island:started { number }                  a new island began
//   coins:changed  { coins }                   the wallet changed
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  // Returns a function that unsubscribes.
  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const set = this.handlers.get(type);
    if (set) set.delete(handler);
  }

  emit(type, payload) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of [...set]) handler(payload);
  }
}
