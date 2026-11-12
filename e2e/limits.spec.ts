import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openFresh } from './helpers';

const NAME = 'Steps — ünïcode '.padEnd(80, 'x');
const UNIT = 'steps'.padEnd(24, 's');
const NOTE = 'Line one “quoted”\nline two '.padEnd(2000, '.');

async function exportJson(page: Page): Promise<{ path: string; json: Record<string, unknown> }> {
  await page.goto('./#/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ]);
  const path = await download.path();
  return { path, json: JSON.parse(await readFile(path, 'utf8')) };
}

test('blocks values over the limits and round-trips the largest allowed ones', async ({ page, browser }) => {
  await openFresh(page);
  await page.goto('./#/new');

  const name = page.getByLabel('Name');
  await name.fill(NAME);
  await name.press('End');
  await page.keyboard.type('Z');
  await expect(name).toHaveValue(NAME);

  await page.getByRole('radio', { name: 'Reach a number' }).click();
  const target = page.getByLabel('Target', { exact: true });
  const create = page.getByRole('button', { name: 'Create habit' });
  for (const bad of ['150000', '100001', '0', '2.5', '']) {
    await target.fill(bad);
    await expect(page.getByRole('alert')).toHaveText('Target must be a whole number from 1 to 100,000.');
    await expect(target).toHaveAttribute('aria-invalid', 'true');
    await expect(create).toBeDisabled();
  }
  await target.fill('100000');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Unit', { exact: true }).fill(UNIT);
  await create.click();
  await expect(page.locator('.habit-name', { hasText: 'Steps' })).toBeVisible();

  // Day sheet: the count field refuses more than 1,000,000.
  await page.getByRole('button', { name: `0 of 100000 ${UNIT}. Edit` }).click();
  const sheet = page.getByRole('dialog');
  const count = sheet.getByLabel(`Count (${UNIT})`);
  const save = sheet.getByRole('button', { name: 'Save' });
  for (const bad of ['1000001', '1200000', '-1', '1.5']) {
    await count.fill(bad);
    await expect(sheet.getByRole('alert')).toHaveText('Count must be a whole number from 0 to 1,000,000.');
    await expect(save).toBeDisabled();
  }
  await count.fill('1000000');
  await expect(sheet.getByRole('alert')).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: 'Increase' })).toBeDisabled();
  await sheet.getByLabel('Note').fill(NOTE);
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // The Today stepper cannot go past the limit either.
  await expect(page.getByRole('button', { name: `1000000 of 100000 ${UNIT}. Edit` })).toBeVisible();
  await expect(page.getByRole('button', { name: `Increase ${NAME}` })).toBeDisabled();

  const first = await exportJson(page);
  const habit = (first.json.habits as Record<string, unknown>[])[0]!;
  expect(habit.name).toBe(NAME);
  expect(habit.goal).toEqual({ kind: 'count', target: 100000, unit: UNIT });
  expect(first.json.checkIns).toEqual([expect.objectContaining({ count: 1000000, note: NOTE })]);

  // Import into a fresh browser profile, then export again.
  const fresh = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const other = await fresh.newPage();
  await other.goto('./#/settings');
  await other.getByTestId('import-file').setInputFiles(first.path);
  await other.getByRole('alertdialog').getByRole('button', { name: 'Replace' }).click();
  await expect(other.getByText('Backup imported')).toBeVisible();
  const second = await exportJson(other);
  expect({ ...second.json, exportedAt: null }).toEqual({ ...first.json, exportedAt: null });
  await fresh.close();
});
