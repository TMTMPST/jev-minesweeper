import type { Candidate, DecisionResult, VisibleBoard } from '../domain/types';
import { actionForOption, encodeOption, normaliseBoard, type DecisionClient } from './decision-client';

export class HttpJevDecisionClient implements DecisionClient {
  constructor(private readonly url = process.env.JEV_API_URL, private readonly key = process.env.JEV_API_KEY) {
    if (!url || !key) throw new Error('JEV_API_URL and JEV_API_KEY are required');
  }

  async choose(board: VisibleBoard, candidates: readonly Candidate[]): Promise<DecisionResult> {
    const options = candidates.map(encodeOption);
    let response: Response;
    try {
      response = await fetch(this.url!, { method: 'POST', signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${this.key!}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ state: normaliseBoard(board), questions: { next_move: { type: 'choice', options } } }) });
    } catch {
      throw new Error('Jev request failed');
    }
    if (!response.ok) throw new Error(`Jev request failed: ${response.status}`);
    const body: unknown = await response.json().catch(() => { throw new Error('invalid Jev response'); });
    if (!body || typeof body !== 'object' || !('next_move' in body)) throw new Error('invalid Jev response');
    const answer = body.next_move;
    if (!answer || typeof answer !== 'object' || !('choice' in answer) || !('confidence' in answer)) throw new Error('invalid Jev response');
    const option = answer.choice;
    const confidence = answer.confidence;
    if (typeof option !== 'string' || typeof confidence !== 'number' || confidence < 0 || confidence > 1) throw new Error('invalid Jev response');
    if (!options.includes(option)) throw new Error('unknown Jev option');
    return { action: actionForOption(option), confidence, source: 'jev' };
  }
}
