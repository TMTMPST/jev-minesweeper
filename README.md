# Jev Minesweeper

A local, browser-based Minesweeper demo with a guarded Jev decision integration.

The default workflow runs entirely on `localhost`: the web page owns a seeded Minesweeper engine, the controller reads the rendered board DOM, deterministic constraint inference produces only proven-safe or proven-mine candidates, and the decision client selects from that closed candidate set. If the board cannot be solved safely, the controller stops instead of guessing.

## What this repository contains

- **Web UI:** Vite + vanilla TypeScript Minesweeper board.
- **Controller:** Playwright reads the visible DOM, validates decisions, performs normal pointer actions, and waits for a board change.
- **Decision layer:** deterministic mock client by default; optional HTTP Jev-compatible client.
- **Domain layer:** immutable board types, seeded game engine, and constraint solver.
- **Live compatibility experiment:** a disabled-by-default, human-started casual-board check for `minesweeper.online`.

There is no application API server, background worker, or database in this repository. The optional Jev integration is an outbound HTTP request from the local controller; it is not a local API/worker/database stack.

## Requirements

- Node.js 22 or newer
- npm
- Chromium for the default controller, or the Playwright browser engine selected below

## Setup

```bash
npm install
npx playwright install chromium
```

Optional Jev configuration belongs in an uncommitted `.env` file:

```dotenv
JEV_MODE=mock
JEV_API_URL=
JEV_API_KEY=
PLAYWRIGHT_BROWSER=chromium
BROWSER_EXECUTABLE_PATH=

```
`JEV_MODE=mock` is the safe default. To use the HTTP client, set `JEV_MODE=jev`, `JEV_API_URL`, and `JEV_API_KEY`. Credentials are read only by the Node-side controller and must never be committed, copied into browser code, or included in traces, snapshots, or logs.

`PLAYWRIGHT_BROWSER` accepts `chromium` (default), `firefox`, or `webkit`. Install the selected engine with `npx playwright install <engine>`. `BROWSER_EXECUTABLE_PATH` is optional and only appropriate for a compatible browser build. For Zen or another personal browser, run `npm run dev:ui` and open the local URL there; the page is browser-independent, while automated Playwright control requires one of its supported engines.

## Run the local demo

```bash
npm run dev
```

This starts the local controller and opens the selected headed Playwright browser. Choose a difficulty or custom board, then click **Start Jev**. The controller continuously reads the board and takes one validated action at a time. If safe inference reaches a position requiring a guess, it waits for a manual board move or **New board**, then resumes from the changed board.

For UI-only development:

```bash
npm run dev:ui
```

For a production-like local preview:

```bash
npm run build
npm run preview
```

To expose the Vite UI on the local network:

```bash
npm run host
```

`LOCAL_DEMO_URL` may point `npm run dev` at an already-running local demo. If it is set and unavailable, startup fails rather than silently using another URL.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local UI/controller workflow. |
| `npm run dev:ui` | Start only the Vite development UI. |
| `npm run build` | Type-check and build the Vite application. |
| `npm run typecheck` | Run TypeScript checking without emitting files. |
| `npm run test` | Run unit tests. |
| `npm run test:e2e` | Run the local Playwright workflow. |
| `npm run preview` | Serve the built application locally. |
| `npm run agent:local` | Alias for the local controller. |
| `npm run agent:live:casual` | Run the guarded live compatibility check. |

## Stop conditions

The controller fails closed with one of these results:

- `NO_PROVEN_MOVE`: no deterministic safe move exists; this is expected when a guess would be required.
- `INVALID_BOARD`: the board cannot be parsed or validated.
- `UNSAFE_ROUTE`: the live route is outside the supported casual-board scope.
- `DECISION_FAILURE`: the decision client failed or returned an invalid/unknown candidate.
- `ACTION_UNCONFIRMED`: the browser action did not produce a confirmed board change.
- `GAME_FINISHED`: the board is won, lost, or otherwise not playing.

No unproven move is sent after a parse, response, route, or acknowledgement failure.

## Calculated guess mode

The local demo defaults to **Calculated guesses** off. With it off, Jev stops at `NO_PROVEN_MOVE` instead of selecting an unproven cell.

Enable **Calculated guesses** in **Board setup** only when you accept that a game can be lost. When deterministic proof runs out, Jev enumerates bounded constraint-consistent frontier assignments, offers only the tied cells with the lowest computed mine risk, and makes one open action. The decision panel labels that action as a calculated guess and shows its mine risk.

This mode applies only to the local demo. The guarded live compatibility command never makes guesses.

## Live compatibility limits

The live command is intentionally restrictive:

```bash
npm run agent:live:casual -- --ack-live-casual --max-actions=1
```

Both flags are required. The tool opens a fresh browser context at `https://minesweeper.online/`, requires the user to manually start an unranked casual board, validates the visible board contract, and exits without automatically making a move. It does not log in, create accounts, use stored profiles, choose modes, access competitive/commerce routes, or click non-cell elements.

For the complete route and DOM limitations, see [`docs/live-site-compatibility.md`](docs/live-site-compatibility.md).

## Security and data boundaries

- The local board state is generated in the browser; there is no database persistence.
- Telemetry is an in-memory ring of the last 100 sequenced events, bound to `127.0.0.1` on an ephemeral port, and is not persisted.
- The telemetry endpoint is intended for the local demo only and permits cross-origin reads; do not expose it publicly.
- The Jev API key stays in the Node process environment and is sent only as a bearer token to `JEV_API_URL`.
- The browser controller uses the documented visible DOM contract and normal Playwright locator actions; it does not read page JavaScript state or intercept game network traffic.

## Troubleshooting

- If a selected Playwright engine is missing, run `npx playwright install <engine>`; the default engine is Chromium.
- `PLAYWRIGHT_BROWSER=firefox npm run dev` and `PLAYWRIGHT_BROWSER=webkit npm run dev` select those Playwright engines.
- Zen is supported for the UI-only flow: run `npm run dev:ui`, then open the local URL in Zen. It is not a Playwright controller engine.
- If port `4173` is already serving the demo, `npm run dev` reuses it. Set `LOCAL_DEMO_URL` to use a different local URL explicitly.
- If a configured `LOCAL_DEMO_URL` cannot be reached, unset it or start that server first.
- If Jev mode fails, verify `JEV_MODE=jev`, `JEV_API_URL`, and `JEV_API_KEY`; the controller stops with `DECISION_FAILURE` instead of guessing.
- If the controller reports `NO_PROVEN_MOVE`, make a manual move or start a new board; it resumes after the board revision changes and never guesses.

## Further documentation

- [`docs/runbook.md`](docs/runbook.md): setup and operational runbook.
- [`docs/dom-contract.md`](docs/dom-contract.md): local board DOM contract.
- [`docs/live-site-compatibility.md`](docs/live-site-compatibility.md): live-site scope and observed compatibility details.
