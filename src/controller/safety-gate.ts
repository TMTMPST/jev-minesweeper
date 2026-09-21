import type { Candidate, DecisionResult, MoveAction, VisibleBoard } from '../domain/types';

const forbidden = /account|arena|duel|lobby|rank|leaderboard|market|shop|payment|invoice|event/i;

export function assertSafeDemoRoute(url: string): void {
  const parsed = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) throw new Error('not local');
}

export function assertSafeLiveRoute(url: string): void {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://minesweeper.online' || forbidden.test(`${parsed.pathname}${parsed.search}`)) throw new Error('unsafe route');
}

export function assertDecisionIsCandidate(decision: DecisionResult, candidates: readonly Candidate[]): asserts decision is DecisionResult & { action: Exclude<MoveAction, { kind: 'STOP' }> } {
  if (decision.action.kind === 'STOP' || !candidates.some((candidate) => candidate.action.kind === decision.action.kind && candidate.action.x === decision.action.x && candidate.action.y === decision.action.y)) throw new Error('decision is not an offered candidate');
}

export function assertAction(board: VisibleBoard, action: Exclude<MoveAction, { kind: 'STOP' }>): void {
  const target = board.cells.find((cell) => cell.x === action.x && cell.y === action.y);
  if (!target || target.state !== 'closed') throw new Error('illegal action');
}
