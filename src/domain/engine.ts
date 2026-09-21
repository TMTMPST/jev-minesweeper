import { makeBoard, type VisibleBoard } from './types';

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';
export type GameCell = Readonly<{ mine: boolean; adjacent: number; opened: boolean; flagged: boolean }>;
export type LocalGame = Readonly<{ width: number; height: number; mines: number; seed: number; cells: readonly GameCell[]; firstMove: boolean; status: GameStatus }>;
export type GameConfig = Readonly<{ width: number; height: number; mines: number; seed: number }>;

const indexOf = (width: number, x: number, y: number) => y * width + x;
const inBounds = (game: Pick<LocalGame, 'width' | 'height'>, x: number, y: number) => x >= 0 && x < game.width && y >= 0 && y < game.height;

function neighbors(width: number, height: number, x: number, y: number): number[] {
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    if ((dx !== 0 || dy !== 0) && x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) result.push(indexOf(width, x + dx, y + dy));
  }
  return result;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function freezeGame(game: Omit<LocalGame, 'cells'> & { cells: readonly GameCell[] }): LocalGame {
  return Object.freeze({ ...game, cells: Object.freeze(game.cells.map((cell) => Object.freeze({ ...cell }))) });
}

function placeMines(game: LocalGame, x: number, y: number): LocalGame {
  const protectedCells = new Set<number>([indexOf(game.width, x, y), ...neighbors(game.width, game.height, x, y)]);
  const eligible = Array.from({ length: game.cells.length }, (_, index) => index).filter((index) => !protectedCells.has(index));
  const fallback = Array.from({ length: game.cells.length }, (_, index) => index).filter((index) => index !== indexOf(game.width, x, y));
  const pool = eligible.length >= game.mines ? eligible : fallback;
  if (pool.length < game.mines) throw new Error('too many mines');
  const next = game.cells.map((cell) => ({ ...cell, mine: false, adjacent: 0 }));
  const rng = random(game.seed);
  for (let remaining = game.mines; remaining > 0; remaining -= 1) {
    const choice = Math.floor(rng() * pool.length);
    const mineIndex = pool.splice(choice, 1)[0];
    if (mineIndex === undefined) throw new Error('mine placement failed');
    next[mineIndex]!.mine = true;
  }
  for (let cellIndex = 0; cellIndex < next.length; cellIndex += 1) {
    const cell = next[cellIndex]!;
    if (!cell.mine) cell.adjacent = neighbors(game.width, game.height, cellIndex % game.width, Math.floor(cellIndex / game.width)).filter((neighbor) => next[neighbor]!.mine).length;
  }
  return freezeGame({ ...game, cells: next, firstMove: false, status: 'playing' });
}

export function createGame(config: GameConfig): LocalGame {
  if (!Number.isInteger(config.width) || !Number.isInteger(config.height) || !Number.isInteger(config.mines) || config.width < 1 || config.height < 1 || config.mines < 0 || config.mines >= config.width * config.height) throw new Error('invalid game configuration');
  return freezeGame({ ...config, firstMove: true, status: 'ready', cells: Array.from({ length: config.width * config.height }, () => ({ mine: false, adjacent: 0, opened: false, flagged: false })) });
}

export function openCell(game: LocalGame, x: number, y: number): LocalGame {
  if (!inBounds(game, x, y) || game.status === 'won' || game.status === 'lost') return game;
  const target = game.cells[indexOf(game.width, x, y)]!;
  if (target.opened || target.flagged) return game;
  const initialized = game.firstMove ? placeMines(game, x, y) : game;
  const cells = initialized.cells.map((cell) => ({ ...cell }));
  const queue = [indexOf(initialized.width, x, y)];
  const queued = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    if (current === undefined) continue;
    const cell = cells[current]!;
    if (cell.opened || cell.flagged) continue;
    cell.opened = true;
    if (cell.mine) return freezeGame({ ...initialized, cells, status: 'lost' });
    if (cell.adjacent === 0) for (const neighbor of neighbors(initialized.width, initialized.height, current % initialized.width, Math.floor(current / initialized.width))) {
      if (!queued.has(neighbor) && !cells[neighbor]!.mine) { queued.add(neighbor); queue.push(neighbor); }
    }
  }
  const won = cells.every((cell) => cell.mine || cell.opened);
  return freezeGame({ ...initialized, cells, status: won ? 'won' : 'playing' });
}

export function toggleFlag(game: LocalGame, x: number, y: number): LocalGame {
  if (!inBounds(game, x, y) || game.status === 'won' || game.status === 'lost') return game;
  const index = indexOf(game.width, x, y);
  const cell = game.cells[index]!;
  if (cell.opened) return game;
  const cells = game.cells.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, flagged: !candidate.flagged } : { ...candidate });
  return freezeGame({ ...game, cells });
}

export function toVisibleBoard(game: LocalGame): VisibleBoard {
  return makeBoard(game.width, game.height, game.cells.map((cell, index) => ({ x: index % game.width, y: Math.floor(index / game.width), state: cell.opened ? 'open' as const : cell.flagged ? 'flag' as const : 'closed' as const, number: cell.opened ? cell.adjacent : null })));
}
