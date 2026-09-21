import { describe, expect, it } from 'vitest';
import { makeBoard, type VisibleCell } from '../../src/domain/types';
import { inferCandidates, inferGuessCandidates } from '../../src/domain/solver';

const boardFromRows = (rows: string[][]) => makeBoard(rows[0]!.length, rows.length, rows.flatMap((row, y) => row.map((value, x): VisibleCell => value === '?' ? { x, y, state: 'closed', number: null } : value === 'F' ? { x, y, state: 'flag', number: null } : { x, y, state: 'open', number: Number(value) })));

describe('constraint solver', () => {
  it('opens every adjacent closed cell when a number already has all needed flags', () => expect(inferCandidates(boardFromRows([['F', '1', '?']]))).toContainEqual({ action: { kind: 'OPEN', x: 2, y: 0 }, proof: 'number 1 at 1,0 already has 1 adjacent flag' }));
  it('flags every adjacent closed cell when they exactly fill a number remainder', () => expect(inferCandidates(boardFromRows([['?', '1']]))).toContainEqual({ action: { kind: 'FLAG', x: 0, y: 0 }, proof: 'number 1 at 1,0 has 1 remaining mine across 1 closed neighbor' }));
  it('never guesses ambiguous frontiers', () => expect(inferCandidates(boardFromRows([['?', '1', '?']]))).toEqual([]));
  it('rejects contradictory flags', () => expect(() => inferCandidates(boardFromRows([['F', '0']]))).toThrow('invalid visible board'));
  it('opens cells introduced by a superset constraint with the same mine remainder', () => {
    const candidates = inferCandidates(boardFromRows([['F', '?', '?', '?'], ['F', '5', '2', '?'], ['F', '?', '?', '?']]));
    expect(candidates).toContainEqual(expect.objectContaining({ action: { kind: 'OPEN', x: 3, y: 0 } }));
    expect(candidates).toContainEqual(expect.objectContaining({ action: { kind: 'OPEN', x: 3, y: 1 } }));
    expect(candidates).toContainEqual(expect.objectContaining({ action: { kind: 'OPEN', x: 3, y: 2 } }));
  });
  it('flags cells introduced by a superset constraint when they account for every additional mine', () => {
    const candidates = inferCandidates(boardFromRows([['F', '?', '?', '?'], ['F', '4', '4', '?'], ['F', '?', '?', '?']]));
    expect(candidates).toContainEqual(expect.objectContaining({ action: { kind: 'FLAG', x: 3, y: 0 } }));
    expect(candidates).toContainEqual(expect.objectContaining({ action: { kind: 'FLAG', x: 3, y:1 } }));
    expect(candidates).toContainEqual(expect.objectContaining({ action: { kind: 'FLAG', x: 3, y: 2 } }));
  });
  it('offers every equal-risk cell in an ambiguous frontier only when guess inference is requested', () => {
    const board = boardFromRows([['?', '1', '?']]);
    expect(inferCandidates(board)).toEqual([]);
    expect(inferGuessCandidates(board)).toEqual([
      expect.objectContaining({ action: { kind: 'OPEN', x: 0, y: 0 }, mineRisk: 0.5 }),
      expect.objectContaining({ action: { kind: 'OPEN', x: 2, y: 0 }, mineRisk: 0.5 }),
    ]);
  });
});
