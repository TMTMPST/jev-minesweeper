// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { makeBoard } from '../../src/domain/types';
import { renderBoard } from '../../src/web/board-view';

describe('board renderer', () => {
  let root: HTMLElement;
  beforeEach(() => { root = document.createElement('div'); });
  it('renders coordinate-addressable closed, opened, and flagged cells', () => {
    renderBoard(root, makeBoard(2, 1, [{ x: 0, y: 0, state: 'open', number: 2 }, { x: 1, y: 0, state: 'flag', number: null }]), 'playing');
    expect(root.querySelector('#cell_0_0')?.className).toContain('opened');
    expect(root.querySelector('#cell_0_0')?.className).toContain('type2');
    expect(root.querySelector('#cell_1_0')?.getAttribute('data-y')).toBe('0');
    expect(root.querySelector('#cell_1_0')?.className).toContain('flag');
  });
});
