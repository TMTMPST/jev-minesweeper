# Jev Minesweeper Local Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, browser-based Minesweeper demo in which a Jev-backed controller reads only the rendered board, makes one safe typed decision at a time, and acts through normal browser pointer input.

**Architecture:** The demo web page owns the Minesweeper engine and renders a documented DOM contract (`#CellsBlock`, `#cell_<x>_<y>`, `data-x`, `data-y`, and status classes). A Playwright adapter converts that DOM into an immutable `VisibleBoard`; pure constraint code derives provably safe opens and flags; then a narrow Jev `choice` selects only among those candidates. A controller validates every decision, issues one native pointer action, waits for a changed board, and stops rather than guessing.

**Tech Stack:** Node.js 22 LTS, TypeScript with `strict: true`, Vite (vanilla TypeScript), Vitest, Playwright, native `fetch`, and a hosted Jev-compatible HTTP endpoint configured only through environment variables.

**Spec:** User request in this Codex task on 2026-09-21, summarized in **Global Constraints** below; the inspected public board contract is recorded in `docs/live-site-compatibility.md` by Task 9.

## Global Constraints

- The default product is a local demo. It must make no request to `minesweeper.online` in unit, integration, or end-to-end tests.
- Never log in, create an account, use stored browser profiles, buy anything, or navigate to Arena, Duel, Lobby, ranked, leaderboard, shop, or marketplace pages.
- The controller may use only the visible DOM contract; it must not read a page's JavaScript game state, intercept game network messages, or dispatch synthetic DOM events.
- Use Playwright locator pointer actions with `force: false`; do not use `dispatchEvent`, `evaluate(...click())`, coordinate math, or a direct game-engine method to make a move.
- A live-site adapter is disabled by default and may run only after an explicit command-line acknowledgement, in a fresh incognito context, on a casual non-account page.
- The live compatibility command defaults to zero moves; one move requires both `--ack-live-casual` and `--max-actions=1`, then the process exits for human review.
- The deterministic solver owns proofs, legality checks, thresholds, side effects, and stopping. Jev only ranks a closed set of already-safe or already-proven candidates.
- `JEV_API_KEY` and endpoint credentials stay in process environment variables and must never appear in source, browser code, traces, snapshots, or committed files.
- When a board parse, Jev response, action acknowledgment, or route-safety check is invalid, fail closed with `STOP` and take no click.

## Review Focus

- A cell has both `opened` and `flag`, no status class, or more than one `type0`–`type8` class: parser returns a typed error and Task 4's test proves the controller cannot click.
- Opening a zero reveals several cells at once: Task 8 proves the controller accepts a board-wide DOM diff rather than requiring only its target cell to change.
- A legal board has no provably safe move: Task 5 proves the solver emits no open candidate; Task 7 proves the result is `STOP`, never a guess.
- A Jev endpoint times out or returns an unknown option/schema: Task 6 and Task 7 prove the controller stops and records a non-secret reason.
- A configured live URL redirects to an account, Arena, Duel, Lobby, ranked, market, shop, or payment route: Task 9 proves the adapter aborts before it creates a locator or sends input.

---

## Planned file structure

```text
package.json                         workspace scripts and pinned dependencies
tsconfig.json                        strict TypeScript configuration
vite.config.ts                       local Vite server configuration
playwright.config.ts                 isolated local-browser E2E configuration
index.html                           Vite entry document
.env.example                         names only; never a real key
src/domain/types.ts                  board, cell, action, candidate, and result types
src/domain/engine.ts                 seeded local Minesweeper game rules
src/domain/solver.ts                 pure local constraint inference
src/web/main.ts                      demo bootstrap and DOM-to-engine wiring
src/web/board-view.ts                documented board DOM renderer
src/web/styles.css                   visible closed/open/flag/number styles
src/browser/dom-board-reader.ts      parse the supported DOM contract
src/browser/local-demo-adapter.ts    Playwright read/action implementation for localhost
src/decision/decision-client.ts      Jev-compatible decision interface and response checks
src/decision/mock-decision-client.ts deterministic offline candidate ranking
src/decision/http-jev-client.ts      opt-in backend-only HTTP client
src/controller/safety-gate.ts        route, action, and response validation
src/controller/game-controller.ts    read → solve → decide → act → verify loop
src/cli/play-local.ts                starts a fresh local browser controller session
src/cli/play-live-casual.ts          explicit, guarded compatibility-only live session
docs/dom-contract.md                 stable local DOM contract
docs/live-site-compatibility.md      source-level compatibility note; no automation bypasses
docs/runbook.md                      setup, demo, stop conditions, and troubleshooting
tests/unit/*.test.ts                 domain, solver, parser, client, and gate tests
tests/e2e/local-demo.spec.ts         whole local browser workflow
tests/fixtures/*.ts                  fixed boards and expected parsed states
```

