import type { Page } from '@playwright/test';
import type { BoardSnapshot, MoveAction } from '../domain/types';
import { assertSafeLiveRoute } from '../controller/safety-gate';
import { readVisibleBoard } from './dom-board-reader';

export class LiveCasualAdapter {
  private constructor(private readonly page: Page) {}

  static async create(page: Page): Promise<LiveCasualAdapter> {
    assertSafeLiveRoute(page.url());
    return new LiveCasualAdapter(page);
  }

  async read(): Promise<BoardSnapshot> {
    assertSafeLiveRoute(this.page.url());
    const snapshot = await readVisibleBoard(this.page);
    return { ...snapshot, phase: 'playing' };
  }

  async perform(action: Exclude<MoveAction, { kind: 'STOP' }>): Promise<void> {
    assertSafeLiveRoute(this.page.url());
    const snapshot = await this.read();
    const target = snapshot.board.cells.find((cell) => cell.x === action.x && cell.y === action.y);
    if (!target || target.state !== 'closed') throw new Error('illegal action');
    await this.page.locator(`#cell_${action.x}_${action.y}`).click({ button: action.kind === 'OPEN' ? 'left' : 'right', force: false });
  }

  async waitForBoardChange(_before: BoardSnapshot, _timeoutMs: number): Promise<BoardSnapshot | null> {
    assertSafeLiveRoute(this.page.url());
    return null;
  }
}
