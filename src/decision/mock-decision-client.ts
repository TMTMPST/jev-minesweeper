import type { Candidate, DecisionResult, VisibleBoard } from '../domain/types';
import type { DecisionClient } from './decision-client';

export class MockDecisionClient implements DecisionClient {
  async choose(_board: VisibleBoard, candidates: readonly Candidate[]): Promise<DecisionResult> {
    const winner = [...candidates].sort((left, right) => (left.action.kind === right.action.kind ? left.action.y - right.action.y || left.action.x - right.action.x : left.action.kind === 'FLAG' ? -1 : 1))[0];
    if (!winner) throw new Error('no candidate');
    return { action: winner.action, confidence: 1, source: 'mock', probabilities: candidates.map((candidate) => ({ option: `${candidate.action.kind}:${candidate.action.x}:${candidate.action.y}`, probability: candidate === winner ? 1 : 0 })), latencyMs: 0 };
  }
}
