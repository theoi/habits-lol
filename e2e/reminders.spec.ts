import { expect, test, type Page } from '@playwright/test';
import { createHabit } from './helpers';

/**
 * Notifications the app handed to the browser and the browser accepted (the
 * real `showNotification` resolved). Headless Chromium sometimes drops an
 * accepted notification from `getNotifications()`, so that list is not used.
 */
async function shown(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __shown: string[] }).__shown.slice());
}

test.afterEach(async ({ context }, info) => {
  if (info.status === info.expectedStatus) return;
  for (const p of context.pages()) {
    const diag = await p
      .evaluate(() => {
        const w = window as unknown as { __called: string[]; __shown: string[] };
        return { called: w.__called, shown: w.__shown, now: new Date().toTimeString().slice(0, 8) };
      })
      .catch((e) => String(e));
    console.log('DIAG', info.title.slice(0, 30), JSON.stringify(diag));
  }
});

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['notifications']);
  await context.addInitScript(() => {
    const w = window as unknown as { __shown: string[]; __called: string[] };
    w.__shown = [];
    w.__called = [];
    const real = ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification = async function (title, options) {
      w.__called.push(`${title}@${new Date().toTimeString().slice(0, 8)}`);
      await real.call(this, title, options);
      w.__shown.push(title);
    };
    const RealNotification = window.Notification;
    window.Notification = class extends RealNotification {
      constructor(title: string, options?: NotificationOptions) {
        super(title, options);
        w.__called.push(`page:${title}`);
        w.__shown.push(`page:${title}`);
      }
    } as typeof Notification;
  });
});

test('fires once at the reminder time while the habit is due, then again the next day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T07:00:00') });
  await page.goto('./');
  await createHabit(page, { name: 'Walk', reminder: '07:30' });
  await createHabit(page, { name: 'Read', reminder: '07:30' });
  await page.getByRole('button', { name: 'Mark Read done' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.clock.runFor('25:00');
  await page.waitForTimeout(200);
  expect(await shown(page)).toEqual([]);

  await page.clock.runFor('06:00'); // 07:31
  await expect.poll(() => shown(page)).toEqual(['Walk']);
  await page.clock.runFor('05:00');
  await page.waitForTimeout(200);
  expect(await shown(page)).toEqual(['Walk']);

  await page.reload();
  await page.clock.runFor('01:00');
  await page.waitForTimeout(300);
  expect(await shown(page)).toEqual([]); // the reloaded page does not fire it again today

  await page.clock.runFor('24:00:00'); // next day 07:38, inside the hour after 07:30
  await expect.poll(async () => (await shown(page)).sort()).toEqual(['Read', 'Walk']);
});

test('does not fire for a habit done before its time, or after the catch-up hour', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T08:00:00') });
  await page.goto('./');
  await createHabit(page, { name: 'Water', reminder: '08:10', count: { target: 2, unit: 'cups' } });
  await createHabit(page, { name: 'Late', reminder: '06:30' });
  await page.getByRole('button', { name: 'Increase Water' }).click();
  await page.getByRole('button', { name: 'Increase Water' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.clock.runFor('15:00');
  await page.waitForTimeout(300);
  expect(await shown(page)).toEqual([]);
});

test('fires in a hidden tab without focus or visibility events', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { get: () => true });
    document.hasFocus = () => false;
  });
  await page.clock.install({ time: new Date('2026-11-12T08:58:00') });
  await page.goto('./');
  await createHabit(page, { name: 'Stretch', reminder: '09:00' });
  expect(await page.evaluate(() => document.visibilityState)).toBe('hidden');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.clock.runFor('03:00');
  await expect.poll(() => shown(page)).toEqual(['Stretch']);
});

test('fires once across two open tabs', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-11-12T08:58:00') });
  await page.goto('./');
  await createHabit(page, { name: 'Stretch', reminder: '09:00' });
  const second = await context.newPage();
  await second.clock.install({ time: new Date('2026-11-12T08:58:30') });
  await second.goto('./');
  await expect(second.locator('.habit-name', { hasText: 'Stretch' })).toBeVisible();
  await Promise.all([page.clock.runFor('03:00'), second.clock.runFor('03:00')]);
  await expect.poll(async () => [...(await shown(page)), ...(await shown(second))]).toEqual(['Stretch']);
  await Promise.all([page.clock.runFor('03:00'), second.clock.runFor('03:00')]);
  await page.waitForTimeout(300);
  expect([...(await shown(page)), ...(await shown(second))]).toEqual(['Stretch']);
});

test.describe('across the US spring-forward change', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('fires a 02:30 reminder at 03:00 on the day 02:30 does not exist', async ({ page }) => {
    // 2026-03-08 06:55Z is 01:55 EST; at 07:00Z clocks jump to 03:00 EDT.
    await page.clock.install({ time: new Date('2026-03-08T06:55:00Z') });
    await page.goto('./');
    await createHabit(page, { name: 'Night', reminder: '02:30' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.clock.runFor('04:00');
    await page.waitForTimeout(200);
    expect(await shown(page)).toEqual([]);
    await page.clock.runFor('02:00'); // 03:01 EDT
    await expect.poll(() => shown(page)).toEqual(['Night']);
  });
});
