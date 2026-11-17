# Loop Line

An idle train game set on islands. The island starts covered in trees, rocks
and ore, with a tiny loop of track in the middle. The train's carts mine
whatever sits beside the track. Clear every block along one side and that
side of the track moves out a tile, reaching new blocks. Clear the whole
island and sail to the next one, which is a little tougher and pays more.

Play it: https://awsumbtech.github.io/loop-line/

## How it plays

- **Blocks**: trees near the middle, then rocks, copper and gold toward the
  coast. Tougher blocks pay more.
- **Carts**: each cart hits every block it passes once per lap. Buy carts
  with coins. Merge two carts of the same level into one of the next level,
  which hits harder and frees a slot.
- **Islands**: blocks on each new island are twice as tough and pay twice as
  much. Carts and coins come with you.
- **Speed**: tap the island to speed the train up for a moment.

The game saves in the browser and keeps working for up to an hour while it
is closed. It can be installed to a phone's home screen.

## Run and test

Open `index.html` in a browser. There is no build step and nothing to install.

```
node test/logic.test.js
```

The tests run the game rules (the part of `index.html` between the
`// <logic>` markers) without a browser, and print a pacing estimate.

## Roadmap

- Upgrades: engine speed and more
- TNT and other boosts
- More kinds of islands
