import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createHabit, row } from './helpers';

async function exportJson(page: Page) {
  await page.goto('./#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  return JSON.parse(await readFile(await download.path(), 'utf8')) as {
    habits: { name: string; startDay: string }[];
    checkIns: { day: string }[];
  };
}

function backup(days: string[]) {
  return JSON.stringify({
    format: 'habits-lol-backup',
    version: 1,
    exportedAt: '2026-03-01T00:00:00.000Z',
    settings: { weekStartsOn: 1, compact: false },
    habits: [
      {
        id: 'd',
        name: 'Daily',
        icon: 'check',
        color: '#3d7fb8',
        schedule: { kind: 'daily' },
        goal: { kind: 'check' },
        reminderTime: null,
        order: 0,
        createdAt: '2026-03-01T12:00:00.000Z',
        startDay: '2026-03-01',
        archivedAt: null,
      },
    ],
    checkIns: days.map((day) => ({ habitId: 'd', day, count: 1, updatedAt: '2026-03-01T12:00:00.000Z' })),
  });
}

async function importBackup(page: Page, text: string) {
  await page.goto('./#/settings');
  await page.getByTestId('import-file').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('alertdialog').getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Backup imported')).toBeVisible();
}

test.describe('ahead of UTC (Auckland)', () => {
  test.use({ timezoneId: 'Pacific/Auckland' });

  test('uses the local calendar day, not the UTC day', async ({ page }) => {
    // 2026-11-12T11:30Z is 00:30 on Friday 13 November in Auckland (UTC+13).
    await page.clock.install({ time: new Date('2026-11-12T11:30:00Z') });
    await page.goto('./');
    await createHabit(page, { name: 'Tea' });
    await expect(page.getByRole('heading', { name: '13 November' })).toBeVisible();
    await expect(page.getByText('Friday')).toBeVisible();
    await page.getByRole('button', { name: 'Mark Tea done' }).click();
    const data = await exportJson(page);
    expect(data.habits[0]!.startDay).toBe('2026-11-13');
    expect(data.checkIns.map((c) => c.day)).toEqual(['2026-11-13']);
  });
});

test.describe('across the US daylight-saving changes (New York)', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('keeps a daily streak through spring forward and rolls over at local midnight', async ({ page }) => {
    // 23:30 EDT on Monday 9 March 2026, the day after clocks went forward.
    await page.clock.install({ time: new Date('2026-03-10T03:30:00Z') });
    await page.goto('./');
    await importBackup(page, backup(['2026-03-06', '2026-03-07', '2026-03-08']));
    await page.goto('./');
    await expect(page.getByRole('heading', { name: '9 March' })).toBeVisible();
    await expect(row(page, 'Daily')).toContainText('3 days');
    await page.getByRole('button', { name: 'Mark Daily done' }).click();
    await expect(row(page, 'Daily')).toContainText('4 days');

    // 31 minutes later it is Tuesday 10 March locally; the streak carries over while today is open.
    await page.clock.runFor('31:00');
    await page.reload();
    await expect(page.getByRole('heading', { name: '10 March' })).toBeVisible();
    await expect(row(page, 'Daily')).toContainText('4 days');
    await expect(page.getByRole('button', { name: 'Mark Daily done' })).toBeVisible();
  });

  test('counts the 25-hour fall-back day as one day', async ({ page }) => {
    // 23:30 EST on Sunday 1 November 2026, the day clocks went back.
    await page.clock.install({ time: new Date('2026-11-02T04:30:00Z') });
    await page.goto('./');
    await importBackup(page, backup(['2026-10-30', '2026-10-31']));
    await page.goto('./');
    await expect(page.getByRole('heading', { name: '1 November' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark Daily done' }).click();
    await expect(row(page, 'Daily')).toContainText('3 days');
    const data = await exportJson(page);
    expect(data.checkIns.map((c) => c.day).sort()).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});
