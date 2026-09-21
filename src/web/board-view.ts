import { openCell, toVisibleBoard, toggleFlag, type LocalGame } from '../domain/engine';
import type { VisibleBoard } from '../domain/types';

export function renderBoard(root: HTMLElement, board: VisibleBoard, status: LocalGame['status']): void {
  const block = document.createElement('div');
  block.id = 'CellsBlock';
  block.dataset.gameStatus = status;
  block.setAttribute('aria-label', 'Minesweeper board');
  block.style.setProperty('--board-width', String(board.width));
  for (const visible of board.cells) {
    const cell = document.createElement('div');
    cell.id = `cell_${visible.x}_${visible.y}`;
    cell.dataset.x = String(visible.x);
    cell.dataset.y = String(visible.y);
    cell.className = ['cell', visible.state === 'open' ? 'opened' : 'closed', visible.state === 'flag' ? 'flag' : '', visible.state === 'open' ? `type${visible.number}` : ''].filter(Boolean).join(' ');
    if (visible.state === 'open' && visible.number !== 0) cell.textContent = String(visible.number);
    if (visible.state === 'flag') cell.textContent = '⚑';
    block.append(cell);
  }
  root.replaceChildren(block);
}

function dashboard(root: HTMLElement): { board: HTMLElement; status: HTMLElement; opened: HTMLElement; flagged: HTMLElement; dimensions: HTMLElement; event: HTMLElement; run: HTMLElement } {
  root.innerHTML = `<section class="console-shell"><header class="console-header"><div><span class="eyebrow">LOCAL // SAFE MODE</span><h1>JEV MINESWEEPER</h1></div><div class="header-actions"><div class="connection"><i></i> CONTROLLER READY</div><button id="restart-game" type="button">RESTART BOARD</button></div></header><div class="console-grid"><section class="board-panel"><div class="panel-heading"><span>VISIBLE BOARD</span><span id="game-status">READY</span></div><div id="board-stage"></div><p class="board-hint">Local demo auto-starts. The controller reads only these rendered cells and never guesses.</p></section><aside class="agent-panel"><section class="telemetry"><div class="panel-heading"><span>BOARD TELEMETRY</span><span>LIVE</span></div><dl><div><dt>Opened</dt><dd id="opened-count">0</dd></div><div><dt>Flags</dt><dd id="flagged-count">0</dd></div><div><dt>Dimensions</dt><dd id="dimension-count">—</dd></div></dl></section><section class="decision-card"><div class="panel-heading"><span>JEV DECISION</span><span id="decision-state">WAITING</span></div><div id="controller-log" class="controller-log"><p><b>Awaiting candidate proof.</b><span>Solver must produce safe candidates before Jev is queried.</span></p></div></section><section class="event-card"><div class="panel-heading"><span>LOCAL BOARD EVENT</span><span id="run-id">RUN 1</span></div><p id="last-event">Board initialized with a safe opening.</p></section><section class="safety-card"><strong>PROOF-GATED CONTROL</strong><p>Choice selects among proofs. Confidence is display-only; the solver and validator own safety.</p></section></aside></div></section>`;
  const board = root.querySelector<HTMLElement>('#board-stage');
  const status = root.querySelector<HTMLElement>('#game-status');
  const opened = root.querySelector<HTMLElement>('#opened-count');
  const flagged = root.querySelector<HTMLElement>('#flagged-count');
  const dimensions = root.querySelector<HTMLElement>('#dimension-count');
  const event = root.querySelector<HTMLElement>('#last-event');
  const run = root.querySelector<HTMLElement>('#run-id');
  if (!board || !status || !opened || !flagged || !dimensions || !event || !run) throw new Error('dashboard initialization failed');
  return { board, status, opened, flagged, dimensions, event, run };
}

export function bindLocalBoard(root: HTMLElement, initialGame: LocalGame, nextGame: () => LocalGame): void {
  let game = initialGame;
  let run = 1;
  const view = dashboard(root);
  const render = () => {
    const board = toVisibleBoard(game);
    renderBoard(view.board, board, game.status);
    view.status.textContent = game.status.toUpperCase();
    view.opened.textContent = String(board.cells.filter((cell) => cell.state === 'open').length);
    view.flagged.textContent = String(board.cells.filter((cell) => cell.state === 'flag').length);
    view.dimensions.textContent = `${board.width} × ${board.height}`;
    view.run.textContent = `RUN ${run}`;
  };
  root.addEventListener('contextmenu', (event) => event.preventDefault());
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement) || event.target.id !== 'restart-game') return;
    game = nextGame();
    run += 1;
    view.event.textContent = 'New local board initialized. Controller will resume when proven moves exist.';
    render();
  });
  root.addEventListener('mouseup', (event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.classList.contains('cell')) return;
    const x = Number(event.target.dataset.x);
    const y = Number(event.target.dataset.y);
    if (!Number.isInteger(x) || !Number.isInteger(y)) return;
    const action = event.button === 0 ? 'opened' : event.button === 2 ? 'flagged' : undefined;
    if (!action) return;
    game = action === 'opened' ? openCell(game, x, y) : toggleFlag(game, x, y);
    view.event.textContent = `Human ${action} cell ${x},${y}. Board status: ${game.status}.`;
    render();
  });
  render();
}
