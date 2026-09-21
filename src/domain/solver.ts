import type { Candidate, VisibleBoard, VisibleCell } from './types';

function validate(board: VisibleBoard): void {
  for (const cell of board.cells) {
    if (cell.state === 'open' && (cell.number === null || cell.number < 0 || cell.number > 8)) throw new Error('invalid visible board');
    if (cell.state !== 'open' && cell.number !== null) throw new Error('invalid visible board');
  }
}

function neighbors(board: VisibleBoard, cell: VisibleCell): VisibleCell[] {
  return board.cells.filter((candidate) => Math.abs(candidate.x - cell.x) <= 1 && Math.abs(candidate.y - cell.y) <= 1 && (candidate.x !== cell.x || candidate.y !== cell.y));
}

export function inferCandidates(board: VisibleBoard): readonly Candidate[] {
  validate(board);
  const candidates = new Map<string, Candidate>();
  for (const cell of board.cells) {
    if (cell.state !== 'open' || cell.number === null) continue;
    const adjacent = neighbors(board, cell);
    const flags = adjacent.filter((candidate) => candidate.state === 'flag').length;
    const unknown = adjacent.filter((candidate) => candidate.state === 'closed');
    if (flags > cell.number) throw new Error('invalid visible board');
    if (cell.number === flags) for (const target of unknown) {
      const key = `OPEN:${target.x}:${target.y}`;
      if (!candidates.has(key)) candidates.set(key, { action: { kind: 'OPEN', x: target.x, y: target.y }, proof: `number ${cell.number} at ${cell.x},${cell.y} already has ${flags} adjacent flag` });
    }
    if (cell.number - flags === unknown.length && unknown.length > 0) for (const target of unknown) {
      const key = `FLAG:${target.x}:${target.y}`;
      if (!candidates.has(key)) candidates.set(key, { action: { kind: 'FLAG', x: target.x, y: target.y }, proof: `number ${cell.number} at ${cell.x},${cell.y} has ${cell.number - flags} remaining mine across ${unknown.length} closed neighbor` });
    }
  }
  return [...candidates.values()];
}

export function boardFinished(board: VisibleBoard): boolean {
  return board.cells.every((cell) => cell.state !== 'closed');
}
