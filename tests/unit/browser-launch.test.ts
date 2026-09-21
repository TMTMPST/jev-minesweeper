import { describe, expect, it } from 'vitest';
import { controllerBrowserFromEnvironment } from '../../src/cli/browser-launch';

describe('controller browser selection', () => {
  it('uses Chromium when no browser is configured', () => {
    expect(controllerBrowserFromEnvironment({})).toBe('chromium');
  });

  it('accepts every supported Playwright browser engine', () => {
    expect(controllerBrowserFromEnvironment({ PLAYWRIGHT_BROWSER: 'firefox' })).toBe('firefox');
    expect(controllerBrowserFromEnvironment({ PLAYWRIGHT_BROWSER: 'WEBKIT' })).toBe('webkit');
  });

  it('rejects unsupported browser names before launching', () => {
    expect(() => controllerBrowserFromEnvironment({ PLAYWRIGHT_BROWSER: 'zen' })).toThrow('unsupported PLAYWRIGHT_BROWSER');
  });
});
