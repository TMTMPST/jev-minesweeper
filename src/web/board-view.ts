import { openCell, toVisibleBoard, toggleFlag, type LocalGame } from '../domain/engine';
import type { VisibleBoard } from '../domain/types';

export type BoardSettings = Readonly<{ width: number; height: number; mines: number; cellSize: number }>;

type Dashboard = Readonly<{ board: HTMLElement; status: HTMLElement; opened: HTMLElement; flagged: HTMLElement; dimensions: HTMLElement; event: HTMLElement; run: HTMLElement; width: HTMLInputElement; height: HTMLInputElement; mines: HTMLInputElement; scale: HTMLInputElement; scaleValue: HTMLOutputElement }>;

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

function dashboard(root: HTMLElement, settings: BoardSettings): Dashboard {
  root.innerHTML = `<section class="app-shell"><header class="topbar"><a class="brand" href="/"><span>JEV</span> MINESWEEPER</a><div class="topbar-status"><span class="status-dot"></span><span id="game-status">READY</span></div><div class="topbar-actions"><button id="fullscreen-game" class="button ghost" type="button">Fullscreen</button><button id="restart-game" class="button ghost" type="button">New board</button><button id="start-agent" class="button primary" type="button">Start Jev</button></div></header><main class="workspace"><section class="game-column"><div class="game-card"><div class="card-head"><div><span class="kicker">LOCAL GAME</span><h1>Clear the field.</h1></div><span id="run-id" class="run-badge">RUN 1</span></div><div id="board-stage"></div><footer class="board-footer"><span>Left click to open · Right click to flag</span><span id="last-event">New random board ready.</span></footer></div></section><aside class="inspector"><section class="panel setup-panel"><div class="panel-title"><span>New game</span><small>Random every time</small></div><div class="difficulty-grid"><button data-preset="easy" type="button">Easy<small>9 × 9 · 10</small></button><button data-preset="medium" type="button">Medium<small>12 × 12 · 25</small></button><button data-preset="intermediate" type="button">Intermediate<small>16 × 16 · 40</small></button><button data-preset="hard" type="button">Hard<small>20 × 16 · 65</small></button><button data-preset="expert" type="button">Expert<small>30 × 16 · 99</small></button></div><details><summary>Custom board</summary><div class="custom-grid"><label>Width<input id="board-width" type="number" min="4" max="30" value="${settings.width}" /></label><label>Height<input id="board-height" type="number" min="4" max="24" value="${settings.height}" /></label><label>Mines<input id="board-mines" type="number" min="1" value="${settings.mines}" /></label><label>Cell scale<input id="board-scale" type="range" min="24" max="56" value="${settings.cellSize}" /><output id="board-scale-value">${settings.cellSize}px</output></label></div><button id="apply-settings" class="button full" type="button">Apply custom board</button></details></section><section class="panel telemetry-panel"><div class="panel-title"><span>Board telemetry</span><small>Live DOM</small></div><div class="metric-grid"><div><small>Opened</small><strong id="opened-count">0</strong></div><div><small>Flags</small><strong id="flagged-count">0</strong></div><div><small>Grid</small><strong id="dimension-count">—</strong></div></div></section><section class="panel decision-panel"><div class="panel-title"><span>Jev decision</span><small id="decision-state">Waiting</small></div><div class="decision-metrics"><div><small>Confidence</small><strong id="decision-confidence">—</strong></div><div><small>Latency</small><strong id="decision-latency">—</strong></div></div><div id="decision-options" class="decision-options"><p class="empty-state">Start Jev to see its proof-gated candidate distribution.</p></div><p id="decision-proof" class="decision-proof">The solver must first prove candidate actions before Jev receives a choice.</p></section><section class="panel safety-panel"><div class="panel-title"><span>Safety model</span><small>Verified</small></div><p>Jev ranks a closed set of solver-proven actions. It cannot select a hidden, unopened, or unproven move.</p></section></aside></main></section>`;
  const board = root.querySelector<HTMLElement>('#board-stage');
  const status = root.querySelector<HTMLElement>('#game-status');
  const opened = root.querySelector<HTMLElement>('#opened-count');
  const flagged = root.querySelector<HTMLElement>('#flagged-count');
  const dimensions = root.querySelector<HTMLElement>('#dimension-count');
  const event = root.querySelector<HTMLElement>('#last-event');
  const run = root.querySelector<HTMLElement>('#run-id');
  const width = root.querySelector<HTMLInputElement>('#board-width');
  const height = root.querySelector<HTMLInputElement>('#board-height');
  const mines = root.querySelector<HTMLInputElement>('#board-mines');
  const scale = root.querySelector<HTMLInputElement>('#board-scale');
  const scaleValue = root.querySelector<HTMLOutputElement>('#board-scale-value');
  if (!board || !status || !opened || !flagged || !dimensions || !event || !run || !width || !height || !mines || !scale || !scaleValue) throw new Error('dashboard initialization failed');
  return { board, status, opened, flagged, dimensions, event, run, width, height, mines, scale, scaleValue };
}

