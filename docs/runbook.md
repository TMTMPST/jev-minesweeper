# Jev Minesweeper local demo

## Setup

```bash
npm install
npx playwright install chromium
npm run agent:local
```

`agent:local` starts the local browser demo and controller together. The board opens with a random safe local opening; no terminal input is needed. When the controller stops, use **RESTART BOARD** or **APPLY NEW RANDOM BOARD** in the browser. Board width, height, mine count, and cell size are configurable in the UI.

For UI-only development:

```bash
npm run dev
```

For another device on the same network:

```bash
npm run host
```

For a production-like local preview:

```bash
npm run build
npm run preview
```

Run browser verification with `npm run test:e2e`.

`JEV_MODE=mock` is the safe default. For a remote Jev-compatible endpoint, place these uncommitted values in `.env`: `JEV_MODE=jev`, `JEV_API_URL`, and `JEV_API_KEY`. Never put credentials in source, traces, snapshots, or commits.

The controller stops with `NO_PROVEN_MOVE`, `INVALID_BOARD`, `UNSAFE_ROUTE`, `DECISION_FAILURE`, `ACTION_UNCONFIRMED`, or `GAME_FINISHED`. `NO_PROVEN_MOVE` is expected when the board requires a guess; it is not a failure.

## Guarded live compatibility

```bash
npm run agent:live:casual -- --ack-live-casual --max-actions=1
```

Only a user may manually start an unranked casual board. The program exits on login/account, competitive, commerce, or excluded routes. It neither selects a game mode nor clicks any non-cell element.
