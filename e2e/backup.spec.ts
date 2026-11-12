import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openFresh } from './helpers';

async function exportBackup(page: Page): Promise<{ path: string; json: Record<string, unknown> }> {
  await page.goto('./#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^habits-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  return { path, json: JSON.parse(await readFile(path, 'utf8')) };
}

test('exports, wipes, and imports back without loss', async ({ page }) => {
  await openFresh(page);
  await page.getByRole('button', { name: 'Try sample habits' }).click();
  await expect(page.locator('.habit-name').first()).toBeVisible();

  const first = await exportBackup(page);
  expect(first.json.format).toBe('habits-lol-backup');
  expect((first.json.habits as unknown[]).length).toBe(7);
  const days = (first.json.checkIns as { day: string }[]).map((c) => c.day).sort();
  expect(days.length).toBeGreaterThan(300);
  // About four months of history, ending today (12 November 2026 in openFresh).
  expect(days[0]).toBe('2026-07-15');
  expect(days.at(-1)).toBe('2026-11-12');

  // Change data, then import the earlier backup.
  await page.goto('./#/habit/walk/edit');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'Sunday' }).click();

  await expect(page.getByRole('radio', { name: 'Sunday' })).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('import-file').setInputFiles(first.path);
  const confirm = page.getByRole('alertdialog', { name: 'Replace all data?' });
  await expect(confirm).toContainText(`Backup7 habits, ${(first.json.checkIns as unknown[]).length} check-ins`);
  await expect(confirm).toContainText('On this device6 habits');
  await confirm.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Backup imported')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Monday' })).toHaveAttribute('aria-checked', 'true');

  const second = await exportBackup(page);
  expect({ ...second.json, exportedAt: null }).toEqual({ ...first.json, exportedAt: null });

  await page.reload();
  await page.goto('./');
  await expect(page.locator('.habit-name', { hasText: 'Morning walk' })).toBeVisible();
});

test('leaves data untouched when the import is cancelled or invalid', async ({ page }) => {
  await openFresh(page);
  await page.getByRole('button', { name: 'Try sample habits' }).click();
  await expect(page.locator('.habit-name').first()).toBeVisible();
  const before = await exportBackup(page);

  const empty = JSON.stringify({ ...before.json, habits: [], checkIns: [] });
  await page
    .getByTestId('import-file')
    .setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(empty) });
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await page
    .getByTestId('import-file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"other"}') });
  const error = page.getByRole('dialog', { name: 'Couldn’t import this file' });
  await expect(error).toContainText('not a Habits backup');
  await error.getByRole('button', { name: 'OK' }).click();
  await expect(error).toHaveCount(0);

  const after = await exportBackup(page);
  expect({ ...after.json, exportedAt: null }).toEqual({ ...before.json, exportedAt: null });
});

test('imports a backup from before line icons, mapping emoji icons', async ({ page }) => {
  await openFresh(page);
  const old = {
    format: 'habits-lol-backup',
    version: 1,
    exportedAt: '2026-11-12T09:00:00.000Z',
    settings: { weekStartsOn: 1 },
    habits: [
      { id: 'w', name: 'Water', icon: '💧', color: '#3d7fb8', schedule: { kind: 'daily' }, goal: { kind: 'count', target: 8, unit: 'glasses' }, reminderTime: null, order: 0, createdAt: '2026-11-01T09:00:00.000Z', startDay: '2026-11-01', archivedAt: null },
      { id: 'u', name: 'Unicorn', icon: '🦄', color: '#8d6ac2', schedule: { kind: 'daily' }, goal: { kind: 'check' }, reminderTime: null, order: 1, createdAt: '2026-11-01T09:00:00.000Z', startDay: '2026-11-01', archivedAt: null },
    ],
    checkIns: [{ habitId: 'w', day: '2026-11-11', count: 8, updatedAt: '2026-11-11T20:00:00.000Z' }],
  };
  await page.goto('./#/settings');
  await page.getByTestId('import-file').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) });
  await page.getByRole('alertdialog').getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Backup imported')).toBeVisible();

  const after = await exportBackup(page);
  expect((after.json.habits as { icon: string }[]).map((h) => h.icon)).toEqual(['droplet', 'check']);
  expect(after.json.settings).toEqual({ weekStartsOn: 1, compact: false });
  await page.goto('./');
  await expect(page.locator('.habit-row .habit-icon svg')).toHaveCount(2);
});
