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
  expect((first.json.checkIns as unknown[]).length).toBeGreaterThan(300);

  // Change data, then import the earlier backup.
  await page.goto('./#/habit/walk/edit');
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: 'Sunday' }).click();

  await expect(page.getByRole('radio', { name: 'Sunday' })).toHaveAttribute('aria-checked', 'true');
  const confirmImport = page.waitForEvent('dialog');
  await page.getByTestId('import-file').setInputFiles(first.path);
  const confirm = await confirmImport;
  expect(confirm.message()).toContain('Backup: 7 habits');
  expect(confirm.message()).toContain('Current: 6 habits');
  await confirm.accept();
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
  const confirmImport = page.waitForEvent('dialog');
  await page
    .getByTestId('import-file')
    .setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(empty) });
  await (await confirmImport).dismiss();

  const alert = page.waitForEvent('dialog');
  await page
    .getByTestId('import-file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"other"}') });
  const a = await alert;
  expect(a.message()).toContain('not a Habits backup');
  await a.accept();

  const after = await exportBackup(page);
  expect({ ...after.json, exportedAt: null }).toEqual({ ...before.json, exportedAt: null });
});
