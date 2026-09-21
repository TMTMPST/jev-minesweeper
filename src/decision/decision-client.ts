import type { Candidate, DecisionResult, VisibleBoard } from '../domain/types';

export interface DecisionClient {
  choose(board: VisibleBoard, candidates: readonly Candidate[]): Promise<DecisionResult>;
}

export function encodeOption(candidate: Candidate): string {
  return `${candidate.action.kind}:${candidate.action.x}:${candidate.action.y}`;
}

export function normaliseBoard(board: VisibleBoard): string {
  return `${board.width}x${board.height}|${board.cells.map((cell) => `${cell.x},${cell.y},${cell.state},${cell.number}`).join(';')}`;
}

export function actionForOption(option: string): DecisionResult['action'] {
  const match = /^(OPEN|FLAG):(\d+):(\d+)$/.exec(option);
  if (!match) throw new Error('unknown Jev option');
  return { kind: match[1] as 'OPEN' | 'FLAG', x: Number(match[2]), y: Number(match[3]) };
}
