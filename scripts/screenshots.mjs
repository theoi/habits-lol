// Captures the main screens at phone and desktop sizes with seeded sample data.
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir> [light|dark]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173/habits-lol/';
const out = process.argv[3] ?? 'screenshots';
const scheme = process.argv[4] ?? 'light';
mkdirSync(out, { recursive: true });

const sizes = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};

const browser = await chromium.launch();
for (const [name, opts] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ ...opts, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-12T18:30:00'));
  await page.goto(base);
  if (!(await page.getByRole('heading', { name: 'To do' }).isVisible().catch(() => false))) {
    const sample = page.getByRole('button', { name: 'Try sample habits' });
    if (await sample.isVisible().catch(() => false)) await sample.click();
  }
  await page.getByRole('heading', { name: /To do|Done/ }).first().waitFor();
  const suffix = scheme === 'dark' ? '-dark' : '';
  const shot = (n) => page.screenshot({ path: `${out}/${n}-${name}${suffix}.png` });
  const scrolled = async (n, selector) => {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel).closest('.card') ?? document.querySelector(sel);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16);
    }, selector);
    await page.waitForTimeout(250);
    await shot(n);
  };
  await page.waitForTimeout(600);
  await shot('1-today');
  await page.goto(`${base}#/habit/meditate`);
  await page.getByRole('heading', { name: 'Meditate' }).waitFor();
  await page.waitForTimeout(400);
  await shot('2-detail');
  if (name === 'phone') await scrolled('2-detail-history', '.chart');
  if (name === 'phone') await scrolled('2-detail-calendar', '.month');
  await page.goto(`${base}#/habit/workout/edit`);
  await page.getByRole('heading', { name: 'Edit habit' }).waitFor();
  await page.waitForTimeout(300);
  await shot('3-editor');
  await page.goto(`${base}#/habit/read`);
  await page.getByRole('button', { name: /Tuesday 10 November/ }).click();
  await page.waitForTimeout(400);
  await shot('4-day-sheet');
  await page.keyboard.press('Escape');
  await page.goto(`${base}#/habits`);
  await page.getByRole('heading', { name: 'Habits' }).waitFor();
  await page.waitForTimeout(250);
  await shot('5-habits');
  await page.goto(`${base}#/settings`);
  await page.getByRole('heading', { name: 'Settings' }).waitFor();
  await page.waitForTimeout(250);
  await shot('6-settings');
  // Compact list
  await page.getByRole('switch', { name: /Compact list/ }).check();
  await page.locator('.app.is-compact').waitFor();
  await page.goto(base);
  await page.getByRole('heading', { name: /To do|Done/ }).first().waitFor();
  await page.waitForTimeout(300);
  await shot('7-today-compact');
  await page.goto(`${base}#/habits`);
  await page.locator('.app.is-compact .list-row').first().waitFor();
  await page.waitForTimeout(300);
  await shot('8-habits-compact');
  await ctx.close();
}
await browser.close();
console.log('saved to', out);