### Task 1: Establish the strict local project and shared contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/domain/types.ts`
- Test: `tests/unit/types.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `CellState`, `VisibleCell`, `VisibleBoard`, `BoardSnapshot`, `MoveAction`, `Candidate`, `DecisionResult`, and `StopReason` for every following task.

- [ ] **Step 1: Write the failing contract test.**

```ts
import { describe, expect, it } from 'vitest';
import { makeBoard, type MoveAction } from '../../src/domain/types';

describe('board contract', () => {
  it('creates an immutable rectangular visible board', () => {
    const board = makeBoard(2, 1, [
      { x: 0, y: 0, state: 'open', number: 1 },
      { x: 1, y: 0, state: 'closed', number: null },
    ]);
    expect(board.width).toBe(2);
    expect(board.cells[0].state).toBe('open');
    const action: MoveAction = { kind: 'OPEN', x: 1, y: 0 };
    expect(action).toEqual({ kind: 'OPEN', x: 1, y: 0 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm run test -- tests/unit/types.test.ts`

Expected: FAIL because the project scripts and `src/domain/types.ts` do not exist.

- [ ] **Step 3: Create the package and strict type configuration.**

Use `type: "module"`, Node `>=22`, and scripts exactly named `dev`, `build`, `typecheck`, `test`, `test:e2e`, `demo`, `agent:local`, and `agent:live:casual`. Add `vite`, `typescript`, `vitest`, `@playwright/test`, and `tsx`; run `npx playwright install chromium` only as an explicit developer setup command, not during tests. Set `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` to `true`.

Add `.gitignore` entries for `.env`, `.env.*`, `playwright-report/`, `test-results/`, `dist/`, and `node_modules/`. Create `.env.example` with only:

```dotenv
JEV_MODE=mock
JEV_API_URL=
JEV_API_KEY=
```

- [ ] **Step 4: Implement the shared types and factory.**

```ts
export type CellState = 'closed' | 'flag' | 'open';
export type MoveAction =
  | { kind: 'OPEN'; x: number; y: number }
  | { kind: 'FLAG'; x: number; y: number }
  | { kind: 'STOP'; reason: StopReason };
export type StopReason =
  | 'NO_PROVEN_MOVE' | 'INVALID_BOARD' | 'UNSAFE_ROUTE'
  | 'DECISION_FAILURE' | 'ACTION_UNCONFIRMED' | 'GAME_FINISHED';
export type VisibleCell = Readonly<{
  x: number; y: number; state: CellState; number: number | null;
}>;
export type VisibleBoard = Readonly<{
  width: number; height: number; cells: readonly VisibleCell[];
}>;
export type GamePhase = 'ready' | 'playing' | 'won' | 'lost';
export type BoardSnapshot = Readonly<{ board: VisibleBoard; phase: GamePhase }>;
export type Candidate = Readonly<{
  action: Exclude<MoveAction, { kind: 'STOP' }>;
  proof: string;
}>;
export type DecisionResult = Readonly<{
  action: MoveAction; confidence: number; source: 'mock' | 'jev';
}>;

export function makeBoard(
  width: number, height: number, cells: readonly VisibleCell[],
): VisibleBoard {
  if (width < 1 || height < 1 || cells.length !== width * height) {
    throw new Error('VisibleBoard must contain one cell per coordinate');
  }
  return Object.freeze({ width, height, cells: Object.freeze([...cells]) });
}
```

- [ ] **Step 5: Run the typecheck and focused test.**

Run: `npm run typecheck && npm run test -- tests/unit/types.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add package.json tsconfig.json vite.config.ts playwright.config.ts index.html .gitignore .env.example src/domain/types.ts tests/unit/types.test.ts
git commit -m "chore: scaffold Jev Minesweeper demo"
```

### Task 2: Implement a seeded local Minesweeper engine

**Files:**
- Create: `src/domain/engine.ts`
- Create: `tests/fixtures/boards.ts`
- Test: `tests/unit/engine.test.ts`

**Interfaces:**
- Consumes: `MoveAction` and `VisibleBoard` from `src/domain/types.ts`.
- Produces: `createGame(config)`, `openCell(game, x, y)`, `toggleFlag(game, x, y)`, `toVisibleBoard(game)`, and `GameStatus` for the web demo.

- [ ] **Step 1: Write failing engine tests for first-open safety, flood reveal, and flags.**

```ts
it('keeps the first opened cell mine-free and reveals a zero region', () => {
  const game = createGame({ width: 4, height: 4, mines: 2, seed: 7 });
  const after = openCell(game, 0, 0);
  expect(after.status).toBe('playing');
  expect(after.cells[0].mine).toBe(false);
  expect(toVisibleBoard(after).cells.filter(c => c.state === 'open').length).toBeGreaterThan(1);
});

it('never opens a flagged cell', () => {
  const game = createGame({ width: 3, height: 3, mines: 1, seed: 3 });
  const flagged = toggleFlag(game, 1, 1);
  expect(openCell(flagged, 1, 1)).toEqual(flagged);
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm run test -- tests/unit/engine.test.ts`

Expected: FAIL because `src/domain/engine.ts` does not exist.

- [ ] **Step 3: Implement immutable engine transitions.**

Create `GameCell` with `mine`, `adjacent`, `opened`, and `flagged`; create `LocalGame` with dimensions, seed, cells, `firstMove`, and status (`ready`, `playing`, `won`, `lost`). Use a deterministic seeded PRNG. On the first `openCell`, place mines excluding the clicked cell and its existing neighbors when enough cells exist. Use a queue-based flood reveal for zeroes. Return a new frozen game object from each transition.

`toVisibleBoard` must emit only `closed`, `flag`, and opened number values; it must never expose mines while status is `ready` or `playing`.

- [ ] **Step 4: Run the focused unit tests.**

Run: `npm run test -- tests/unit/engine.test.ts`

Expected: PASS, including deterministic replay with the same seed.

- [ ] **Step 5: Commit.**

```bash
git add src/domain/engine.ts tests/fixtures/boards.ts tests/unit/engine.test.ts
git commit -m "feat: add deterministic local Minesweeper engine"
```

### Task 3: Render the documented local board DOM contract

**Files:**
- Create: `src/web/board-view.ts`
- Create: `src/web/main.ts`
- Create: `src/web/styles.css`
- Create: `docs/dom-contract.md`
- Modify: `index.html`
- Test: `tests/unit/board-view.test.ts`

**Interfaces:**
- Consumes: `LocalGame`, `openCell`, `toggleFlag`, and `toVisibleBoard` from `src/domain/engine.ts`.
- Produces: `renderBoard(root, board)` and `bindLocalBoard(root, initialGame)`; browser adapters rely on its DOM contract.

- [ ] **Step 1: Write the failing DOM render test.**

```ts
it('renders coordinate-addressable closed, opened, and flagged cells', () => {
  renderBoard(root, makeBoard(2, 1, [
    { x: 0, y: 0, state: 'open', number: 2 },
    { x: 1, y: 0, state: 'flag', number: null },
  ]));
  expect(root.querySelector('#cell_0_0')?.className).toContain('opened');
  expect(root.querySelector('#cell_0_0')?.className).toContain('type2');
  expect(root.querySelector('#cell_1_0')?.getAttribute('data-y')).toBe('0');
  expect(root.querySelector('#cell_1_0')?.className).toContain('flag');
});
```

- [ ] **Step 2: Run the test to verify it fails.**

Run: `npm run test -- tests/unit/board-view.test.ts`

Expected: FAIL because the renderer is missing.

- [ ] **Step 3: Implement the renderer and local interaction.**

Render exactly one `div` per cell under `<div id="CellsBlock">`:

```ts
cell.id = `cell_${visible.x}_${visible.y}`;
cell.dataset.x = String(visible.x);
cell.dataset.y = String(visible.y);
cell.className = [
  'cell',
  visible.state === 'open' ? 'opened' : 'closed',
  visible.state === 'flag' ? 'flag' : '',
  visible.state === 'open' ? `type${visible.number}` : '',
].filter(Boolean).join(' ');
```

Bind ordinary DOM `mousedown`/`mouseup` so a left pointer action opens and a right pointer action toggles a flag; prevent only the browser context menu on the board root. Set `#CellsBlock.dataset.gameStatus` to the local engine's `ready`, `playing`, `won`, or `lost` status on every render. The web app may use its local engine internally, but it must expose no debug endpoint, no mine map, and no JavaScript global containing game state.

- [ ] **Step 4: Document the contract.**

In `docs/dom-contract.md`, specify the selector, coordinate attributes, allowed status/number classes, and that an adapter reads only the DOM. State that `type0` through `type8` are legal only with `opened` and that `flag` is legal only with `closed`.

- [ ] **Step 5: Run renderer and build checks.**

Run: `npm run typecheck && npm run test -- tests/unit/board-view.test.ts && npm run build`

Expected: PASS and `dist/` contains the local demo.

- [ ] **Step 6: Commit.**

```bash
git add index.html src/web docs/dom-contract.md tests/unit/board-view.test.ts
git commit -m "feat: render local board DOM contract"
```

### Task 4: Read the board through Playwright without touching page state

**Files:**
- Create: `src/browser/dom-board-reader.ts`
- Create: `src/browser/local-demo-adapter.ts`
- Test: `tests/unit/dom-board-reader.test.ts`

**Interfaces:**
- Consumes: `VisibleBoard`, `BoardSnapshot`, `VisibleCell`, and `MoveAction` from `src/domain/types.ts`; DOM rules from `docs/dom-contract.md`.
- Produces: `readVisibleBoard(page): Promise<BoardSnapshot>` and `LocalDemoAdapter`, which implements `read()`, `perform(action)`, and `waitForBoardChange(before, timeoutMs)`.

- [ ] **Step 1: Write failing parser tests for valid and malformed class lists.**

```ts
it('parses a numbered opened cell', () => {
  expect(parseCell({ x: '2', y: '3', className: 'cell opened type4' }))
    .toEqual({ x: 2, y: 3, state: 'open', number: 4 });
});

it('rejects conflicting state and number classes', () => {
  expect(() => parseCell({ x: '0', y: '0', className: 'cell opened flag type2 type3' }))
    .toThrow('invalid cell contract');
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm run test -- tests/unit/dom-board-reader.test.ts`

Expected: FAIL because `parseCell` is absent.

- [ ] **Step 3: Implement one page evaluation for a read-only DOM snapshot.**

Use `page.locator('#CellsBlock .cell').evaluateAll(...)` only to return each cell's `id`, `dataset.x`, `dataset.y`, and `className`. Parse and validate that returned plain data in Node. Require unique coordinates, a full rectangle, exactly one status, and exactly one `typeN` only for an opened cell. Do not inspect globals, scripts, storage, network responses, or element text unrelated to the board.

- [ ] **Step 4: Implement native locator actions.**

Use a fresh locator for every action:

```ts
await this.page.locator(`#cell_${x}_${y}`).click({ button: 'left', force: false });
await this.page.locator(`#cell_${x}_${y}`).click({ button: 'right', force: false });
```

Before either call, re-read the board and confirm the target is in bounds, closed, and not flagged. The controller never unflags or clicks an already-open cell. Never call `dispatchEvent`, `locator.evaluate`, `page.mouse`, or a coordinate click.

- [ ] **Step 5: Run parser tests.**

Run: `npm run test -- tests/unit/dom-board-reader.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/browser tests/unit/dom-board-reader.test.ts
git commit -m "feat: read and act on board DOM through locators"
```

### Task 5: Add deterministic safe-move inference

**Files:**
- Create: `src/domain/solver.ts`
- Test: `tests/unit/solver.test.ts`

**Interfaces:**
- Consumes: `VisibleBoard` and `Candidate` from `src/domain/types.ts`.
- Produces: `inferCandidates(board): readonly Candidate[]` and `boardFinished(board): boolean`.

- [ ] **Step 1: Write failing tests for the two local Minesweeper proofs.**

```ts
it('opens every adjacent closed cell when a number already has all needed flags', () => {
  const candidates = inferCandidates(boardFromRows([
    ['F', '1', '?'],
  ]));
  expect(candidates).toContainEqual({
    action: { kind: 'OPEN', x: 2, y: 0 },
    proof: 'number 1 at 1,0 already has 1 adjacent flag',
  });
});

it('flags every adjacent closed cell when they exactly fill a number remainder', () => {
  const candidates = inferCandidates(boardFromRows([
    ['?', '1'],
  ]));
  expect(candidates).toContainEqual({
    action: { kind: 'FLAG', x: 0, y: 0 },
    proof: 'number 1 at 1,0 has 1 remaining mine across 1 closed neighbor',
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm run test -- tests/unit/solver.test.ts`

Expected: FAIL because `inferCandidates` is missing.

- [ ] **Step 3: Implement only proven local constraints.**

For every open numeric cell, collect its eight in-bounds neighbors. Let `flags` be flagged neighbors and `unknown` be closed unflagged neighbors. Emit `OPEN` candidates when `number === flags`; emit `FLAG` candidates when `number - flags === unknown.length`. De-duplicate by `kind:x:y`, retain the first deterministic proof string, and never emit a candidate for a flagged/open target.

- [ ] **Step 4: Add the no-guess and malformed-board tests.**

Test an ambiguous board such as `['?', '1', '?']` with no flags and assert `inferCandidates` returns `[]`. Test a board whose opened cell has fewer flags than zero or more flags than its number and assert it throws `invalid visible board`.

- [ ] **Step 5: Run solver tests.**

Run: `npm run test -- tests/unit/solver.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/domain/solver.ts tests/unit/solver.test.ts
git commit -m "feat: infer proven Minesweeper moves"
```

### Task 6: Add an offline Jev-compatible decision boundary and opt-in HTTP client

**Files:**
- Create: `src/decision/decision-client.ts`
- Create: `src/decision/mock-decision-client.ts`
- Create: `src/decision/http-jev-client.ts`
- Test: `tests/unit/decision-client.test.ts`

**Interfaces:**
- Consumes: `VisibleBoard`, `Candidate`, and `DecisionResult` from `src/domain/types.ts`.
- Produces: `DecisionClient.choose(board, candidates): Promise<DecisionResult>`, `MockDecisionClient`, and `HttpJevDecisionClient`.

- [ ] **Step 1: Write failing decision-client tests.**

```ts
it('uses a deterministic offline winner from an allowed candidate set', async () => {
  const result = await new MockDecisionClient().choose(board, candidates);
  expect(candidates.map(c => c.action)).toContainEqual(result.action);
  expect(result.source).toBe('mock');
});

it('rejects a remote choice that is not an offered option', async () => {
  await expect(client.choose(board, candidates)).rejects.toThrow('unknown Jev option');
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm run test -- tests/unit/decision-client.test.ts`

Expected: FAIL because the clients do not exist.

- [ ] **Step 3: Define the typed request and option encoding.**

Encode each candidate as `OPEN:x:y` or `FLAG:x:y`. The sole Jev question is a `choice` named `next_move` whose options are exactly those encoded strings. Send a normalized string state containing width, height, and every visible cell as `x,y,state,number`; never send a secret, hidden mine, account, cookie, or page URL.

```ts
export interface DecisionClient {
  choose(board: VisibleBoard, candidates: readonly Candidate[]): Promise<DecisionResult>;
}
```

`MockDecisionClient` sorts by `FLAG` then `OPEN`, then `y`, then `x`, returns the first option with confidence `1`, and performs no network call.

- [ ] **Step 4: Implement the HTTP client with fail-closed parsing.**

Require `JEV_API_URL` and `JEV_API_KEY` at construction. Use server-side `fetch` with a 10-second `AbortSignal.timeout(10_000)`, `Authorization: Bearer <key>`, and JSON body shaped as `{ state, questions: { next_move: { type: 'choice', options } } }`. Parse the JSON through an explicit runtime type guard; reject non-2xx responses, missing `next_move`, confidence outside `[0,1]`, and any option not in the offered set. Do not retry a decision automatically because a retry can become a duplicated move upstream.

- [ ] **Step 5: Run focused tests with mocked `fetch`.**

Run: `npm run test -- tests/unit/decision-client.test.ts`

Expected: PASS for the mock, valid remote response, invalid schema, unknown option, HTTP error, and timeout.

- [ ] **Step 6: Commit.**

```bash
git add src/decision tests/unit/decision-client.test.ts
git commit -m "feat: add safe Jev decision boundary"
```

### Task 7: Implement the controller and hard safety gate

**Files:**
- Create: `src/controller/safety-gate.ts`
- Create: `src/controller/game-controller.ts`
- Test: `tests/unit/safety-gate.test.ts`
- Test: `tests/unit/game-controller.test.ts`

**Interfaces:**
- Consumes: browser adapter `read/open/flag`, `inferCandidates`, `DecisionClient`, and all domain contracts.
- Produces: `GameController.step(): Promise<DecisionResult>` and `assertSafeDemoRoute(url): void`.

- [ ] **Step 1: Write failing gate tests.**

```ts
it.each(['/arena', '/duel/12', '/lobby/x', '/leaderboard', '/marketplace', '/shop', '/account'])(
  'blocks an excluded route %s',
  (path) => expect(() => assertSafeLiveRoute(`https://minesweeper.online${path}`)).toThrow('unsafe route'),
);

it('allows only localhost for the default demo adapter', () => {
  expect(() => assertSafeDemoRoute('http://127.0.0.1:4173/?seed=7')).not.toThrow();
  expect(() => assertSafeDemoRoute('https://minesweeper.online/')).toThrow('not local');
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npm run test -- tests/unit/safety-gate.test.ts tests/unit/game-controller.test.ts`

Expected: FAIL because the gate and controller are absent.

- [ ] **Step 3: Implement `step` as a single-action transaction.**

The exact control flow is:

```ts
const before = await adapter.read();
if (before.phase !== 'playing') return stop('GAME_FINISHED');
const candidates = inferCandidates(before.board);
if (candidates.length === 0) return stop('NO_PROVEN_MOVE');
const decision = await client.choose(before.board, candidates);
assertDecisionIsCandidate(decision, candidates);
await gate.assertAction(before.board, decision.action);
await adapter.perform(decision.action);
const after = await adapter.waitForBoardChange(before, 2_000);
if (!after) return stop('ACTION_UNCONFIRMED');
return decision;
```

`STOP` is returned without an adapter action. `waitForBoardChange` compares canonical serialized boards, not only the selected cell, so a zero flood reveal is valid.

- [ ] **Step 4: Add controller failure tests.**

Use a fake adapter and fake client. Assert no `perform` invocation for: no candidates, a Jev action not in candidates, Jev exception, `STOP`, a finished game, and no observed board change after an allowed action.

- [ ] **Step 5: Run controller and gate tests.**

Run: `npm run test -- tests/unit/safety-gate.test.ts tests/unit/game-controller.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/controller tests/unit/safety-gate.test.ts tests/unit/game-controller.test.ts
git commit -m "feat: gate Jev moves behind safe controller checks"
```

### Task 8: Prove the complete local browser workflow

**Files:**
- Create: `tests/e2e/local-demo.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: built Vite demo, `LocalDemoAdapter`, and `GameController`.
- Produces: a repeatable, network-isolated test that demonstrates local DOM reading and safe browser actions.

- [ ] **Step 1: Write the failing Playwright scenario.**

```ts
test('controller makes only proven local moves through rendered DOM', async ({ page }) => {
  await page.goto('/?seed=17&width=6&height=6&mines=6');
  const controller = await createLocalController(page, new MockDecisionClient());
  const first = await controller.step();
  expect(first.action.kind).toBe('STOP'); // no first-click guess is permitted

  await page.locator('#cell_0_0').click(); // human starts the demo
  const result = await controller.step();
  expect(['OPEN', 'FLAG', 'STOP']).toContain(result.action.kind);
});
```

- [ ] **Step 2: Run it to verify it fails.**

Run: `npm run test:e2e -- tests/e2e/local-demo.spec.ts`

Expected: FAIL until the Vite web server and controller factory are configured.

- [ ] **Step 3: Configure an isolated local web server.**

Set Playwright `webServer.command` to `npm run dev -- --host 127.0.0.1`, `baseURL` to `http://127.0.0.1:4173`, and `reuseExistingServer` to `false` in CI. Route every request whose origin is not that base URL to `route.abort()` so the test proves no live-site request exists.

- [ ] **Step 4: Add the zero-flood and stop-on-ambiguity E2E cases.**

Use fixed seeds that expose a zero region and an ambiguous frontier. Assert a single controller action accepts a changed serialized board with multiple opened cells. Assert the ambiguous board yields `STOP` and the test's page-level `mousedown` counter remains unchanged.

- [ ] **Step 5: Run all checks.**

Run: `npm run typecheck && npm run test && npm run test:e2e`

Expected: PASS with no external network request.

- [ ] **Step 6: Commit.**

```bash
git add playwright.config.ts package.json tests/e2e/local-demo.spec.ts
git commit -m "test: verify local Jev Minesweeper browser workflow"
```

### Task 9: Add the disabled-by-default live compatibility adapter

**Files:**
- Create: `src/browser/live-casual-adapter.ts`
- Create: `src/cli/play-live-casual.ts`
- Create: `docs/live-site-compatibility.md`
- Test: `tests/unit/live-casual-adapter.test.ts`

**Interfaces:**
- Consumes: `readVisibleBoard`, locator action rules, `assertSafeLiveRoute`, and `GameController`.
- Produces: `LiveCasualAdapter.create(options)` and an explicit CLI that refuses to run without acknowledgement.

- [ ] **Step 1: Write failing live-safety tests without opening a browser.**

```ts
it('requires an acknowledgement and explicit one-move limit before browser launch', async () => {
  await expect(parseLiveArgs([])).rejects.toThrow('--ack-live-casual');
  await expect(parseLiveArgs(['--ack-live-casual'])).rejects.toThrow('--max-actions=1');
});

it('does not create a cell locator on an unsafe redirected URL', async () => {
  const page = fakePageAt('https://minesweeper.online/arena');
  await expect(LiveCasualAdapter.create(page)).rejects.toThrow('unsafe route');
  expect(page.locator).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npm run test -- tests/unit/live-casual-adapter.test.ts`

Expected: FAIL because the compatibility adapter is absent.

- [ ] **Step 3: Implement conservative live-session creation.**

Require both exact CLI flags `--ack-live-casual` and `--max-actions=1`. Without `--max-actions=1`, launch only a fresh non-persistent inspection context and exit after a valid board read; do not load storage state or enable downloads. Permit only `https://minesweeper.online` as the origin. Before every board read and action, call `assertSafeLiveRoute`; reject any pathname/query containing `account`, `arena`, `duel`, `lobby`, `rank`, `leaderboard`, `market`, `shop`, `payment`, `invoice`, or `event`. The live adapter labels a valid rendered board as `playing` for its single action, then the CLI exits without a second step.

The CLI must print the current URL and require the user to start a casual board manually. It then waits for `#CellsBlock .cell`; it never clicks a difficulty selector, account element, popup, ad, or non-cell element.

- [ ] **Step 4: Record the compatibility contract and limits.**

In `docs/live-site-compatibility.md`, record the observed public implementation facts: cells are `#cell_<x>_<y>` with `data-x`/`data-y`; the renderer uses `closed`, `opened`, `flag`, and `type0`–`type8`; interaction handlers use pointer and context-menu events; synthetic untrusted events are recorded by the site. State that this is a compatibility experiment, not a way to bypass anti-cheat or play competitive modes, and that DOM changes can break it.

- [ ] **Step 5: Run unit tests only.**

Run: `npm run test -- tests/unit/live-casual-adapter.test.ts`

Expected: PASS. Do not add a live-site E2E test, scheduled run, or unattended loop.

- [ ] **Step 6: Commit.**

```bash
git add src/browser/live-casual-adapter.ts src/cli/play-live-casual.ts docs/live-site-compatibility.md tests/unit/live-casual-adapter.test.ts
git commit -m "feat: add guarded casual-site compatibility adapter"
```

### Task 10: Add a human-readable demo runbook and final verification

**Files:**
- Create: `docs/runbook.md`
- Modify: `package.json`
- Test: `tests/unit/runbook-command.test.ts`

**Interfaces:**
- Consumes: all scripts and CLI contracts from Tasks 1–9.
- Produces: a repeatable local demo procedure and explicit stop conditions.

- [ ] **Step 1: Write the failing script-contract test.**

```ts
it('does not make the guarded live command the default demo command', async () => {
  const pkg = await readPackageJson();
  expect(pkg.scripts.demo).toContain('vite');
  expect(pkg.scripts['agent:live:casual']).toContain('--ack-live-casual');
  expect(pkg.scripts.demo).not.toContain('minesweeper.online');
});
```

- [ ] **Step 2: Run it to verify it fails.**

Run: `npm run test -- tests/unit/runbook-command.test.ts`

Expected: FAIL until scripts and documentation are final.

- [ ] **Step 3: Write `docs/runbook.md`.**

Include exact commands for `npm install`, `npx playwright install chromium`, `npm run demo`, `npm run agent:local`, and `npm run test:e2e`. Explain that `JEV_MODE=mock` is the safe default and remote Jev needs `JEV_API_URL` plus `JEV_API_KEY` in an uncommitted `.env`. List every `STOP` reason and say that `NO_PROVEN_MOVE` is expected—not a failure—when a board requires a guess.

Include a separate, clearly labeled compatibility section with the exact guarded invocation:

```bash
npm run agent:live:casual -- --ack-live-casual --max-actions=1
```

State that it must be run by a user who manually starts an unranked casual board, and that the program exits on login/account/competitive/commerce routes.

- [ ] **Step 4: Run the full verification suite.**

Run: `npm run typecheck && npm run test && npm run build && npm run test:e2e`

Expected: PASS. Confirm `git status --short` shows no `.env`, trace, screenshot, video, browser profile, or secret file staged for commit.

- [ ] **Step 5: Commit.**

```bash
git add docs/runbook.md package.json tests/unit/runbook-command.test.ts
git commit -m "docs: add safe Jev Minesweeper demo runbook"
```

## Self-review

**Spec coverage:** Tasks 1–3 create the local/demo game; Task 4 proves DOM-only observation and normal pointer actions; Task 5 prevents unproven guesses; Task 6 provides Jev's typed `choice` boundary plus offline mode; Task 7 keeps code in control of every action; Task 8 verifies the local workflow; Task 9 isolates the optional casual-site experiment; Task 10 documents operation and verifies no unsafe command becomes default.

**Placeholder scan:** No task contains an incomplete-marker, deferred implementation reference, or unspecified validation/test step. All named interfaces are defined by their owning task.

**Type consistency:** `VisibleBoard`, `Candidate`, `MoveAction`, `DecisionResult`, `DecisionClient.choose`, `GameController.step`, and adapter `read/perform/waitForBoardChange` use the same names across producer and consumer tasks.

**Review-focus coverage:** Malformed DOM is tested in Task 4; multi-cell zero reveal in Task 8; no-guess stopping in Tasks 5 and 7; remote-decision failure in Tasks 6 and 7; and forbidden live routes in Task 9.

