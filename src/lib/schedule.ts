import { eachDay, endOfWeek, maxDay, startOfWeek, weekdayOf } from './dates';
import type { CheckIn, DayCounts, DayKey, Goal, Habit, Schedule, WeekStart } from './types';

export function goalTarget(goal: Goal): number {
  return goal.kind === 'count' ? Math.max(1, goal.target) : 1;
}

export function isDoneCount(goal: Goal, count: number): boolean {
  return count >= goalTarget(goal);
}

/** Whether the schedule asks for the habit on this day. Per-week habits can be done on any day. */
export function isScheduledOn(schedule: Schedule, day: DayKey): boolean {
  switch (schedule.kind) {
    case 'daily':
    case 'perWeek':
      return true;
    case 'weekdays':
      return schedule.days.includes(weekdayOf(day));
  }
}

export function countsFor(habitId: string, checkIns: Iterable<CheckIn>): Map<DayKey, number> {
  const map = new Map<DayKey, number>();
  for (const c of checkIns) if (c.habitId === habitId && c.count > 0) map.set(c.day, c.count);
  return map;
}

/** First tracked day: the start day, or an earlier back-filled check-in. */
export function effectiveStart(habit: Habit, counts: DayCounts): DayKey {
  let start = habit.startDay;
  for (const day of counts.keys()) if (day < start) start = day;
  return start;
}

export interface WeekProgress {
  weekStart: DayKey;
  /** Days in the week with the goal met. */
  done: number;
  /** Days needed this week: `times`, reduced when the habit started mid-week. */
  required: number;
}

/** Progress of a per-week habit in the week containing `day`. */
export function weekProgress(
  habit: Habit,
  counts: DayCounts,
  day: DayKey,
  weekStartsOn: WeekStart,
  start: DayKey = effectiveStart(habit, counts),
): WeekProgress {
  const ws = startOfWeek(day, weekStartsOn);
  const we = endOfWeek(day, weekStartsOn);
  const times = habit.schedule.kind === 'perWeek' ? habit.schedule.times : 7;
  const available = Math.max(0, eachDay(maxDay(ws, start), we).length);
  let done = 0;
  for (const d of eachDay(ws, we)) if (isDoneCount(habit.goal, counts.get(d) ?? 0)) done++;
  return { weekStart: ws, done, required: Math.min(times, available) };
}

export type DayStatus =
  /** Scheduled and not yet met. */
  | 'due'
  | 'done'
  /** Per-week goal already met this week; doing it again is optional. */
  | 'weekMet'
  /** Not scheduled on this day. */
  | 'rest';

export function dayStatus(habit: Habit, counts: DayCounts, day: DayKey, weekStartsOn: WeekStart): DayStatus {
  if (isDoneCount(habit.goal, counts.get(day) ?? 0)) return 'done';
  if (!isScheduledOn(habit.schedule, day)) return 'rest';
  if (habit.schedule.kind === 'perWeek') {
    const wp = weekProgress(habit, counts, day, weekStartsOn);
    if (wp.done >= wp.required) return 'weekMet';
  }
  return 'due';
}
