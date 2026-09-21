import { openCell, toVisibleBoard, toggleFlag, type LocalGame } from '../domain/engine';
import type { VisibleBoard } from '../domain/types';

export type BoardSettings = Readonly<{ width: number; height: number; mines: number; cellSize: number }>;

type Dashboard = Readonly<{ board: HTMLElement; status: HTMLElement; opened: HTMLElement; flagged: HTMLElement; dimensions: HTMLElement; event: HTMLElement; run: HTMLElement; fullscreen: HTMLButtonElement; guess: HTMLInputElement; guessStatus: HTMLElement; safetyText: HTMLElement; width: HTMLInputElement; height: HTMLInputElement; mines: HTMLInputElement; scale: HTMLInputElement; scaleValue: HTMLOutputElement }>;

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
  root.innerHTML = `<section class="app-shell"><header class="topbar"><a class="brand" href="/" aria-label="Jev Minesweeper home"><span class="brand-mark">J</span><span><b>JEV</b> MINESWEEPER<small>SAFE PLAY LAB</small></span></a><div class="topbar-status" aria-live="polite"><span class="status-dot"></span><span id="game-status">READY</span></div><div class="topbar-actions"><button id="fullscreen-game" class="button icon-button" type="button" aria-label="Enter fullscreen">Fullscreen</button><button id="restart-game" class="button ghost" type="button">New board</button><button id="start-agent" class="button primary" type="button">Start Jev</button></div></header><main class="workspace"><section class="game-column"><div class="game-card"><div class="card-head"><div><span class="kicker">LOCAL MINESWEEPER</span><h1>Clear every safe square.</h1><p>Jev acts only on moves proven by the solver.</p></div><div class="run-stack"><span id="run-id" class="run-badge">RUN 1</span><span class="run-note">No guessing</span></div></div><div class="board-toolbar"><span><i></i> Left click to open</span><span><i></i> Right click to flag</span><span class="board-grid-label" id="dimension-count">—</span></div><div id="board-stage" tabindex="0"></div><footer class="board-footer"><span id="last-event" aria-live="polite">New random board ready.</span><span>Use Fullscreen for a dedicated board view.</span></footer></div></section><aside class="inspector"><section class="panel setup-panel"><div class="panel-title"><span>Board setup</span><small>new random seed</small></div><div class="difficulty-grid"><button data-preset="easy" type="button"><b>Easy</b><small>9 × 9 · 10 mines</small></button><button data-preset="medium" type="button"><b>Medium</b><small>12 × 12 · 25 mines</small></button><button data-preset="intermediate" type="button"><b>Intermediate</b><small>16 × 16 · 40 mines</small></button><button data-preset="hard" type="button"><b>Hard</b><small>20 × 16 · 65 mines</small></button><button data-preset="expert" class="expert-preset" type="button"><b>Expert</b><small>30 × 16 · 99 mines</small></button></div><details><summary>Custom board</summary><div class="custom-grid"><label>Width<input id="board-width" type="number" min="4" max="30" value="${settings.width}" /></label><label>Height<input id="board-height" type="number" min="4" max="24" value="${settings.height}" /></label><label>Mines<input id="board-mines" type="number" min="1" value="${settings.mines}" /></label><label>Cell scale<input id="board-scale" type="range" min="20" max="56" value="${settings.cellSize}" /><output id="board-scale-value">${settings.cellSize}px</output></label></div><button id="apply-settings" class="button full" type="button">Create custom board</button></details></section><section class="panel telemetry-panel"><div class="panel-title"><span>Board status</span><small>visible state</small></div><div class="metric-grid"><div><small>Opened</small><strong id="opened-count">0</strong></div><div><small>Flags</small><strong id="flagged-count">0</strong></div><div><small>Grid</small><strong id="dimension-count-side">—</strong></div></div></section><section class="panel decision-panel"><div class="panel-title"><span>Jev thinking</span><small id="decision-state">Waiting for board</small></div><div class="decision-metrics"><div><small>Safe actions</small><strong id="decision-moves">0</strong></div><div><small>Proofs checked</small><strong id="decision-verified">0</strong></div><div><small>Options seen</small><strong id="decision-candidate-count">0</strong></div><div><small>Average latency</small><strong id="decision-average-latency">—</strong></div></div><div class="current-decision"><span>Current decision</span><strong id="decision-confidence">—</strong><small id="decision-latency">No request yet</small></div><div id="decision-options" class="decision-options"><p class="empty-state">Start Jev to see the solver-proofed actions it can choose from.</p></div><p id="decision-proof" class="decision-proof">Every candidate is validated before Jev can rank it.</p></section><section class="panel safety-panel"><div class="panel-title"><span>Safety boundary</span><small>enforced</small></div><p>When deterministic inference cannot prove a move, Jev stops. Make a manual move or begin a new board—no hidden guess is taken.</p></section></aside></main></section>`;
  const setup = root.querySelector<HTMLElement>('.setup-panel');
  const guessMode = document.createElement('label');
  guessMode.className = 'guess-mode';
  const guess = document.createElement('input');
  guess.id = 'guess-mode';
  guess.type = 'checkbox';
  const guessText = document.createElement('span');
  const guessTitle = document.createElement('b');
  guessTitle.textContent = 'Calculated guesses';
  const guessDescription = document.createElement('small');
  guessDescription.textContent = 'Allow Jev to open lowest-risk cells when proof runs out.';
  guessText.append(guessTitle, guessDescription);
  guessMode.append(guess, guessText);
  if (!setup) throw new Error('dashboard initialization failed');
  setup.append(guessMode);
  const board = root.querySelector<HTMLElement>('#board-stage');
  const status = root.querySelector<HTMLElement>('#game-status');
  const opened = root.querySelector<HTMLElement>('#opened-count');
  const flagged = root.querySelector<HTMLElement>('#flagged-count');
  const dimensions = root.querySelector<HTMLElement>('#dimension-count');
  const event = root.querySelector<HTMLElement>('#last-event');
  const run = root.querySelector<HTMLElement>('#run-id');
  const fullscreen = root.querySelector<HTMLButtonElement>('#fullscreen-game');
  const guessStatus = root.querySelector<HTMLElement>('.run-note');
  const safetyText = root.querySelector<HTMLElement>('.safety-panel p');
  const width = root.querySelector<HTMLInputElement>('#board-width');
  const height = root.querySelector<HTMLInputElement>('#board-height');
  const mines = root.querySelector<HTMLInputElement>('#board-mines');
  const scale = root.querySelector<HTMLInputElement>('#board-scale');
  const scaleValue = root.querySelector<HTMLOutputElement>('#board-scale-value');
  if (!board || !status || !opened || !flagged || !dimensions || !event || !run || !fullscreen || !guessStatus || !safetyText || !width || !height || !mines || !scale || !scaleValue) throw new Error('dashboard initialization failed');
  return { board, status, opened, flagged, dimensions, event, run, fullscreen, guess, guessStatus, safetyText, width, height, mines, scale, scaleValue };
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
  let revision = 0;
  const view = dashboard(root, settings);
  const render = () => {
    const board = toVisibleBoard(game);
    root.style.setProperty('--board-cell-size', `${settings.cellSize}px`);
    renderBoard(view.board, board, game.status);
    view.board.querySelector<HTMLElement>('#CellsBlock')!.dataset.seed = String(game.seed);
    view.status.textContent = game.status.toUpperCase();
    view.status.dataset.state = game.status;
    view.opened.textContent = String(board.cells.filter((cell) => cell.state === 'open').length);
    view.flagged.textContent = String(board.cells.filter((cell) => cell.state === 'flag').length);
    view.dimensions.textContent = `${board.width} × ${board.height}`;
    root.querySelector<HTMLElement>('#dimension-count-side')!.textContent = `${board.width} × ${board.height}`;
    view.run.textContent = `RUN ${run}`;
    root.dataset.run = String(run);
    root.dataset.guessMode = view.guess.checked ? 'enabled' : 'disabled';
    root.dataset.boardRevision = String(++revision);
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
  root.addEventListener('change', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'guess-mode') return;
    root.dataset.guessMode = event.target.checked ? 'enabled' : 'disabled';
    view.guessStatus.textContent = event.target.checked ? 'Risk enabled' : 'No guessing';
    view.safetyText.textContent = event.target.checked ? 'Calculated guesses are enabled for this local board. Jev may open only the tied lowest-risk cells from bounded constraint enumeration; losses remain possible.' : 'When deterministic inference cannot prove a move, Jev stops. Make a manual move or begin a new board—no hidden guess is taken.';
    view.event.textContent = event.target.checked ? 'Calculated guesses enabled. Jev may open a lowest-risk cell when no move is proven.' : 'Calculated guesses disabled. Jev will stop before any unproven move.';
    root.dataset.boardRevision = String(++revision);
  });
  root.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.id === 'fullscreen-game') {
      const fullscreen = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      void fullscreen.catch(() => { view.event.textContent = 'Fullscreen is unavailable in this browser context.'; });
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
  document.addEventListener('fullscreenchange', () => {
    const active = document.fullscreenElement !== null;
    view.fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    view.fullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  });
  render();
}
