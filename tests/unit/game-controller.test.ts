import { describe, expect, it, vi } from 'vitest';
import { GameController, type BoardAdapter } from '../../src/controller/game-controller';
import type { BoardSnapshot, DecisionResult } from '../../src/domain/types';
import type { DecisionClient } from '../../src/decision/decision-client';
import { makeBoard } from '../../src/domain/types';

const playing: BoardSnapshot = { phase: 'playing', board: makeBoard(2, 1, [{ x: 0, y: 0, state: 'open', number: 1 }, { x: 1, y: 0, state: 'closed', number: null }]) };
const adapter = (snapshot = playing): BoardAdapter & { perform: ReturnType<typeof vi.fn> } => ({ read: vi.fn().mockResolvedValue(snapshot), perform: vi.fn().mockResolvedValue(undefined), waitForBoardChange: vi.fn().mockResolvedValue(snapshot) });
const client = (result: DecisionResult): DecisionClient => ({ choose: vi.fn().mockResolvedValue(result) });
describe('controller', () => {
  it('does not act when there is no proven move', async () => { const board: BoardSnapshot = { phase: 'playing', board: makeBoard(1, 1, [{ x: 0, y: 0, state: 'closed', number: null }]) }; const fake = adapter(board); await expect(new GameController(fake, client({ action: { kind: 'OPEN', x: 0, y: 0 }, confidence: 1, source: 'mock' })).step()).resolves.toMatchObject({ action: { kind: 'STOP', reason: 'NO_PROVEN_MOVE' } }); expect(fake.perform).not.toHaveBeenCalled(); });
  it('stops before an action when Jev selects an unknown option', async () => { const fake = adapter(); await expect(new GameController(fake, client({ action: { kind: 'OPEN', x: 0, y: 9 }, confidence: 1, source: 'jev' })).step()).resolves.toMatchObject({ action: { kind: 'STOP', reason: 'DECISION_FAILURE' } }); expect(fake.perform).not.toHaveBeenCalled(); });
  it('stops when a permitted action is not observed', async () => { const fake = adapter(); fake.waitForBoardChange = vi.fn().mockResolvedValue(null); await expect(new GameController(fake, client({ action: { kind: 'FLAG', x: 1, y: 0 }, confidence: 1, source: 'mock' })).step()).resolves.toMatchObject({ action: { kind: 'STOP', reason: 'ACTION_UNCONFIRMED' } }); });
  it('uses calculated guesses only when the adapter explicitly enables them', async () => {
    const ambiguous: BoardSnapshot = { phase: 'playing', board: makeBoard(3, 1, [{ x: 0, y: 0, state: 'closed', number: null }, { x: 1, y: 0, state: 'open', number: 1 }, { x: 2, y: 0, state: 'closed', number: null }]) };
    const fake = Object.assign(adapter(ambiguous), { guessingEnabled: vi.fn().mockResolvedValue(true) });
    await expect(new GameController(fake, client({ action: { kind: 'OPEN', x: 0, y: 0 }, confidence: 0.5, source: 'mock' })).step()).resolves.toMatchObject({ action: { kind: 'OPEN', x: 0, y: 0 } });
    expect(fake.perform).toHaveBeenCalledWith({ kind: 'OPEN', x: 0, y: 0 });
  });
});
