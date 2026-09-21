# Jev Minesweeper local demo

## Setup

```bash
npm install
npx playwright install chromium
npm run demo
```

Open the displayed local URL and make the first move manually. The demo is local only. To let the controller make one proven move in a fresh browser after you have started the local server:

```bash
npm run agent:local
```

Run browser verification with `npm run test:e2e`.

`JEV_MODE=mock` is the safe default. For a remote Jev-compatible endpoint, place these uncommitted values in `.env`: `JEV_MODE=jev`, `JEV_API_URL`, and `JEV_API_KEY`. Never put credentials in source, traces, snapshots, or commits.

The controller stops with `NO_PROVEN_MOVE`, `INVALID_BOARD`, `UNSAFE_ROUTE`, `DECISION_FAILURE`, `ACTION_UNCONFIRMED`, or `GAME_FINISHED`. `NO_PROVEN_MOVE` is expected when the board requires a guess; it is not a failure.

## Guarded live compatibility

```bash
npm run agent:live:casual -- --ack-live-casual --max-actions=1
```

Only a user may manually start an unranked casual board. The program exits on login/account, competitive, commerce, or excluded routes. It neither selects a game mode nor clicks any non-cell element.
