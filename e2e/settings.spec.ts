import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { openFresh } from './helpers';

test('compact list switches Today and Habits to dense rows, persists, and is backed up', async ({ page }) => {
  await openFresh(page);
  await page.getByRole('button', { name: 'Try sample habits' }).click();
  const firstRow = page.locator('.habit-row').first();
  const roomy = (await firstRow.boundingBox())!.height;

  await page.goto('./#/settings');
  const toggle = page.getByRole('switch', { name: /Compact list/ });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(page.locator('.app')).toHaveClass(/is-compact/);

  await page.reload();
  await expect(page.getByRole('switch', { name: /Compact list/ })).toBeChecked();
  await page.goto('./');
  const compact = (await firstRow.boundingBox())!.height;
  expect(compact).toBeLessThan(roomy * 0.8);

  await page.goto('./#/habits');
  await expect(page.locator('.app')).toHaveClass(/is-compact/);

  await page.goto('./#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  const json = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(json.settings).toEqual({ weekStartsOn: 1, compact: true });
});
