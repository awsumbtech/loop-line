// All tuning lives here. Change numbers, add blocks or remove them without
// touching any game code.

export const CONFIG = {
  grid: {
    width: 19,               // island grid in tiles, including the sea around it
    height: 25,
    coastWaterChance: 0.25,  // share of the outer land ring that is sea, for a ragged coast
    ringJitter: 0.15,        // chance a block comes from the ring next door, so rings blend
  },
  start: {
    claimRadius: 1,          // the cleared ground at the start: a 3 x 3 square around the station
    carts: [1],              // cart levels each island starts with
    coins: 0,
  },
  train: {
    speed: 1.5,              // tiles per second
    carLength: 0.9,          // track each car takes up, in tiles
    maxCarts: 8,
  },
  steam: { max: 1, rampPerSecond: 2.5, decayPerSecond: 1.5 },   // holding the island: up to double speed, reached in 0.4 s, gone 0.7 s after letting go
  carts: { powerGrowth: 2.2 },   // a level n cart hits for powerGrowth^(n-1), rounded
  shop: { baseCost: 15, costGrowth: 1.2, levelsBelowBest: 1 },
  islands: {
    length: 1.1,             // THE knob for island length: every block's hits are multiplied by this. 1.1 is about 20-25 min
    hpGrowth: 1.15,          // each new island's blocks take this much more hitting...
    valueGrowth: 1.15,       // ...and pay this much more
  },
  track: {
    inset: 0.3,              // how far inside the cleared ground the track runs, in tiles
    cornerRadius: 0.45,      // how round the bends are, in tiles
    growBehindTrain: true,   // cleared tiles join only once the train has moved away from them
    growClearance: 1.8,      // how far (in tiles) every car must be before a tile joins
  },
  offline: { capSeconds: 3600 },
  save: { key: 'loopline.v5', version: 5, retiredKeys: ['loopline.save.v1', 'loopline.island.v1', 'loopline.v4'] },
};

// Blocks, softest to hardest. hp is hits from a level 1 cart; value is coins.
// Add a row here, then use its id in RINGS below.
export const BLOCK_TYPES = [
  { id: 'bush',     name: 'Bush',      hp: 1,   value: 1 },
  { id: 'tree',     name: 'Tree',      hp: 3,   value: 2 },
  { id: 'bigTree',  name: 'Big tree',  hp: 8,   value: 5 },
  { id: 'rock',     name: 'Rock',      hp: 30,  value: 15 },
  { id: 'boulder',  name: 'Boulder',   hp: 70,  value: 30 },
  { id: 'iron',     name: 'Iron ore',  hp: 150, value: 60 },
  { id: 'gold',     name: 'Gold ore',  hp: 320, value: 120 },
  { id: 'mountain', name: 'Mountain',  hp: 700, value: 250 },
];

// What grows in each ring around the starting ground (ring 1 touches it).
// Numbers are weights: { bush: 3, tree: 1 } means three bushes for every tree.
// Rings 1 to 4 are soft; ring 5 is the jump; ring 7 is the coast. Rings past the last use the last.
export const RINGS = [
  { bush: 7, tree: 3 },
  { bush: 4, tree: 6 },
  { tree: 7, bigTree: 2, bush: 1 },
  { tree: 4, bigTree: 4, bush: 1, rock: 1 },
  { rock: 4, boulder: 3, bigTree: 2, iron: 1 },
  { boulder: 3, iron: 4, gold: 2, mountain: 1 },
  { mountain: 5, gold: 3, iron: 2 },
];
