import { expect, test } from '@playwright/test';

test('creates a habit, checks it off, and keeps it after reload', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'New habit' }).first().click();
  await page.getByLabel('Name').fill('Stretch');
  await page.getByRole('button', { name: 'Create habit' }).click();

  const check = page.getByRole('button', { name: 'Mark Stretch done' });
  await check.click();
  await expect(page.getByRole('button', { name: 'Mark Stretch not done' })).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Mark Stretch not done' })).toBeVisible();
  await expect(page.getByText('1 day')).toBeVisible();
});
