import type { BoardSnapshot, Candidate, DecisionResult, MoveAction, StopReason } from '../domain/types';
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
  private selectedCandidate: Candidate | undefined;
  private offeredCandidates: readonly Candidate[] = [];

  constructor(private readonly adapter: BoardAdapter, private readonly client: DecisionClient) {}

  get lastFailureDetail(): string | undefined {
    return this.failureDetail;
  }

  get lastSelectedCandidate(): Candidate | undefined {
    return this.selectedCandidate;
  }

  get lastOfferedCandidates(): readonly Candidate[] {
    return this.offeredCandidates;
  }
  async step(): Promise<DecisionResult> {
    let before: BoardSnapshot;
    try { before = await this.adapter.read(); } catch { return stop('INVALID_BOARD'); }
    if (before.phase !== 'playing') return stop('GAME_FINISHED');
    this.selectedCandidate = undefined;
    this.offeredCandidates = [];
    let candidates;
    try { candidates = inferCandidates(before.board); } catch { return stop('INVALID_BOARD'); }
    this.offeredCandidates = candidates;
    if (candidates.length === 0) return stop('NO_PROVEN_MOVE');
    let decision: DecisionResult;
    try {
      decision = await this.client.choose(before.board, candidates);
      assertDecisionIsCandidate(decision, candidates);
      assertAction(before.board, decision.action);
      this.selectedCandidate = candidates.find((candidate) => candidate.action.kind === decision.action.kind && candidate.action.x === decision.action.x && candidate.action.y === decision.action.y);
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