function settingsFromInputs(view: Dashboard): BoardSettings {
  const width = Math.min(30, Math.max(4, Number(view.width.value) || 12));
  const height = Math.min(24, Math.max(4, Number(view.height.value) || 12));
  const mines = Math.min(width * height - 1, Math.max(1, Number(view.mines.value) || 1));
  const cellSize = Math.min(56, Math.max(24, Number(view.scale.value) || 40));
  view.width.value = String(width);
  view.height.value = String(height);
  view.mines.value = String(mines);
  return { width, height, mines, cellSize };
}

export function bindLocalBoard(root: HTMLElement, initialGame: LocalGame, initialSettings: BoardSettings, newGame: (settings: BoardSettings) => LocalGame): void {
  let game = initialGame;
  let settings = initialSettings;
  let run = 1;
  const view = dashboard(root, settings);
  const render = () => {
    const board = toVisibleBoard(game);
    root.style.setProperty('--board-cell-size', `${settings.cellSize}px`);
    renderBoard(view.board, board, game.status);
    view.board.querySelector<HTMLElement>('#CellsBlock')!.dataset.seed = String(game.seed);
    view.status.textContent = game.status.toUpperCase();
    view.opened.textContent = String(board.cells.filter((cell) => cell.state === 'open').length);
    view.flagged.textContent = String(board.cells.filter((cell) => cell.state === 'flag').length);
    view.dimensions.textContent = `${board.width} × ${board.height}`;
    view.run.textContent = `RUN ${run}`;
    root.dataset.run = String(run);
  };
  const createNewBoard = (nextSettings: BoardSettings, message: string) => {
    settings = nextSettings;
    game = newGame(settings);
    run += 1;
    view.event.textContent = message;
    render();
  };
  root.addEventListener('contextmenu', (event) => event.preventDefault());
  root.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'board-scale') return;
    view.scaleValue.textContent = `${event.target.value}px`;
  });
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.id === 'fullscreen-game') {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void root.querySelector<HTMLElement>('.app-shell')?.requestFullscreen();
      return;
    }
    if (event.target.id === 'start-agent') {
      if (game.status !== 'ready') return;
      game = openCell(game, 0, 0);
      run += 1;
      view.event.textContent = 'Jev session started from the local safe opening.';
      render();
      return;
    }
    if (event.target.id === 'restart-game') {
      createNewBoard(settingsFromInputs(view), 'New random board ready. Press Start Jev when ready.');
      return;
    }
    if (event.target.id === 'apply-settings') {
      createNewBoard(settingsFromInputs(view), 'Custom random board ready. Press Start Jev when ready.');
      return;
    }
    const preset = event.target.dataset.preset;
    const presets: Record<string, BoardSettings> = { easy: { width: 9, height: 9, mines: 10, cellSize: 40 }, medium: { width: 12, height: 12, mines: 25, cellSize: 40 }, intermediate: { width: 16, height: 16, mines: 40, cellSize: 34 }, hard: { width: 20, height: 16, mines: 65, cellSize: 30 }, expert: { width: 30, height: 16, mines: 99, cellSize: 24 } };
    if (preset && presets[preset]) {
      const selected = presets[preset];
      view.width.value = String(selected.width);
      view.height.value = String(selected.height);
      view.mines.value = String(selected.mines);
      view.scale.value = String(selected.cellSize);
      view.scaleValue.textContent = `${selected.cellSize}px`;
      createNewBoard(selected, `${preset[0]!.toUpperCase()}${preset.slice(1)} random board ready. Press Start Jev when ready.`);
    }
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
