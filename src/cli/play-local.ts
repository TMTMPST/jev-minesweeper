import 'dotenv/config';
import { chromium } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { createLocalController } from './local-controller';
import { startTelemetryServer } from './telemetry-server';

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
  if (!url) { await server.close(); throw new Error('Vite did not expose a local demo URL'); }
  return { url, server };
}

export async function main(): Promise<void> {
  const { url, server } = await resolveDemo();
  const telemetry = await startTelemetryServer();
  const pageUrl = new URL(url);
  pageUrl.searchParams.set('telemetry', telemetry.url);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto(pageUrl.href);
    console.log('Local controller is running. Use RESTART BOARD in the browser after a stop condition.');
    const controller = createLocalController(page);
    let run = await page.locator('#app').getAttribute('data-run');
    if (!run) throw new Error('local board did not expose a run identifier');
    for (;;) {
      const result = await controller.step();
      if (result.action.kind !== 'STOP') {
        const candidate = controller.lastSelectedCandidate;
        telemetry.publish({ kind: 'decision', action: `${result.action.kind} ${result.action.x},${result.action.y}`, ...(candidate ? { proof: candidate.proof } : {}), confidence: result.confidence * 100, verified: candidate !== undefined, source: result.source });
        continue;
      }
      telemetry.publish({ kind: 'stop', reason: result.action.reason });
      console.log(JSON.stringify(result.action));
      if (result.action.reason === 'DECISION_FAILURE') console.error(`Decision failure: ${controller.lastFailureDetail ?? 'unknown decision error'}`);
      for (;;) {
        await page.waitForTimeout(250);
        const nextRun = await page.locator('#app').getAttribute('data-run');
        if (nextRun && nextRun !== run) { run = nextRun; break; }
      }
    }
  } finally {
    await browser.close();
    await telemetry.close();
    await server?.close();
  }
}

if (process.argv[1]?.endsWith('play-local.ts')) await main();
