import { expect, test, type Page } from '@playwright/test';
import { createHabit } from './helpers';

/** Titles of notifications the service worker registration is showing, oldest first. */
async function shown(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.getNotifications()).map((n) => n.title);
  });
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['notifications']);
});

test('fires once at the reminder time while the habit is due, then again the next day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T07:00:00') });
  await page.goto('./');
  await createHabit(page, { name: 'Walk', reminder: '07:30' });
  await createHabit(page, { name: 'Read', reminder: '07:30' });
  await page.getByRole('button', { name: 'Mark Read done' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.clock.runFor('25:00');
  expect(await shown(page)).toEqual([]);

  await page.clock.runFor('06:00'); // 07:31
  await expect.poll(() => shown(page)).toEqual(['🌱 Walk']);

  await page.clock.runFor('40:00');
  await page.reload();
  await page.clock.runFor('01:00');
  await page.waitForTimeout(300);
  expect(await shown(page)).toEqual(['🌱 Walk']); // reloaded page, but already fired today

  await page.clock.runFor('24:00:00'); // next day 08:12, still inside the hour after 07:30
  await expect.poll(async () => (await shown(page)).sort()).toEqual(['🌱 Read', '🌱 Walk', '🌱 Walk']);
});

test('does not fire for a habit done before its time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T08:00:00') });
  await page.goto('./');
  await createHabit(page, { name: 'Water', reminder: '08:10', count: { target: 2, unit: 'cups' } });
  await page.getByRole('button', { name: 'Increase Water' }).click();
  await page.getByRole('button', { name: 'Increase Water' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.clock.runFor('15:00');
  await page.waitForTimeout(300);
  expect(await shown(page)).toEqual([]);
});
