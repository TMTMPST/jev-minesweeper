import type { Page } from '@playwright/test';
import { makeBoard, type BoardSnapshot, type GamePhase, type VisibleBoard, type VisibleCell } from '../domain/types';

type RawCell = Readonly<{ id: string; x: string | undefined; y: string | undefined; className: string }>;

export function parseCell(raw: RawCell): VisibleCell {
  const x = Number(raw.x);
  const y = Number(raw.y);
  const classes = raw.className.split(/\s+/).filter(Boolean);
  const states = classes.filter((name) => name === 'opened' || name === 'closed');
  const types = classes.filter((name) => /^type[0-8]$/.test(name));
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || states.length !== 1 || types.length > 1) throw new Error('invalid cell contract');
  const open = states[0] === 'opened';
  const flag = classes.includes('flag');
  if ((open && flag) || (open && types.length !== 1) || (!open && types.length !== 0)) throw new Error('invalid cell contract');
  return { x, y, state: flag ? 'flag' : open ? 'open' : 'closed', number: open ? Number(types[0]!.slice(4)) : null };
}

export function parseVisibleBoard(rawCells: readonly RawCell[]): VisibleBoard {
  if (rawCells.length === 0) throw new Error('invalid cell contract');
  const cells = rawCells.map(parseCell);
  const width = Math.max(...cells.map((cell) => cell.x)) + 1;
  const height = Math.max(...cells.map((cell) => cell.y)) + 1;
  return makeBoard(width, height, cells);
}

export async function readVisibleBoard(page: Page): Promise<BoardSnapshot> {
  const root = page.locator('#CellsBlock');
  const [rawCells, phase] = await Promise.all([
    root.locator('.cell').evaluateAll((nodes) => nodes.map((node) => ({ id: node.id, x: node.getAttribute('data-x') ?? undefined, y: node.getAttribute('data-y') ?? undefined, className: node.className }))),
    root.getAttribute('data-game-status'),
  ]);
  if (phase !== 'ready' && phase !== 'playing' && phase !== 'won' && phase !== 'lost') throw new Error('invalid board status');
  return { board: parseVisibleBoard(rawCells), phase: phase as GamePhase };
}
