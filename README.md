# Loop Line

An idle train game set on islands. Each island starts covered in trees,
rocks and ore, with a small loop of track around a station in the middle.
The train's carts mine whatever sits beside the track. Every block you clear
lets the ground, and the track around it, grow a little. Clear the whole
island and sail to the next one, which starts fresh with richer blocks.

Play it: https://awsumbtech.github.io/loop-line/

## Run and test

The game is plain JavaScript modules with no build step. Browsers only load
modules from a web server, so run one from this folder:

```
python3 -m http.server 8000      # then open http://localhost:8000
node test/game.test.js           # tests, plus a pacing estimate
```

## How the code is organised

Every piece has one job and can be changed, replaced or removed on its own.
Pieces talk through an event bus rather than calling each other.

```
src/
  config.js              All tuning numbers and the list of block types
  Game.js                Holds the state and runs the systems in order
  core/                  EventBus, number helpers
  world/                 Island, Tile, BlockType, BlockCatalog,
                         IslandGenerator, Territory (cleared ground), Track
  train/                 Train, Cart
  economy/               Wallet, CartShop
  systems/               TrainSystem, MiningSystem, RewardSystem, TerritorySystem
  save/                  SaveManager, storage (browser or memory)
  view/                  Renderer, Camera, BlockPainters, styles, and one
                         class per drawing layer in view/layers/
  ui/                    Hud (panels and buttons), Input, pwa
  main.js                Wires everything together in the browser
```

Common changes:

| To | Do this |
| --- | --- |
| Make islands longer or shorter | Change `islands.length` in `src/config.js` (0.8 is about 12 to 15 minutes; 2 is roughly twice as long) |
| Tune speed, prices, island size | Edit `src/config.js` |
| Change what grows where | Edit `RINGS` in `src/config.js`: one weighted mix per ring, ring 1 next to the start |
| Add a block type | Add a row to `BLOCK_TYPES`, put its id in one or more `RINGS` mixes, and optionally a style in `view/styles.js` (unstyled blocks use a fallback look) |
| Add game behaviour | Write a system with `update(dt, game)` and pass it to `game.addSystem()` |
| Turn behaviour off | `game.removeSystem('mining')`, for example |
| Change how islands are laid out | Subclass or replace `IslandGenerator` and pass it to `new Game({ generator })` |
| Add something to the screen | Write a layer with `draw(ctx, renderer, dt)` and `renderer.addLayer()` |
| Save new state | `game.addPart('name', { save, load })`; old saves without it still load |

Events on `game.bus`: `block:hit`, `block:broken`, `track:changed`,
`island:started`, `coins:changed`.
