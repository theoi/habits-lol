import { format } from 'date-fns';
import { dateForDisplay, orderedWeekdays } from '../lib/dates';
import type { DayKey, Goal, Habit, Schedule, Weekday, WeekStart } from '../lib/types';

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function formatDay(day: DayKey, pattern: string): string {
  return format(dateForDisplay(day), pattern);
}

export function describeSchedule(schedule: Schedule, weekStartsOn: WeekStart): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'perWeek':
      return schedule.times === 1 ? 'Once a week' : `${schedule.times}× a week`;
    case 'weekdays': {
      const set = new Set<Weekday>(schedule.days);
      if (set.size === 7) return 'Every day';
      if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d as Weekday))) return 'Weekdays';
      if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
      return orderedWeekdays(weekStartsOn)
        .filter((d) => set.has(d))
        .map((d) => WEEKDAY_SHORT[d])
        .join(', ');
    }
  }
}

export function describeGoal(goal: Goal): string {
  return goal.kind === 'count' ? `${goal.target} ${goal.unit}`.trim() : '';
}

export function describeHabit(habit: Habit, weekStartsOn: WeekStart): string {
  return [describeSchedule(habit.schedule, weekStartsOn), describeGoal(habit.goal)].filter(Boolean).join(' · ');
}

export function formatStreak(n: number, unit: 'day' | 'week'): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

export function formatPercent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return format(new Date(2000, 0, 1, h, m), 'p');
}
