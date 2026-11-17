# Loop Line

An idle train game. A train circles a loop of track, cuts trees as it passes,
and sells the wood at the depot. Spend coins on four upgrades:

| Upgrade | What it does |
| --- | --- |
| Engine | Shorter lap time |
| Wagon | Holds more wood |
| Saw | More wood from each tree |
| Forest | Trees grow back faster |

Tap the map to stoke the engine for a short speed boost. The game saves in
the browser and keeps earning for up to an hour while it is closed.

## Play

Open `index.html` in a browser. There is no build step and nothing to install.

## Test

```
node test/logic.test.js
```

The tests run the game rules (the part of `index.html` between the
`// <logic>` markers) without a browser.

## Roadmap

1. Ore and a second wagon (a saw car for wood, a drill car for ore)
2. Wagon order: neighbouring wagons buff each other
3. A longer loop into a new biome, and a bigger offline allowance
4. Refining wagons and town contracts
5. Prestige: reach the end of the line and start a new one
