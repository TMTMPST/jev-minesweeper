import 'dotenv/config';
import { launchControllerBrowser } from './browser-launch';
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
  const browser = await launchControllerBrowser();
  const page = await browser.newPage({ viewport: null });
  try {
    await page.goto(pageUrl.href);
    console.log('Local controller is running. Choose a board and click START JEV in the browser.');
    const controller = createLocalController(page);
    for (;;) {
      if (page.isClosed() || !browser.isConnected()) return;
      const result = await controller.step();
      if (page.isClosed() || !browser.isConnected()) return;
      if (result.action.kind !== 'STOP') {
        const candidate = controller.lastSelectedCandidate;
        const probabilityByOption = Object.fromEntries((result.probabilities ?? []).map((item) => [item.option, item.probability]));
        const candidates = controller.lastOfferedCandidates.map((offered) => {
          const option = `${offered.action.kind}:${offered.action.x}:${offered.action.y}`;
          return { action: `${offered.action.kind} (${offered.action.x},${offered.action.y})`, probability: probabilityByOption[option] ?? (offered.action.kind === result.action.kind && offered.action.x === result.action.x && offered.action.y === result.action.y ? 1 : 0) };
        }).sort((left, right) => right.probability - left.probability);
        telemetry.publish({ kind: 'decision', action: `${result.action.kind} ${result.action.x},${result.action.y}`, ...(candidate ? { proof: candidate.proof, guess: candidate.mineRisk !== undefined, ...(candidate.mineRisk === undefined ? {} : { mineRisk: candidate.mineRisk }) } : {}), confidence: result.confidence * 100, verified: candidate?.mineRisk === undefined, source: result.source, ...(result.latencyMs === undefined ? {} : { latencyMs: result.latencyMs }), candidates });
        continue;
      }
      telemetry.publish({ kind: 'stop', reason: result.action.reason });
      console.log(JSON.stringify(result.action));
      if (result.action.reason === 'DECISION_FAILURE') console.error(`Decision failure: ${controller.lastFailureDetail ?? 'unknown decision error'}`);
      const stoppedRevision = await page.locator('#app').getAttribute('data-board-revision');
      for (;;) {
        if (page.isClosed() || !browser.isConnected()) return;
        await page.waitForTimeout(250);
        const nextRevision = await page.locator('#app').getAttribute('data-board-revision');
        if (nextRevision && nextRevision !== stoppedRevision) break;
      }
    }
  } finally {
    await browser.close();
    await telemetry.close();
    await server?.close();
  }
}

if (process.argv[1]?.endsWith('play-local.ts')) await main();
