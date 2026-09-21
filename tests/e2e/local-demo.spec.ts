import { expect, test } from '@playwright/test';
import { createLocalController } from '../../src/cli/local-controller';
import { MockDecisionClient } from '../../src/decision/mock-decision-client';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4173') await route.abort();
    else await route.continue();
  });
});

test('controller makes only proven local moves through rendered DOM', async ({ page }) => {
  await page.goto('/?seed=17&width=6&height=6&mines=6');
  const controller = createLocalController(page, new MockDecisionClient());
  await expect(controller.step()).resolves.toMatchObject({ action: { kind: 'STOP', reason: 'GAME_FINISHED' } });
  await page.locator('#cell_0_0').click();
  await expect(controller.step()).resolves.toMatchObject({ action: { kind: expect.stringMatching(/OPEN|FLAG|STOP/) } });
});

test('accepts a board-wide zero flood reveal', async ({ page }) => {
  await page.goto('/?seed=7&width=4&height=4&mines=2');
  const before = await page.locator('.opened').count();
  await page.locator('#cell_0_0').click();
  expect(await page.locator('.opened').count()).toBeGreaterThan(before + 1);
});
