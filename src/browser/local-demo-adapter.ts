import type { Page } from '@playwright/test';
import type { BoardSnapshot, MoveAction } from '../domain/types';
import { readVisibleBoard } from './dom-board-reader';
import { assertSafeDemoRoute } from '../controller/safety-gate';

function serialise(snapshot: BoardSnapshot): string {
  return `${snapshot.phase}|${snapshot.board.cells.map((cell) => `${cell.x},${cell.y},${cell.state},${cell.number}`).join(';')}`;
}

export class LocalDemoAdapter {
  constructor(private readonly page: Page) {}

  async read(): Promise<BoardSnapshot> {
    assertSafeDemoRoute(this.page.url());
    return readVisibleBoard(this.page);
  }

  async perform(action: Exclude<MoveAction, { kind: 'STOP' }>): Promise<void> {
    const current = await this.read();
    if (action.x < 0 || action.x >= current.board.width || action.y < 0 || action.y >= current.board.height) throw new Error('illegal action');
    const cell = current.board.cells.find((candidate) => candidate.x === action.x && candidate.y === action.y);
    if (!cell || cell.state !== 'closed') throw new Error('illegal action');
    await this.page.locator(`#cell_${action.x}_${action.y}`).click({ button: action.kind === 'OPEN' ? 'left' : 'right', force: false });
  }

  async waitForBoardChange(before: BoardSnapshot, timeoutMs: number): Promise<BoardSnapshot | null> {
    const canonical = serialise(before);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const after = await this.read();
        if (serialise(after) !== canonical) return after;
      } catch {
        return null;
      }
      await this.page.waitForTimeout(50);
    }
    return null;
  }
}
