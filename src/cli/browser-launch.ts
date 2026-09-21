import { chromium, firefox, webkit, type Browser, type BrowserType } from '@playwright/test';

export type ControllerBrowser = 'chromium' | 'firefox' | 'webkit';

export function controllerBrowserFromEnvironment(environment: NodeJS.ProcessEnv = process.env): ControllerBrowser {
  const requested = environment.PLAYWRIGHT_BROWSER?.toLowerCase() ?? 'chromium';
  if (requested === 'chromium' || requested === 'firefox' || requested === 'webkit') return requested;
  throw new Error(`unsupported PLAYWRIGHT_BROWSER: ${requested}. Use chromium, firefox, or webkit.`);
}
export async function launchControllerBrowser(environment: NodeJS.ProcessEnv = process.env): Promise<Browser> {
  const engine = controllerBrowserFromEnvironment(environment);
  const browserType: BrowserType<Browser> = engine === 'chromium' ? chromium : engine === 'firefox' ? firefox : webkit;
  const executablePath = environment.BROWSER_EXECUTABLE_PATH;
  return browserType.launch({
    headless: false,
    ...(engine === 'chromium' ? { args: ['--start-maximized'] } : {}),
    ...(executablePath ? { executablePath } : {}),
  });
}
