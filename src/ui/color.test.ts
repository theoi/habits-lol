import { describe, expect, it } from 'vitest';
import { contrastRatio, HABIT_COLORS, onColor } from './color';

describe('onColor', () => {
  it('matches known WCAG contrast values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('keeps marks on every habit color at 3:1 or better', () => {
    for (const c of HABIT_COLORS) expect(contrastRatio(c, onColor(c))).toBeGreaterThanOrEqual(3);
  });

  it('picks dark marks on light colors and white on dark ones', () => {
    expect(onColor('#d49a2a')).toBe('#1c1d1b');
    expect(onColor('#3d7fb8')).toBe('#ffffff');
  });
});
