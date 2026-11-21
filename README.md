# best-spot-the-difference-game-20261121-0451

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Valkyra54/best-spot-the-difference-game-20261121-0451/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Valkyra54/best-spot-the-difference-game-20261121-0451/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

**Lantern Market — Spot the Difference.** A complete original spot-the-difference game set in a glowing night market: two nearly identical scenes side by side, and a sharp eye is the only tool you need.

## The game

Three hand-drawn night-market scenes, each with its own set of hidden changes:

| Scene | Differences | Mood |
| --- | --- | --- |
| Lantern Alley | 7 | Paper lanterns, food stalls, a sleepy cat |
| Noodle Cart Row | 9 | Steam, signs, a very busy cook |
| Festival Square | 11 | Crowds, fireworks, the grand finale |

Find every difference before the timer runs out. Each wrong click costs time, so look before you tap. Stuck? Spend a hint — it circles one difference you haven't found yet, but hints are limited, so use them wisely.

## How to play

- **Mouse:** click a difference on either panel.
- **Keyboard:** arrow keys move the cursor, `Enter`/`Space` marks a spot, `H` uses a hint, `R` restarts the scene.
- **Goal:** clear all three scenes. Your score rewards speed, accuracy, and how few hints you needed.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — the game is plain static files (`game/index.html` and its ES modules, no library, no network request), so it works fully offline.

## Build the entry

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Copies `game/` and `screenshots/` into the output directory and writes `dossier.json` there (Node 22, standard library only).

---

<sub>Entered on [make.fun](https://make.fun/?ref=nbgfvtz4&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
