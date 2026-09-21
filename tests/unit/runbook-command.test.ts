import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('script contract', () => {
  it('does not make the guarded live command the default demo command', async () => {
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts.demo).toContain('vite');
    expect(pkg.scripts['agent:live:casual']).toContain('--ack-live-casual');
    expect(pkg.scripts.demo).not.toContain('minesweeper.online');
  });
});
