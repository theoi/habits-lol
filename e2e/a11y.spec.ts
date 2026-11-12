import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { openFresh } from './helpers';

const SCREENS = [
  ['today', './'],
  ['detail', './#/habit/read'],
  ['editor', './#/habit/workout/edit'],
  ['habits', './#/habits'],
  ['settings', './#/settings'],
] as const;

async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`main screens meet WCAG AA (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await openFresh(page);
    await page.getByRole('button', { name: 'Try sample habits' }).click();
    await expect(page.locator('.habit-row').first()).toBeVisible();
    for (const compact of [false, true]) {
      if (compact) {
        await page.goto('./#/settings');
        await page.getByRole('switch', { name: /Compact list/ }).check();
      }
      for (const [name, url] of SCREENS) {
        await page.goto(url);
        await page.locator('.page:not([aria-busy])').waitFor();
        await page.waitForTimeout(150);
        expect(await audit(page), `${name}${compact ? ' compact' : ''}`).toEqual([]);
      }
    }
  });
}
