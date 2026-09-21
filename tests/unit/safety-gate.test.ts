import { describe, expect, it } from 'vitest';
import { assertSafeDemoRoute, assertSafeLiveRoute } from '../../src/controller/safety-gate';

describe('route safety', () => {
  it.each(['/arena', '/duel/12', '/lobby/x', '/leaderboard', '/marketplace', '/shop', '/account'])('blocks an excluded route %s', (path) => expect(() => assertSafeLiveRoute(`https://minesweeper.online${path}`)).toThrow('unsafe route'));
  it('allows only localhost for the default demo adapter', () => { expect(() => assertSafeDemoRoute('http://127.0.0.1:4173/?seed=7')).not.toThrow(); expect(() => assertSafeDemoRoute('https://minesweeper.online/')).toThrow('not local'); });
});
