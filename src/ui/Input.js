// Tapping the island speeds the train up for a moment.
export class Input {
  constructor(element, game) {
    this.handler = e => { e.preventDefault(); game.boost(); };
    this.element = element;
    element.addEventListener('pointerdown', this.handler);
  }

  dispose() {
    this.element.removeEventListener('pointerdown', this.handler);
  }
}
