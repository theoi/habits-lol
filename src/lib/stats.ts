import { addDays, eachDay, maxDay, minDay, startOfWeek } from './dates';
import { effectiveStart, goalTarget, isDoneCount, isScheduledOn, weekProgress } from './schedule';
import type { DayCounts, DayKey, Habit, WeekStart } from './types';

export interface Rate {
  done: number;
  expected: number;
  /** done / expected, or null when nothing was expected yet. */
  rate: number | null;
}

function rate(done: number, expected: number): Rate {
  return { done, expected, rate: expected > 0 ? done / expected : null };
}

/**
 * Share of expected completions met in `[from, to]`, clipped to the habit's
 * start and today. An unfinished today (or, for per-week habits, an unfinished
 * current week) is left out rather than counted as missed. Per-week habits are
 * measured in whole weeks overlapping the range.
 */
export function completionRate(
  habit: Habit,
  counts: DayCounts,
  from: DayKey,
  to: DayKey,
  today: DayKey,
  weekStartsOn: WeekStart,
): Rate {
  const start = effectiveStart(habit, counts);
  const lo = maxDay(from, start);
  const hi = minDay(to, today);
  if (lo > hi) return rate(0, 0);

  if (habit.schedule.kind === 'perWeek') {
    let done = 0;
    let expected = 0;
    const thisWeek = startOfWeek(today, weekStartsOn);
    for (let ws = startOfWeek(lo, weekStartsOn); ws <= hi; ws = addDays(ws, 7)) {
      const wp = weekProgress(habit, counts, ws, weekStartsOn, start);
      const achieved = Math.min(wp.done, wp.required);
      if (ws === thisWeek && achieved < wp.required) continue;
      done += achieved;
      expected += wp.required;
    }
    return rate(done, expected);
  }

  let done = 0;
  let expected = 0;
  for (const day of eachDay(lo, hi)) {
    if (!isScheduledOn(habit.schedule, day)) continue;
    if (isDoneCount(habit.goal, counts.get(day) ?? 0)) {
      done++;
      expected++;
    } else if (day !== today) {
      expected++;
    }
  }
  return rate(done, expected);
}

export interface WeekRate extends Rate {
  weekStart: DayKey;
}

/** Completion rate for each of the last `weeks` weeks, oldest first. */
export function weeklyRates(
  habit: Habit,
  counts: DayCounts,
  today: DayKey,
  weekStartsOn: WeekStart,
  weeks: number,
): WeekRate[] {
  const thisWeek = startOfWeek(today, weekStartsOn);
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(thisWeek, -7 * (weeks - 1 - i));
    return { weekStart: ws, ...completionRate(habit, counts, ws, addDays(ws, 6), today, weekStartsOn) };
  });
}

export type CellState = 'future' | 'beforeStart' | 'done' | 'partial' | 'missed' | 'pending' | 'open' | 'rest';

export interface DayCell {
  day: DayKey;
  count: number;
  target: number;
  /** 0 (nothing) to 4 (goal met), for heatmap shading. */
  level: 0 | 1 | 2 | 3 | 4;
  state: CellState;
}

/**
 * Per-day view of a habit for heatmaps and calendars. `missed` applies only to
 * past scheduled days of day-based habits; per-week habits have no single
 * missed day, so their empty days are `open`.
 */
export function dayCells(habit: Habit, counts: DayCounts, from: DayKey, to: DayKey, today: DayKey): DayCell[] {
  const start = effectiveStart(habit, counts);
  const target = goalTarget(habit.goal);
  return eachDay(from, to).map((day) => {
    const count = counts.get(day) ?? 0;
    const done = isDoneCount(habit.goal, count);
    const level = done ? 4 : count > 0 ? (Math.min(3, 1 + Math.floor((3 * count) / target)) as 1 | 2 | 3) : 0;
    let state: CellState;
    if (day > today) state = 'future';
    else if (done) state = 'done';
    else if (count > 0) state = 'partial';
    else if (day < start) state = 'beforeStart';
    else if (!isScheduledOn(habit.schedule, day)) state = 'rest';
    else if (day === today) state = 'pending';
    else if (habit.schedule.kind === 'perWeek') state = 'open';
    else state = 'missed';
    return { day, count, target, level, state };
  });
}
