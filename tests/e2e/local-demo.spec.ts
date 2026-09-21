import { expect, test } from '@playwright/test';
import { createLocalController } from '../../src/cli/local-controller';
import { MockDecisionClient } from '../../src/decision/mock-decision-client';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4173') await route.abort();
    else await route.continue();
  });
});

test('controller refuses to guess before the local safe opening', async ({ page }) => {
  await page.goto('/?seed=17&width=6&height=6&mines=6');
  const controller = createLocalController(page, new MockDecisionClient());
  await expect(controller.step()).resolves.toMatchObject({ action: { kind: 'STOP', reason: 'GAME_FINISHED' } });
});

test('starting Jev opens the local safe zero region', async ({ page }) => {
  await page.goto('/?seed=7&width=4&height=4&mines=2');
  expect(await page.locator('.opened').count()).toBe(0);
  await page.locator('#start-agent').click();
  expect(await page.locator('.opened').count()).toBeGreaterThan(1);
});

test('restart generates a different seed and applies board settings', async ({ page }) => {
  await page.goto('/?seed=7&width=6&height=6&mines=6');
  const firstSeed = await page.locator('#CellsBlock').getAttribute('data-seed');
  await page.locator('#restart-game').click();
  await expect(page.locator('#run-id')).toHaveText('RUN 2');
  await expect(page.locator('#app')).toHaveAttribute('data-run', '2');
  expect(await page.locator('#CellsBlock').getAttribute('data-seed')).not.toBe(firstSeed);
  await page.locator('summary').click();
  await page.locator('#board-width').fill('8');
  await page.locator('#board-height').fill('5');
  await page.locator('#board-mines').fill('9');
  await page.locator('#apply-settings').click();
  await expect(page.locator('#run-id')).toHaveText('RUN 3');
  await expect(page.locator('#dimension-count')).toHaveText('8 × 5');
  expect(await page.locator('#CellsBlock .cell').count()).toBe(40);
  expect(await page.locator('.opened').count()).toBe(0);
});

test('renders the complete expert board and records manual board revisions', async ({ page }) => {
  await page.goto('/?seed=7');
  await page.locator('[data-preset="expert"]').click();
  await expect(page.locator('#dimension-count')).toHaveText('30 × 16');
  await expect(page.locator('#CellsBlock .cell')).toHaveCount(480);
  const initialRevision = await page.locator('#app').getAttribute('data-board-revision');
  await page.locator('#start-agent').click();
  const afterStartRevision = await page.locator('#app').getAttribute('data-board-revision');
  expect(afterStartRevision).not.toBe(initialRevision);
  await page.locator('#CellsBlock .closed').first().click({ button: 'right' });
  await expect(page.locator('#app')).not.toHaveAttribute('data-board-revision', afterStartRevision ?? '');
});

test('fills the available desktop viewport instead of leaving a blank side gutter', async ({ page }) => {
  await page.setViewportSize({ width: 1568, height: 793 });
  await page.goto('/');
  const metrics = await page.locator('.app-shell').evaluate((element) => ({ shellWidth: element.getBoundingClientRect().width, viewportWidth: window.innerWidth }));
  expect(metrics.shellWidth).toBeGreaterThan(metrics.viewportWidth - 60);
});

test('keeps calculated guesses opt-in and records the setting as a board revision', async ({ page }) => {
  await page.goto('/');
  const revision = await page.locator('#app').getAttribute('data-board-revision');
  await expect(page.locator('#guess-mode')).not.toBeChecked();
  await expect(page.locator('#app')).toHaveAttribute('data-guess-mode', 'disabled');
  await page.locator('#guess-mode').check();
  await expect(page.locator('#app')).toHaveAttribute('data-guess-mode', 'enabled');
  await expect(page.locator('#app')).not.toHaveAttribute('data-board-revision', revision ?? '');
});
