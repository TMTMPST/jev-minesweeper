import 'dotenv/config';
import { chromium } from '@playwright/test';
import { LiveCasualAdapter } from '../browser/live-casual-adapter';

export async function parseLiveArgs(args: readonly string[]): Promise<void> {
  if (!args.includes('--ack-live-casual')) throw new Error('--ack-live-casual is required');
  if (!args.includes('--max-actions=1')) throw new Error('--max-actions=1 is required');
}

export async function main(): Promise<void> {
  await parseLiveArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://minesweeper.online/');
  console.log(`Current URL: ${page.url()}. Manually start an unranked casual board; this tool will not click a non-cell element.`);
  await page.locator('#CellsBlock .cell').first().waitFor();
  await LiveCasualAdapter.create(page);
  console.log('Valid casual board detected. Exiting without an automated move for human review.');
  await browser.close();
}

if (process.argv[1]?.endsWith('play-live-casual.ts')) await main();
