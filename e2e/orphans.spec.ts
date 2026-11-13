import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { openFresh } from './helpers';

type Json = Record<string, unknown> & { habits: Record<string, unknown>[]; checkIns: Record<string, unknown>[] };

async function exportJson(page: Page): Promise<{ path: string; json: Json }> {
  await page.goto('./#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  const path = await download.path();
  return { path, json: JSON.parse(await readFile(path, 'utf8')) };
}

const sameData = (a: Json, b: Json) => expect({ ...b, exportedAt: null }).toEqual({ ...a, exportedAt: null });

/** Imports a backup file into a brand-new browser profile and returns that profile's own export. */
async function restoreInFreshProfile(browser: Browser, path: string, skipped: number): Promise<Json> {
  const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const page = await ctx.newPage();
  await page.goto('./#/settings');
  await page.getByTestId('import-file').setInputFiles(path);
  const confirm = page.getByRole('alertdialog', { name: 'Replace all data?' });
  if (skipped > 0) {
    await expect(confirm.getByTestId('import-skipped')).toContainText(
      `${skipped} ${skipped === 1 ? 'entry' : 'entries'} for deleted habits will be skipped.`,
    );
  } else {
    await expect(confirm.getByTestId('import-skipped')).toHaveCount(0);
  }
  await confirm.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText(skipped > 0 ? `Backup imported. ${skipped}` : 'Backup imported')).toBeVisible();
  const { json } = await exportJson(page);
  await ctx.close();
  return json;
}

test('imports a backup containing check-ins for deleted habits, restoring everything else exactly', async ({
  page,
  browser,
}, info) => {
  await openFresh(page);
  await page.getByRole('button', { name: 'Try sample habits' }).click();
  await expect(page.locator('.habit-row').first()).toBeVisible();
  const original = await exportJson(page);

  // The shape an earlier release could export after a habit was deleted in another tab.
  const withOrphans = structuredClone(original.json);
  withOrphans.checkIns.splice(3, 0, { habitId: 'deleted-habit', day: '2026-11-10', count: 4, note: 'Saved after delete', updatedAt: '2026-11-10T20:00:00.000Z' });
  withOrphans.checkIns.push({ habitId: 'deleted-habit', day: '2026-11-11', count: 1, updatedAt: '2026-11-11T20:00:00.000Z' });
  const path = info.outputPath('with-orphans.json');
  await writeFile(path, JSON.stringify(withOrphans));

  const restored = await restoreInFreshProfile(browser, path, 2);
  sameData(original.json, restored);
});

test('an upgrade removes check-ins left for deleted habits, and the export then restores', async ({ page, browser }) => {
  // Seed the database exactly as the previous release (schema version 2) could leave it:
  // one habit, its check-ins, and two check-ins for a habit deleted in another tab.
  await page.goto('./favicon.svg');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('habits-lol', 20);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore('habits', { keyPath: 'id' }).createIndex('order', 'order');
          const c = db.createObjectStore('checkIns', { keyPath: ['habitId', 'day'] });
          c.createIndex('habitId', 'habitId');
          c.createIndex('day', 'day');
          db.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['habits', 'checkIns', 'meta'], 'readwrite');
          tx.objectStore('habits').put({
            id: 'kept', name: 'Water', icon: 'droplet', color: '#3d7fb8', schedule: { kind: 'daily' },
            goal: { kind: 'count', target: 8, unit: 'glasses' }, reminderTime: null, order: 0,
            createdAt: '2026-11-01T09:00:00.000Z', startDay: '2026-11-01', archivedAt: null,
          });
          const ci = tx.objectStore('checkIns');
          ci.put({ habitId: 'kept', day: '2026-11-10', count: 8, updatedAt: '2026-11-10T20:00:00.000Z' });
          ci.put({ habitId: 'kept', day: '2026-11-11', count: 5, note: 'Hot day', updatedAt: '2026-11-11T20:00:00.000Z' });
          ci.put({ habitId: 'doomed', day: '2026-11-11', count: 3, note: 'Saved after delete', updatedAt: '2026-11-11T21:00:00.000Z' });
          ci.put({ habitId: 'doomed', day: '2026-11-12', count: 1, updatedAt: '2026-11-12T08:00:00.000Z' });
          tx.objectStore('meta').put({ key: 'settings', value: { weekStartsOn: 0, compact: true } });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );

  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00'));
  await page.goto('./#/settings');
  await expect(page.getByText('1 habit and 2 check-ins on this device')).toBeVisible();

  const upgraded = await exportJson(page);
  expect(upgraded.json.checkIns).toEqual([
    { habitId: 'kept', day: '2026-11-10', count: 8, updatedAt: '2026-11-10T20:00:00.000Z' },
    { habitId: 'kept', day: '2026-11-11', count: 5, note: 'Hot day', updatedAt: '2026-11-11T20:00:00.000Z' },
  ]);
  expect(upgraded.json.settings).toEqual({ weekStartsOn: 0, compact: true });

  const restored = await restoreInFreshProfile(browser, upgraded.path, 0);
  sameData(upgraded.json, restored);
});

test('saving a day in one tab after the habit was deleted in another leaves no orphan', async ({ page, context, browser }) => {
  await openFresh(page);
  await page.getByRole('button', { name: 'Try sample habits' }).click();
  await page.getByRole('button', { name: /^5 of 8 glasses/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel(/Count/).fill('6');
  await sheet.getByLabel('Note').fill('Saved after delete');

  const other = await context.newPage();
  await other.clock.setFixedTime(new Date('2026-11-12T10:00:00'));
  await other.goto('./#/habit/water/edit');
  await other.getByRole('button', { name: 'Delete' }).click();
  await other.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(other).toHaveURL(/#\/$/);
  await other.close();

  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const after = await exportJson(page);
  expect(after.json.checkIns.filter((c) => c.habitId === 'water')).toEqual([]);
  const restored = await restoreInFreshProfile(browser, after.path, 0);
  sameData(after.json, restored);
});

test('rejects a file with check-ins but no habits, or a malformed entry for a deleted habit', async ({ page }) => {
  await openFresh(page);
  await page.getByRole('button', { name: 'Try sample habits' }).click();
  await expect(page.locator('.habit-row').first()).toBeVisible();
  const before = await exportJson(page);
  const orphan = { habitId: 'deleted-habit', day: '2026-11-10', count: 1, updatedAt: '2026-11-10T20:00:00.000Z' };
  const error = page.getByRole('dialog', { name: 'Couldn’t import this file' });

  const cases: [Json, string][] = [
    [{ ...before.json, habits: [], checkIns: [orphan, { ...orphan, day: '2026-11-11' }] }, 'not a usable backup'],
    [{ ...before.json, checkIns: [...before.json.checkIns, { ...orphan, day: '2026-02-30' }] }, 'YYYY-MM-DD'],
    [{ ...before.json, checkIns: [...before.json.checkIns, { ...orphan, count: '1' }] }, 'count'],
  ];
  for (const [file, message] of cases) {
    await page
      .getByTestId('import-file')
      .setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
    await expect(error).toContainText(message);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await error.getByRole('button', { name: 'OK' }).click();
    await expect(error).toHaveCount(0);
  }

  const after = await exportJson(page);
  sameData(before.json, after.json);
});
