import { addDays, dayNumber, fromDayNumber, startOfWeek } from './dates';
import { effectiveStart, isDoneCount, isScheduledOn, weekProgress } from './schedule';
import type { DayCounts, DayKey, Habit, WeekStart } from './types';

export interface Streaks {
  current: number;
  best: number;
  unit: 'day' | 'week';
}

/**
 * Day habits: consecutive scheduled days with the goal met. Unscheduled days
 * neither count nor break a streak, and an unfinished today is still pending.
 *
 * Per-week habits: consecutive weeks meeting the weekly target. The current
 * week only counts once met and never breaks the streak while in progress.
 */
export function computeStreaks(habit: Habit, counts: DayCounts, today: DayKey, weekStartsOn: WeekStart): Streaks {
  const start = effectiveStart(habit, counts);
  if (start > today) return { current: 0, best: 0, unit: habit.schedule.kind === 'perWeek' ? 'week' : 'day' };

  if (habit.schedule.kind === 'perWeek') {
    let run = 0;
    let best = 0;
    const thisWeek = startOfWeek(today, weekStartsOn);
    for (let ws = startOfWeek(start, weekStartsOn); ws <= thisWeek; ws = addDays(ws, 7)) {
      const wp = weekProgress(habit, counts, ws, weekStartsOn, start);
      if (wp.done >= wp.required) {
        run++;
        best = Math.max(best, run);
      } else if (ws !== thisWeek) {
        run = 0;
      }
    }
    return { current: run, best, unit: 'week' };
  }

  let run = 0;
  let best = 0;
  for (let n = dayNumber(start), end = dayNumber(today); n <= end; n++) {
    const day = fromDayNumber(n);
    if (!isScheduledOn(habit.schedule, day)) continue;
    if (isDoneCount(habit.goal, counts.get(day) ?? 0)) {
      run++;
      best = Math.max(best, run);
    } else if (day !== today) {
      run = 0;
    }
  }
  return { current: run, best, unit: 'day' };
}

/** Total days with the goal met, scheduled or not. */
export function totalDone(habit: Habit, counts: DayCounts): number {
  let n = 0;
  for (const c of counts.values()) if (isDoneCount(habit.goal, c)) n++;
  return n;
}
