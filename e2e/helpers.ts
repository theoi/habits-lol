import { expect, type Page } from '@playwright/test';

/** Thursday 12 November 2026, mid-morning local time. */
export const NOW = new Date('2026-11-12T10:00:00');

export async function openFresh(page: Page, now: Date = NOW): Promise<void> {
  await page.clock.setFixedTime(now);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Build habits, one day at a time' })).toBeVisible();
}

export interface NewHabit {
  name: string;
  count?: { target: number; unit: string };
  days?: string[];
  perWeek?: number;
  reminder?: string;
}

export async function createHabit(page: Page, h: NewHabit): Promise<void> {
  await page.goto('./#/new');
  await page.getByLabel('Name').fill(h.name);
  if (h.days) {
    await page.getByRole('radio', { name: 'Some days' }).click();
    for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      const chip = page.getByRole('button', { name: d, exact: true });
      const on = (await chip.getAttribute('aria-pressed')) === 'true';
      if (on !== h.days.includes(d)) await chip.click();
    }
  }
  if (h.perWeek) {
    await page.getByRole('radio', { name: 'Per week' }).click();
    const more = page.getByRole('button', { name: 'More times' });
    const fewer = page.getByRole('button', { name: 'Fewer times' });
    for (let i = 3; i < h.perWeek; i++) await more.click();
    for (let i = 3; i > h.perWeek; i--) await fewer.click();
  }
  if (h.count) {
    await page.getByRole('radio', { name: 'Reach a number' }).click();
    await page.getByLabel('Target', { exact: true }).fill(String(h.count.target));
    await page.getByLabel('Unit', { exact: true }).fill(h.count.unit);
  }
  if (h.reminder) {
    await page.getByRole('switch', { name: 'Remind me' }).check();
    await page.getByLabel('Reminder time').fill(h.reminder);
  }
  await page.getByRole('button', { name: 'Create habit' }).click();
  await expect(page.locator('.habit-name', { hasText: h.name })).toBeVisible();
}

export function row(page: Page, name: string) {
  return page.locator('.habit-row', { has: page.locator('.habit-name', { hasText: name }) });
}
