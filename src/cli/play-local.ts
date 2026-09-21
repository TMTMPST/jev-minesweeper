import 'dotenv/config';
import { chromium } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { createLocalController } from './local-controller';

async function resolveDemo(): Promise<{ url: string; server: ViteDevServer | undefined }> {
  const configuredUrl = process.env.LOCAL_DEMO_URL ?? 'http://127.0.0.1:4173/';
  try {
    const response = await fetch(configuredUrl, { signal: AbortSignal.timeout(1_000) });
    if (response.ok) return { url: configuredUrl, server: undefined };
  } catch {
    // Start the local Vite server below when no already-running demo answers.
  }
  if (process.env.LOCAL_DEMO_URL) throw new Error(`LOCAL_DEMO_URL is unavailable: ${configuredUrl}`);
  const server = await createServer();
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) {
    await server.close();
    throw new Error('Vite did not expose a local demo URL');
  }
  return { url, server };
}

export async function main(): Promise<void> {
  const { url, server } = await resolveDemo();
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto(url);
    console.log('Open one local cell in the browser, then press Enter here for one proven controller action.');
    await new Promise<void>((resolve) => process.stdin.once('data', resolve));
    const controller = createLocalController(page);
    const result = await controller.step();
    console.log(JSON.stringify(result.action));
    if (result.action.kind === 'STOP' && result.action.reason === 'DECISION_FAILURE') console.error(`Decision failure: ${controller.lastFailureDetail ?? 'unknown decision error'}`);
  } finally {
    await browser.close();
    await server?.close();
  }
}

if (process.argv[1]?.endsWith('play-local.ts')) {
  await main();
  process.exit(0);
}
