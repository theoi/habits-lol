import { parseTimeOfDay } from './dates';
import { HABIT_ICON_PATHS } from './icons';
import type { Goal, Schedule } from './types';

/**
 * Limits on stored values. The editor, day sheet, stepper, repository, and
 * backup importer all use these, so anything the app saves can be exported
 * and imported back.
 */
export const LIMITS = {
  nameLength: 80,
  unitLength: 24,
  noteLength: 2000,
  targetMax: 100_000,
  countMax: 1_000_000,
  timesPerWeekMax: 7,
} as const;

const fmt = (n: number) => n.toLocaleString('en-US');

export const MESSAGES = {
  nameEmpty: 'Give your habit a name.',
  nameLong: `Keep the name to ${LIMITS.nameLength} characters or fewer.`,
  unitLong: `Keep the unit to ${LIMITS.unitLength} characters or fewer.`,
  target: `Target must be a whole number from 1 to ${fmt(LIMITS.targetMax)}.`,
  count: `Count must be a whole number from 0 to ${fmt(LIMITS.countMax)}.`,
  noteLong: `Keep the note to ${fmt(LIMITS.noteLength)} characters or fewer.`,
  days: 'Pick at least one day.',
  times: `Times a week must be from 1 to ${LIMITS.timesPerWeekMax}.`,
  reminder: 'Pick a reminder time.',
  color: 'Pick a color.',
  icon: 'Pick an icon.',
} as const;

export function isWholeIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** Parses a whole number typed into a field, or returns null for anything else (blank, decimals, exponents). */
export function parseWhole(text: string): number | null {
  const t = text.trim();
  return /^\d{1,15}$/.test(t) ? Number(t) : null;
}

export function checkTarget(target: number | null): string | null {
  return isWholeIn(target, 1, LIMITS.targetMax) ? null : MESSAGES.target;
}

export function checkCount(count: number | null): string | null {
  return isWholeIn(count, 0, LIMITS.countMax) ? null : MESSAGES.count;
}

export function checkNote(note: string | undefined): string | null {
  return note !== undefined && note.length > LIMITS.noteLength ? MESSAGES.noteLong : null;
}

export function isHabitColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function isHabitIconId(value: unknown): value is string {
  return typeof value === 'string' && Object.hasOwn(HABIT_ICON_PATHS, value);
}

export function checkSchedule(schedule: Schedule): string | null {
  if (schedule.kind === 'weekdays') {
    const { days } = schedule;
    if (days.length === 0) return MESSAGES.days;
    if (!days.every((d) => isWholeIn(d, 0, 6)) || new Set(days).size !== days.length) return MESSAGES.days;
  }
  if (schedule.kind === 'perWeek' && !isWholeIn(schedule.times, 1, LIMITS.timesPerWeekMax)) return MESSAGES.times;
  return null;
}

export function checkGoal(goal: Goal): string | null {
  if (goal.kind !== 'count') return null;
  return checkTarget(goal.target) ?? (goal.unit.length > LIMITS.unitLength ? MESSAGES.unitLong : null);
}

export interface DraftFields {
  name: string;
  icon: string;
  color: string;
  schedule: Schedule;
  goal: Goal;
  reminderTime: string | null;
}

/** First problem with a habit as it would be saved, or null when it can be saved. */
export function checkHabitDraft(d: DraftFields): string | null {
  if (d.name.trim() === '') return MESSAGES.nameEmpty;
  if (d.name.length > LIMITS.nameLength) return MESSAGES.nameLong;
  if (!isHabitIconId(d.icon)) return MESSAGES.icon;
  if (!isHabitColor(d.color)) return MESSAGES.color;
  if (d.reminderTime !== null && parseTimeOfDay(d.reminderTime) === null) return MESSAGES.reminder;
  return checkSchedule(d.schedule) ?? checkGoal(d.goal);
}
