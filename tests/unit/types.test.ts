import { describe, expect, it } from 'vitest';
import { makeBoard, type MoveAction } from '../../src/domain/types';

describe('board contract', () => {
  it('creates an immutable rectangular visible board', () => {
    const board = makeBoard(2, 1, [{ x: 0, y: 0, state: 'open', number: 1 }, { x: 1, y: 0, state: 'closed', number: null }]);
    expect(board.width).toBe(2);
    expect(board.cells[0]?.state).toBe('open');
    const action: MoveAction = { kind: 'OPEN', x: 1, y: 0 };
    expect(action).toEqual({ kind: 'OPEN', x: 1, y: 0 });
    expect(Object.isFrozen(board.cells)).toBe(true);
  });
});
