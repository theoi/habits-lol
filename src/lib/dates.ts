import { format } from 'date-fns';
import type { DayKey, Weekday, WeekStart } from './types';

const DAY_MS = 86_400_000;
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar day of an instant. */
export function toDayKey(date: Date): DayKey {
  return format(date, 'yyyy-MM-dd');
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string') return false;
  const m = KEY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function parts(key: DayKey): [number, number, number] {
  const m = KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Day keys are calendar labels, so arithmetic on them runs on a UTC epoch-day
 * number. That keeps it independent of the device's time zone and DST rules.
 */
export function dayNumber(key: DayKey): number {
  const [y, m, d] = parts(key);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(n: number): DayKey {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(key: DayKey, n: number): DayKey {
  return fromDayNumber(dayNumber(key) + n);
}

/** Whole calendar days from `b` to `a` (positive when `a` is later). */
export function diffDays(a: DayKey, b: DayKey): number {
  return dayNumber(a) - dayNumber(b);
}

export function weekdayOf(key: DayKey): Weekday {
  // 1970-01-01 was a Thursday.
  return (((dayNumber(key) + 4) % 7) + 7) % 7 as Weekday;
}

export function startOfWeek(key: DayKey, weekStartsOn: WeekStart): DayKey {
  const back = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -back);
}

export function endOfWeek(key: DayKey, weekStartsOn: WeekStart): DayKey {
  return addDays(startOfWeek(key, weekStartsOn), 6);
}

/** Inclusive list of days from `from` to `to`; empty when `from` is after `to`. */
export function eachDay(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let n = dayNumber(from), end = dayNumber(to); n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

export function minDay(a: DayKey, b: DayKey): DayKey {
  return a < b ? a : b;
}

export function maxDay(a: DayKey, b: DayKey): DayKey {
  return a > b ? a : b;
}

export function startOfMonth(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export function addMonths(key: DayKey, n: number): DayKey {
  const [y, m, d] = parts(key);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fromDayNumber(Math.round(Date.UTC(ny, nm, Math.min(d, lastDay)) / DAY_MS));
}

export function daysInMonth(key: DayKey): number {
  const [y, m] = parts(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** A local `Date` at noon on the given day, for display formatting only. */
export function dateForDisplay(key: DayKey): Date {
  const [y, m, d] = parts(key);
  return new Date(y, m - 1, d, 12);
}

/** Weekdays in display order for the given week start. */
export function orderedWeekdays(weekStartsOn: WeekStart): Weekday[] {
  return Array.from({ length: 7 }, (_, i) => ((i + weekStartsOn) % 7) as Weekday);
}

/** Minutes since local midnight for a `HH:mm` string, or null when malformed. */
export function parseTimeOfDay(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Minutes since local midnight, read from the wall clock. */
export function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}
