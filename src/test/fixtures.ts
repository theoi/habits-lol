/// <reference types="node" />
import type { DayKey, Goal, Habit, Schedule } from '../lib/types';

export function makeHabit(over: Partial<Habit> & { schedule?: Schedule; goal?: Goal } = {}): Habit {
  return {
    id: 'h1',
    name: 'Test habit',
    icon: 'check',
    color: '#4f8a6e',
    schedule: { kind: 'daily' },
    goal: { kind: 'check' },
    reminderTime: null,
    order: 0,
    createdAt: '2026-01-01T09:00:00.000Z',
    startDay: '2026-01-01',
    archivedAt: null,
    ...over,
  };
}

/** Counts map from day keys; a bare key means count 1. */
export function counts(entries: Array<DayKey | [DayKey, number]>): Map<DayKey, number> {
  return new Map(entries.map((e) => (typeof e === 'string' ? [e, 1] : e)));
}

/** Runs `fn` with the process time zone set to `tz`. */
export function withTZ<T>(tz: string, fn: () => T): T {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
}

/** Calendar day of an instant in `tz`, computed by Intl as an independent reference. */
export function intlDayKey(date: Date, tz: string): DayKey {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    date,
  );
}

export const ZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Australia/Sydney',
  'Australia/Lord_Howe',
  'Pacific/Auckland',
  'Asia/Kolkata',
  'Pacific/Kiritimati',
  'America/St_Johns',
];
