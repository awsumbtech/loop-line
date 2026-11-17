# Loop Line

An idle train game. A train circles a loop of track, gathers what grows beside
it, and sells the load at the depot. Coins buy upgrades and new land. Each new
land makes the loop longer, zooms the map out, and reaches richer ground.

Play it: https://awsumbtech.github.io/loop-line/

## Lands

The ground gets richer in rings around the depot.

| Land | Price | New resource | Sells for |
| --- | --- | --- | --- |
| Home Woods | start | Wood | 2 |
| Deep Woods | 150 | Hardwood | 4 |
| The Quarry | 1,500 | Stone | 8 |
| Iron Ridge | 12,000 | Iron | 16 |
| Gold Hills | 100,000 | Gold | 32 |
| Crystal Peak | 800,000 | Crystal | 64 |

## Upgrades

| Upgrade | What it does |
| --- | --- |
| Engine | Shorter lap time |
| Wagon | Holds more |
| Tools | More from each tree or rock |
| Growth | Trees and rocks come back faster |

Tap the map to stoke the engine for a short speed boost. The game saves in
the browser and keeps earning for up to an hour while it is closed.

## Run and test

Open `index.html` in a browser. There is no build step and nothing to install.

```
node test/logic.test.js
```

The tests run the game rules (the part of `index.html` between the
`// <logic>` markers) without a browser, and print a pacing estimate.

## Roadmap

1. Wagon order: more wagons, and neighbouring wagons buff each other
2. A bigger offline allowance and more lands
3. Refining wagons and town contracts
4. Prestige: reach the end of the line and start a new one
