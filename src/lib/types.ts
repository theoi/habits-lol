/** Local calendar day in `YYYY-MM-DD` form. All tracking logic works on these, never on timestamps. */
export type DayKey = string;

/** 0 = Sunday … 6 = Saturday, matching `Date#getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekStart = 0 | 1;

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'perWeek'; times: number };

export type Goal = { kind: 'check' } | { kind: 'count'; target: number; unit: string };

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  schedule: Schedule;
  goal: Goal;
  /** Local time `HH:mm`, or null for no reminder. */
  reminderTime: string | null;
  order: number;
  /** ISO timestamp. */
  createdAt: string;
  /** First local day the habit is tracked. */
  startDay: DayKey;
  /** ISO timestamp, or null while active. */
  archivedAt: string | null;
}

export interface CheckIn {
  habitId: string;
  day: DayKey;
  count: number;
  note?: string;
  /** ISO timestamp. */
  updatedAt: string;
}

export interface Settings {
  weekStartsOn: WeekStart;
}

export const DEFAULT_SETTINGS: Settings = { weekStartsOn: 1 };

/** Check-in counts for one habit, keyed by day. */
export type DayCounts = ReadonlyMap<DayKey, number>;
