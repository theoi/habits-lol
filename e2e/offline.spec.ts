import { expect, test } from '@playwright/test';
import { createHabit, openFresh } from './helpers';

test('works offline after the first visit, including saving changes', async ({ page, context }) => {
  await openFresh(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Build habits, one day at a time' })).toBeVisible();

  await createHabit(page, { name: 'Offline habit' });
  await page.getByRole('button', { name: 'Mark Offline habit done' }).click();
  await page.goto('./#/habits');
  await page.reload();
  await expect(page.getByText('Offline habit')).toBeVisible();
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Mark Offline habit not done' })).toBeVisible();
});

test('serves an installable manifest', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest).toMatchObject({ name: 'Habits', display: 'standalone', start_url: '/habits-lol/', scope: '/habits-lol/' });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, new URL(href!, page.url())).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});
