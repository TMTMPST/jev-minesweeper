import type { Candidate, VisibleBoard, VisibleCell } from './types';

type Constraint = Readonly<{ source: VisibleCell; unknown: readonly VisibleCell[]; remainingMines: number }>;

function validate(board: VisibleBoard): void {
  for (const cell of board.cells) {
    if (cell.state === 'open' && (cell.number === null || cell.number < 0 || cell.number > 8)) throw new Error('invalid visible board');
    if (cell.state !== 'open' && cell.number !== null) throw new Error('invalid visible board');
  }
}

function key(cell: Pick<VisibleCell, 'x' | 'y'>): string {
  return `${cell.x}:${cell.y}`;
}

function neighbors(byCoordinate: ReadonlyMap<string, VisibleCell>, cell: VisibleCell): VisibleCell[] {
  const result: VisibleCell[] = [];
  for (let y = cell.y - 1; y <= cell.y + 1; y += 1) for (let x = cell.x - 1; x <= cell.x + 1; x += 1) {
    if (x !== cell.x || y !== cell.y) {
      const neighbor = byCoordinate.get(`${x}:${y}`);
      if (neighbor) result.push(neighbor);
    }
  }
  return result;
}

function isSubset(smaller: readonly VisibleCell[], larger: readonly VisibleCell[]): boolean {
  if (smaller.length >= larger.length) return false;
  const largerKeys = new Set(larger.map(key));
  return smaller.every((cell) => largerKeys.has(key(cell)));
}

function difference(larger: readonly VisibleCell[], smaller: readonly VisibleCell[]): VisibleCell[] {
  const smallerKeys = new Set(smaller.map(key));
  return larger.filter((cell) => !smallerKeys.has(key(cell)));
}

export function inferCandidates(board: VisibleBoard): readonly Candidate[] {
  validate(board);
  const byCoordinate = new Map(board.cells.map((cell) => [key(cell), cell]));
  const candidates = new Map<string, Candidate>();
  const actionByTarget = new Map<string, 'OPEN' | 'FLAG'>();
  const add = (kind: 'OPEN' | 'FLAG', target: VisibleCell, proof: string) => {
    const targetKey = key(target);
    const existing = actionByTarget.get(targetKey);
    if (existing && existing !== kind) throw new Error('invalid visible board');
    actionByTarget.set(targetKey, kind);
    const candidateKey = `${kind}:${targetKey}`;
    if (!candidates.has(candidateKey)) candidates.set(candidateKey, { action: { kind, x: target.x, y: target.y }, proof });
  };
  const constraints: Constraint[] = [];

  for (const cell of board.cells) {
    if (cell.state !== 'open' || cell.number === null) continue;
    const adjacent = neighbors(byCoordinate, cell);
    const flags = adjacent.filter((candidate) => candidate.state === 'flag').length;
    const unknown = adjacent.filter((candidate) => candidate.state === 'closed');
    const remainingMines = cell.number - flags;
    if (remainingMines < 0 || remainingMines > unknown.length) throw new Error('invalid visible board');
    const constraint = { source: cell, unknown, remainingMines };
    constraints.push(constraint);
    if (remainingMines === 0) for (const target of unknown) add('OPEN', target, `number ${cell.number} at ${cell.x},${cell.y} already has ${flags} adjacent flag`);
    if (remainingMines === unknown.length && unknown.length > 0) for (const target of unknown) add('FLAG', target, `number ${cell.number} at ${cell.x},${cell.y} has ${remainingMines} remaining mine across ${unknown.length} closed neighbor`);
  }

  for (const smaller of constraints) for (const larger of constraints) {
    if (!isSubset(smaller.unknown, larger.unknown)) continue;
    const delta = difference(larger.unknown, smaller.unknown);
    const mineDelta = larger.remainingMines - smaller.remainingMines;
    if (mineDelta < 0 || mineDelta > delta.length) throw new Error('invalid visible board');
    if (mineDelta === 0) for (const target of delta) add('OPEN', target, `constraint at ${smaller.source.x},${smaller.source.y} is contained by ${larger.source.x},${larger.source.y}; remaining mines are unchanged`);
    if (mineDelta === delta.length) for (const target of delta) add('FLAG', target, `constraint at ${smaller.source.x},${smaller.source.y} is contained by ${larger.source.x},${larger.source.y}; every added neighbor is a mine`);
  }
  return [...candidates.values()];
}

export function boardFinished(board: VisibleBoard): boolean {
  return board.cells.every((cell) => cell.state !== 'closed');
}
