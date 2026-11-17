// Moves the train along the track each tick.
export class TrainSystem {
  constructor() {
    this.id = 'train';
  }

  update(dt, game) {
    game.train.move(dt, game.track);
  }
}
