import type { CSSProperties } from 'react';

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT_ON = '#ffffff';
const DARK_ON = '#1c1d1b';

/** Text or icon color with the higher contrast on top of a habit color. */
export function onColor(hex: string): string {
  return contrastRatio(hex, LIGHT_ON) >= contrastRatio(hex, DARK_ON) ? LIGHT_ON : DARK_ON;
}

/** CSS variables for a habit's color and the readable color on top of it. */
export function habitVars(color: string): CSSProperties {
  return { ['--hc' as string]: color, ['--hc-on' as string]: onColor(color) };
}

/** Habit colors offered in the editor. */
export const HABIT_COLORS = ['#4f9a78', '#3d7fb8', '#d49a2a', '#d8664b', '#8d6ac2', '#2f9ea0', '#c95b84', '#64748b'];
