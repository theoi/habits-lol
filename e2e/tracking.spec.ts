import { expect, test } from '@playwright/test';
import { createHabit, openFresh, row } from './helpers';

test('tracks count and check habits, past days, notes, and persists across reloads', async ({ page }) => {
  await openFresh(page);
  await createHabit(page, { name: 'Water', count: { target: 8, unit: 'glasses' } });
  await createHabit(page, { name: 'Journal', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] });

  // Count goal: step up and see progress.
  const inc = page.getByRole('button', { name: 'Increase Water' });
  for (let i = 0; i < 3; i++) await inc.click();
  await expect(page.getByRole('button', { name: '3 of 8 glasses. Edit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Decrease Water' })).toBeEnabled();

  // Edit a past day from the week strip.
  await page.getByRole('button', { name: 'Tuesday 10 November' }).click();
  await expect(page.getByText('Editing a past day')).toBeVisible();
  await page.getByRole('button', { name: 'Mark Journal done' }).click();
  await expect(page.getByRole('button', { name: 'Mark Journal not done' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to today' }).click();
  await expect(page.getByRole('button', { name: 'Mark Journal done' })).toBeVisible();

  // Add a done check-in with a note from the habit's calendar.
  await row(page, 'Journal').locator('.habit-row-main').click();
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible();
  await page.getByRole('button', { name: /^Wednesday 11 November/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Not done' }).click();
  await sheet.getByLabel('Note').fill('Wrote two pages');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.note-text', { hasText: 'Wrote two pages' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tuesday 10 November, done' })).toBeVisible();

  // Tue + Wed done, today still open: the streak is 2 days.
  const current = page.locator('.stat', { hasText: 'Current streak' });
  await expect(current).toContainText('2 days');

  await page.reload();
  await expect(page.locator('.note-text', { hasText: 'Wrote two pages' })).toBeVisible();
  await expect(current).toContainText('2 days');
  await page.goto('./');
  await expect(page.getByRole('button', { name: '3 of 8 glasses. Edit' })).toBeVisible();
});

test('un-checks today and moves the habit back to To do', async ({ page }) => {
  await openFresh(page);
  await createHabit(page, { name: 'Stretch' });
  await page.getByRole('button', { name: 'Mark Stretch done' }).click();
  await expect(page.getByRole('heading', { name: /Done/ })).toBeVisible();
  await expect(page.getByText('All done for today')).toBeVisible();
  await page.getByRole('button', { name: 'Mark Stretch not done' }).click();
  await expect(page.getByRole('heading', { name: /To do/ })).toBeVisible();
});

test('edits, reorders, archives, and restores habits', async ({ page }) => {
  await openFresh(page);
  await createHabit(page, { name: 'Alpha' });
  await createHabit(page, { name: 'Beta', perWeek: 2 });

  // Edit
  await row(page, 'Alpha').locator('.habit-row-main').click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Name').fill('Alpha renamed');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Alpha renamed' })).toBeVisible();

  // Reorder
  await page.goto('./#/habits');
  const names = page.getByRole('list', { name: 'Active habits' }).locator('.habit-name');
  await expect(names).toHaveText(['Alpha renamed', 'Beta']);
  await page.getByRole('button', { name: 'Move Beta up' }).click();
  await expect(names).toHaveText(['Beta', 'Alpha renamed']);
  await page.reload();
  await expect(names).toHaveText(['Beta', 'Alpha renamed']);
  await page.goto('./');
  await expect(page.locator('.habit-name')).toHaveText(['Beta', 'Alpha renamed']);

  // Archive hides it from Today; restore brings it back.
  await page.goto('./#/habits');
  await page.getByRole('button', { name: 'Archive Beta' }).click();
  await expect(page.getByRole('list', { name: 'Archived habits' })).toContainText('Beta');
  await page.goto('./');
  await expect(page.locator('.habit-name')).toHaveText(['Alpha renamed']);
  await page.goto('./#/habits');
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByRole('list', { name: 'Active habits' })).toContainText('Beta');
  await page.goto('./');
  await expect(page.locator('.habit-name')).toHaveText(['Alpha renamed', 'Beta']);
});

test('shows per-week progress and moves a met weekly goal out of To do', async ({ page }) => {
  await openFresh(page);
  await createHabit(page, { name: 'Gym', perWeek: 2 });
  await expect(row(page, 'Gym')).toContainText('0 of 2 this week');
  await page.getByRole('button', { name: 'Tuesday 10 November' }).click();
  await page.getByRole('button', { name: 'Mark Gym done' }).click();
  await page.getByRole('button', { name: 'Back to today' }).click();
  await expect(row(page, 'Gym')).toContainText('1 of 2 this week');
  await page.getByRole('button', { name: 'Mark Gym done' }).click();
  await expect(row(page, 'Gym')).toContainText('2 of 2 this week');
  await expect(row(page, 'Gym')).toContainText('1 week');
});
