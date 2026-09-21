import type { Candidate, DecisionProbability, DecisionResult, VisibleBoard } from '../domain/types';
import { actionForOption, encodeOption, normaliseBoard, type DecisionClient } from './decision-client';

export class HttpJevDecisionClient implements DecisionClient {
  constructor(private readonly url = process.env.JEV_API_URL, private readonly key = process.env.JEV_API_KEY) {
    if (!url || !key) throw new Error('JEV_API_URL and JEV_API_KEY are required');
  }

  async choose(board: VisibleBoard, candidates: readonly Candidate[]): Promise<DecisionResult> {
    const startedAt = performance.now();
    const options = candidates.map(encodeOption);
    const criteria = Object.fromEntries(candidates.map((candidate) => [encodeOption(candidate), candidate.proof]));
    let response: Response;
    try {
      response = await fetch(this.url!, { method: 'POST', signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${this.key!}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ state: normaliseBoard(board), model: 'jev-latest', questions: { next_move: { type: 'choice', instructions: 'Select exactly one candidate move. Every listed move is already proven safe or proven mine by deterministic constraint inference.', criteria } } }) });
    } catch {
      throw new Error('Jev request failed');
    }
    if (!response.ok) throw new Error(`Jev request failed: ${response.status}`);
    const body: unknown = await response.json().catch(() => { throw new Error('invalid Jev response'); });
    if (!body || typeof body !== 'object') throw new Error('invalid Jev response');
    let answer: unknown;
    if ('next_move' in body) answer = body.next_move;
    else if ('answers' in body && body.answers && typeof body.answers === 'object' && 'next_move' in body.answers) answer = body.answers.next_move;
    else throw new Error('invalid Jev response');
    if (!answer || typeof answer !== 'object' || !('choice' in answer) || !('confidence' in answer)) throw new Error('invalid Jev response');
    const option = answer.choice;
    const confidence = answer.confidence;
    if (typeof option !== 'string' || typeof confidence !== 'number' || confidence < 0 || confidence > 1) throw new Error('invalid Jev response');
    if (!options.includes(option)) throw new Error('unknown Jev option');
    let probabilities: readonly DecisionProbability[] | undefined;
    if ('probabilities' in answer && answer.probabilities !== undefined) {
      if (!answer.probabilities || typeof answer.probabilities !== 'object' || Array.isArray(answer.probabilities)) throw new Error('invalid Jev response');
      probabilities = Object.entries(answer.probabilities).map(([candidate, probability]) => {
        if (!options.includes(candidate) || typeof probability !== 'number' || probability < 0 || probability > 1) throw new Error('invalid Jev response');
        return { option: candidate, probability };
      });
    }
    return { action: actionForOption(option), confidence, source: 'jev', ...(probabilities ? { probabilities } : {}), latencyMs: Math.round(performance.now() - startedAt) };
  }
}
