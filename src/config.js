// All tuning lives here. Change numbers, add blocks or remove them without
// touching any game code.

export const CONFIG = {
  grid: {
    width: 13,               // island grid in tiles, including the sea around it
    height: 17,
    coastWaterChance: 0.25,  // share of the outer land ring that is sea, for a ragged coast
    roughness: 0.22,         // how much the block bands wobble
    scatter: { block: 'tree', chance: 0.12 },   // trees dotted among the rocks
  },
  start: {
    claimRadius: 1,          // the cleared ground at the start: a 3 x 3 square around the station
    carts: [1],              // cart levels each island starts with
    coins: 0,
  },
  train: {
    speed: 1.2,              // tiles per second
    carLength: 0.9,          // track each car takes up, in tiles
    maxCarts: 8,
  },
  steam: { perTap: 0.25, max: 1, decayPerSecond: 0.5 },
  carts: { powerGrowth: 2.2 },   // a level n cart hits for powerGrowth^(n-1), rounded
  shop: { baseCost: 10, costGrowth: 1.45, levelsBelowBest: 2 },
  islands: { hpGrowth: 1.3, valueGrowth: 1.5 },   // each new island versus the one before
  track: { inset: 0.3 },     // how far inside the cleared ground the track runs, in tiles
  offline: { capSeconds: 3600 },
  save: { key: 'loopline.v4', version: 4, retiredKeys: ['loopline.save.v1', 'loopline.island.v1'] },
};

// Blocks that cover the island. "reach" is how far from the middle the block
// starts (0 is the middle, 1 is the coast); each one fills the ground until the
// next one's reach. Add a row here and it appears on the island.
export const BLOCK_TYPES = [
  { id: 'tree',   name: 'Tree',   hp: 2,  value: 1,  reach: 0 },
  { id: 'rock',   name: 'Rock',   hp: 6,  value: 3,  reach: 0.55 },
  { id: 'copper', name: 'Copper', hp: 15, value: 8,  reach: 0.76 },
  { id: 'gold',   name: 'Gold',   hp: 35, value: 20, reach: 0.93 },
];
