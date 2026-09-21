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

export function inferGuessCandidates(board: VisibleBoard): readonly Candidate[] {
  validate(board);
  const byCoordinate = new Map(board.cells.map((cell) => [key(cell), cell]));
  const constraints: Constraint[] = [];
  for (const source of board.cells) {
    if (source.state !== 'open' || source.number === null) continue;
    const adjacent = neighbors(byCoordinate, source);
    const flags = adjacent.filter((cell) => cell.state === 'flag').length;
    const unknown = adjacent.filter((cell) => cell.state === 'closed');
    const remainingMines = source.number - flags;
    if (remainingMines < 0 || remainingMines > unknown.length) throw new Error('invalid visible board');
    if (unknown.length > 0) constraints.push({ source, unknown, remainingMines });
  }
  const explored = new Set<Constraint>();
  const risks = new Map<string, { cell: VisibleCell; mineRisk: number; assignments: number }>();
  for (const root of constraints) {
    if (explored.has(root)) continue;
    const component: Constraint[] = [];
    const variables = new Map<string, VisibleCell>();
    const pending = [root];
    explored.add(root);
    while (pending.length > 0) {
      const current = pending.pop()!;
      component.push(current);
      for (const cell of current.unknown) variables.set(key(cell), cell);
      for (const candidate of constraints) {
        if (explored.has(candidate) || !candidate.unknown.some((cell) => variables.has(key(cell)))) continue;
        explored.add(candidate);
        pending.push(candidate);
      }
    }
    const cells = [...variables.values()];
    if (cells.length > 18) continue;
    const indexByCell = new Map(cells.map((cell, index) => [key(cell), index]));
    const mineCounts = new Array<number>(cells.length).fill(0);
    let assignments = 0;
    for (let assignment = 0; assignment < 2 ** cells.length; assignment += 1) {
      let valid = true;
      for (const constraint of component) {
        let mines = 0;
        for (const cell of constraint.unknown) {
          const index = indexByCell.get(key(cell));
          if (index === undefined) throw new Error('invalid visible board');
          if ((assignment & (1 << index)) !== 0) mines += 1;
        }
        if (mines !== constraint.remainingMines) { valid = false; break; }
      }
      if (!valid) continue;
      assignments += 1;
      for (let index = 0; index < cells.length; index += 1) if ((assignment & (1 << index)) !== 0) mineCounts[index]! += 1;
    }
    if (assignments === 0) throw new Error('invalid visible board');
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index]!;
      risks.set(key(cell), { cell, mineRisk: mineCounts[index]! / assignments, assignments });
    }
  }
  const lowestRisk = Math.min(...[...risks.values()].map((risk) => risk.mineRisk).filter((risk) => risk > 0 && risk < 1));
  if (!Number.isFinite(lowestRisk)) return [];
  return [...risks.values()]
    .filter((risk) => Math.abs(risk.mineRisk - lowestRisk) < 1e-12)
    .map((risk) => ({
      action: { kind: 'OPEN', x: risk.cell.x, y: risk.cell.y },
      mineRisk: risk.mineRisk,
      proof: `calculated guess: ${(risk.mineRisk * 100).toFixed(1)}% mine risk across ${risk.assignments} constraint-consistent assignments`,
    }));
}

export function boardFinished(board: VisibleBoard): boolean {
  return board.cells.every((cell) => cell.state !== 'closed');
}
