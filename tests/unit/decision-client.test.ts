import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeBoard, type Candidate } from '../../src/domain/types';
import { MockDecisionClient } from '../../src/decision/mock-decision-client';
import { HttpJevDecisionClient } from '../../src/decision/http-jev-client';

const board = makeBoard(1, 1, [{ x: 0, y: 0, state: 'closed', number: null }]);
const candidates: Candidate[] = [{ action: { kind: 'OPEN', x: 0, y: 0 }, proof: 'test' }];
afterEach(() => vi.unstubAllGlobals());
describe('decision clients', () => {
  it('uses a deterministic offline winner from an allowed candidate set', async () => { const result = await new MockDecisionClient().choose(board, candidates); expect(candidates.map((candidate) => candidate.action)).toContainEqual(result.action); expect(result.source).toBe('mock'); });
  it('rejects a remote choice that is not an offered option', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ next_move: { choice: 'FLAG:9:9', confidence: 1 } }), { status: 200 }))); await expect(new HttpJevDecisionClient('https://jev.test', 'key').choose(board, candidates)).rejects.toThrow('unknown Jev option'); });
  it('sends the TypeSafe choice schema', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ next_move: { choice: 'OPEN:0:0', confidence: 0.9 } }), { status: 200 }));
    vi.stubGlobal('fetch', request);
    await expect(new HttpJevDecisionClient('https://jev.test', 'key').choose(board, candidates)).resolves.toMatchObject({ source: 'jev', action: { kind: 'OPEN' } });
    const [, init] = request.mock.calls[0] ?? [];
    if (!init || typeof init !== 'object' || !('body' in init)) throw new Error('missing request body');
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'jev-latest', questions: { next_move: { type: 'choice', criteria: { 'OPEN:0:0': 'test' } } } });
  });
  it('returns the standard answers envelope probability distribution', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ answers: { next_move: { choice: 'OPEN:0:0', confidence: 0.9, probabilities: { 'OPEN:0:0': 0.9 } } } }), { status: 200 }))); await expect(new HttpJevDecisionClient('https://jev.test', 'key').choose(board, candidates)).resolves.toMatchObject({ source: 'jev', action: { kind: 'OPEN' }, probabilities: [{ option: 'OPEN:0:0', probability: 0.9 }] }); });
});
