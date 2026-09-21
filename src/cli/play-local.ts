import 'dotenv/config';
import { chromium } from '@playwright/test';
import { createLocalController } from './local-controller';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto(process.env.LOCAL_DEMO_URL ?? 'http://127.0.0.1:4173');
console.log('Open one local cell in the browser, then press Enter here for one proven controller action.');
process.stdin.once('data', async () => {
  const result = await createLocalController(page).step();
  console.log(JSON.stringify(result.action));
  await browser.close();
});
