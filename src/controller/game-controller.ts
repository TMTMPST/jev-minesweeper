import type { BoardSnapshot, DecisionResult, MoveAction, StopReason } from '../domain/types';
import type { DecisionClient } from '../decision/decision-client';
import { inferCandidates } from '../domain/solver';
import { assertAction, assertDecisionIsCandidate } from './safety-gate';

export interface BoardAdapter {
  read(): Promise<BoardSnapshot>;
  perform(action: Exclude<MoveAction, { kind: 'STOP' }>): Promise<void>;
  waitForBoardChange(before: BoardSnapshot, timeoutMs: number): Promise<BoardSnapshot | null>;
}

function stop(reason: StopReason): DecisionResult {
  return { action: { kind: 'STOP', reason }, confidence: 0, source: 'mock' };
}

export class GameController {
  private failureDetail: string | undefined;

  constructor(private readonly adapter: BoardAdapter, private readonly client: DecisionClient) {}

  get lastFailureDetail(): string | undefined {
    return this.failureDetail;
  }
  async step(): Promise<DecisionResult> {
    let before: BoardSnapshot;
    try { before = await this.adapter.read(); } catch { return stop('INVALID_BOARD'); }
    if (before.phase !== 'playing') return stop('GAME_FINISHED');
    let candidates;
    try { candidates = inferCandidates(before.board); } catch { return stop('INVALID_BOARD'); }
    if (candidates.length === 0) return stop('NO_PROVEN_MOVE');
    let decision: DecisionResult;
    try {
      decision = await this.client.choose(before.board, candidates);
      assertDecisionIsCandidate(decision, candidates);
      assertAction(before.board, decision.action);
    } catch (error) {
      this.failureDetail = error instanceof Error ? error.message : 'unknown decision error';
      return stop('DECISION_FAILURE');
    }
    try {
      await this.adapter.perform(decision.action);
      if (!await this.adapter.waitForBoardChange(before, 2_000)) return stop('ACTION_UNCONFIRMED');
      return decision;
    } catch { return stop('ACTION_UNCONFIRMED'); }
  }
}
