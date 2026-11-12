import { minutesOfDay, parseTimeOfDay, toDayKey } from './dates';
import { dayStatus } from './schedule';
import type { DayCounts, DayKey, Habit, WeekStart } from './types';

/** How long after its set time a reminder may still fire, e.g. after a throttled timer or a sleeping laptop. */
export const REMINDER_GRACE_MINUTES = 60;

export interface ReminderCheck {
  habits: readonly Habit[];
  countsByHabit: ReadonlyMap<string, DayCounts>;
  now: Date;
  /** Last day each habit's reminder fired. */
  lastFired: Readonly<Record<string, DayKey>>;
  weekStartsOn: WeekStart;
  graceMinutes?: number;
}

/**
 * Habits whose reminder should fire now: active, reminder time reached within
 * the grace window, not fired yet today, and still due today.
 */
export function remindersDue({
  habits,
  countsByHabit,
  now,
  lastFired,
  weekStartsOn,
  graceMinutes = REMINDER_GRACE_MINUTES,
}: ReminderCheck): Habit[] {
  const today = toDayKey(now);
  const nowMin = minutesOfDay(now);
  return habits.filter((h) => {
    if (h.archivedAt !== null || !h.reminderTime || h.startDay > today) return false;
    if (lastFired[h.id] === today) return false;
    const at = parseTimeOfDay(h.reminderTime);
    if (at === null || nowMin < at || nowMin > at + graceMinutes) return false;
    return dayStatus(h, countsByHabit.get(h.id) ?? new Map(), today, weekStartsOn) === 'due';
  });
}
