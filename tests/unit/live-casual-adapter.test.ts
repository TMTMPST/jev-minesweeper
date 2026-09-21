import { describe, expect, it, vi } from 'vitest';
import { LiveCasualAdapter } from '../../src/browser/live-casual-adapter';
import { parseLiveArgs } from '../../src/cli/play-live-casual';

describe('live compatibility guard', () => {
  it('requires acknowledgement and explicit one-move limit', async () => { await expect(parseLiveArgs([])).rejects.toThrow('--ack-live-casual'); await expect(parseLiveArgs(['--ack-live-casual'])).rejects.toThrow('--max-actions=1'); });
  it('does not create a cell locator on an unsafe redirected URL', async () => { const page = { url: () => 'https://minesweeper.online/arena', locator: vi.fn() }; await expect(LiveCasualAdapter.create(page as never)).rejects.toThrow('unsafe route'); expect(page.locator).not.toHaveBeenCalled(); });
});
