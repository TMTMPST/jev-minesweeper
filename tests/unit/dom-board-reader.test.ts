import { describe, expect, it } from 'vitest';
import { parseCell, parseVisibleBoard } from '../../src/browser/dom-board-reader';

describe('DOM board reader', () => {
  it('parses a numbered opened cell', () => expect(parseCell({ id: 'cell_2_3', x: '2', y: '3', className: 'cell opened type4' })).toEqual({ x: 2, y: 3, state: 'open', number: 4 }));
  it('rejects conflicting state and number classes', () => expect(() => parseCell({ id: 'cell_0_0', x: '0', y: '0', className: 'cell opened flag type2 type3' })).toThrow('invalid cell contract'));
  it('requires a full coordinate rectangle', () => expect(() => parseVisibleBoard([{ id: 'cell_0_0', x: '0', y: '0', className: 'cell closed' }, { id: 'cell_2_0', x: '2', y: '0', className: 'cell closed' }])).toThrow('VisibleBoard'));
});
