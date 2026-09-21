import { describe, expect, it } from 'vitest';
import { createGame, openCell, toVisibleBoard, toggleFlag } from '../../src/domain/engine';

describe('local engine', () => {
  it('keeps the first opened cell mine-free and reveals its zero region', () => {
    const after = openCell(createGame({ width: 4, height: 4, mines: 2, seed: 7 }), 0, 0);
    expect(after.status).not.toBe('lost');
    expect(after.cells[0]?.mine).toBe(false);
    expect(toVisibleBoard(after).cells.filter((cell) => cell.state === 'open').length).toBeGreaterThan(1);
  });

  it('never opens a flagged cell', () => {
    const flagged = toggleFlag(createGame({ width: 3, height: 3, mines: 1, seed: 3 }), 1, 1);
    expect(openCell(flagged, 1, 1)).toEqual(flagged);
  });

  it('replays a seed deterministically', () => {
    const config = { width: 5, height: 5, mines: 4, seed: 22 };
    expect(openCell(createGame(config), 0, 0)).toEqual(openCell(createGame(config), 0, 0));
  });
});
