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

function dashboard(root: HTMLElement): { board: HTMLElement; status: HTMLElement; opened: HTMLElement; flagged: HTMLElement; event: HTMLElement } {
  root.innerHTML = `<section class="console-shell"><header class="console-header"><div><span class="eyebrow">LOCAL // SAFE MODE</span><h1>JEV MINESWEEPER</h1></div><div class="connection"><i></i> CONTROLLER READY</div></header><div class="console-grid"><section class="board-panel"><div class="panel-heading"><span>VISIBLE BOARD</span><span id="game-status">READY</span></div><div id="board-stage"></div><p class="board-hint">Left click opens. Right click flags. The controller sees only these rendered cells.</p></section><aside class="agent-panel"><section class="telemetry"><div class="panel-heading"><span>BOARD TELEMETRY</span><span>LIVE</span></div><dl><div><dt>Opened</dt><dd id="opened-count">0</dd></div><div><dt>Flags</dt><dd id="flagged-count">0</dd></div><div><dt>Dimensions</dt><dd id="dimension-count">—</dd></div></dl></section><section class="decision-card"><div class="panel-heading"><span>JEV DECISION PROTOCOL</span><span>SAFE</span></div><ol><li>Read the visible DOM contract.</li><li>Derive only mathematically proven moves.</li><li>Offer Jev that closed candidate set.</li><li>Validate its selected option before one pointer action.</li></ol></section><section class="event-card"><div class="panel-heading"><span>LAST BOARD EVENT</span><span>LOG</span></div><p id="last-event">Awaiting the human first click.</p></section><section class="safety-card"><strong>NO GUESSES</strong><p>When no move is proven, the controller stops instead of risking the board.</p></section></aside></div></section>`;
  const board = root.querySelector<HTMLElement>('#board-stage');
  const status = root.querySelector<HTMLElement>('#game-status');
  const opened = root.querySelector<HTMLElement>('#opened-count');
  const flagged = root.querySelector<HTMLElement>('#flagged-count');
  const event = root.querySelector<HTMLElement>('#last-event');
  if (!board || !status || !opened || !flagged || !event) throw new Error('dashboard initialization failed');
  return { board, status, opened, flagged, event };
}

export function bindLocalBoard(root: HTMLElement, initialGame: LocalGame): void {
  let game = initialGame;
  const view = dashboard(root);
  const render = () => {
    const board = toVisibleBoard(game);
    renderBoard(view.board, board, game.status);
    view.status.textContent = game.status.toUpperCase();
    view.opened.textContent = String(board.cells.filter((cell) => cell.state === 'open').length);
    view.flagged.textContent = String(board.cells.filter((cell) => cell.state === 'flag').length);
    root.querySelector('#dimension-count')!.textContent = `${board.width} × ${board.height}`;
  };
  root.addEventListener('contextmenu', (event) => event.preventDefault());
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
