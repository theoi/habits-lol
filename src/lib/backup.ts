import { isDayKey, parseTimeOfDay } from './dates';
import type { CheckIn, Goal, Habit, Schedule, Settings, Weekday } from './types';

export const BACKUP_FORMAT = 'habits-lol-backup';
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  settings: Settings;
  habits: Habit[];
  checkIns: CheckIn[];
}

export interface BackupData {
  settings: Settings;
  habits: Habit[];
  checkIns: CheckIn[];
}

export function makeBackup(data: BackupData, now: Date = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: data.settings,
    habits: data.habits,
    checkIns: data.checkIns,
  };
}

export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `habits-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ParseResult = { ok: true; data: BackupData } | { ok: false; error: string };

class Invalid extends Error {}

function fail(msg: string): never {
  throw new Invalid(msg);
}

type Obj = Record<string, unknown>;

function obj(v: unknown, where: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(`${where} must be an object`);
  return v as Obj;
}

function str(v: unknown, where: string, { max = 500, empty = false } = {}): string {
  if (typeof v !== 'string') fail(`${where} must be text`);
  if (!empty && v.trim() === '') fail(`${where} must not be empty`);
  if (v.length > max) fail(`${where} is too long`);
  return v;
}

function int(v: unknown, where: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max)
    fail(`${where} must be a whole number from ${min} to ${max}`);
  return v;
}

function timestamp(v: unknown, where: string): string {
  const s = str(v, where, { max: 40 });
  if (Number.isNaN(Date.parse(s))) fail(`${where} must be a date-time`);
  return s;
}

function schedule(v: unknown, where: string): Schedule {
  const o = obj(v, where);
  switch (o.kind) {
    case 'daily':
      return { kind: 'daily' };
    case 'weekdays': {
      if (!Array.isArray(o.days) || o.days.length === 0) fail(`${where}.days must list at least one weekday`);
      const days = o.days.map((d, i) => int(d, `${where}.days[${i}]`, 0, 6) as Weekday);
      if (new Set(days).size !== days.length) fail(`${where}.days has duplicates`);
      return { kind: 'weekdays', days: [...days].sort() };
    }
    case 'perWeek':
      return { kind: 'perWeek', times: int(o.times, `${where}.times`, 1, 7) };
    default:
      return fail(`${where}.kind is not a known schedule`);
  }
}

function goal(v: unknown, where: string): Goal {
  const o = obj(v, where);
  if (o.kind === 'check') return { kind: 'check' };
  if (o.kind === 'count')
    return {
      kind: 'count',
      target: int(o.target, `${where}.target`, 1, 100_000),
      unit: str(o.unit, `${where}.unit`, { max: 40, empty: true }),
    };
  return fail(`${where}.kind is not a known goal`);
}

function habit(v: unknown, i: number): Habit {
  const w = `habits[${i}]`;
  const o = obj(v, w);
  const reminder = o.reminderTime ?? null;
  if (reminder !== null && (typeof reminder !== 'string' || parseTimeOfDay(reminder) === null))
    fail(`${w}.reminderTime must be HH:mm or null`);
  if (!isDayKey(o.startDay)) fail(`${w}.startDay must be a YYYY-MM-DD date`);
  if (typeof o.order !== 'number' || !Number.isFinite(o.order)) fail(`${w}.order must be a number`);
  return {
    id: str(o.id, `${w}.id`, { max: 100 }),
    name: str(o.name, `${w}.name`, { max: 200 }),
    icon: str(o.icon, `${w}.icon`, { max: 40, empty: true }),
    color: str(o.color, `${w}.color`, { max: 40 }),
    schedule: schedule(o.schedule, `${w}.schedule`),
    goal: goal(o.goal, `${w}.goal`),
    reminderTime: reminder as string | null,
    order: o.order,
    createdAt: timestamp(o.createdAt, `${w}.createdAt`),
    startDay: o.startDay,
    archivedAt: o.archivedAt == null ? null : timestamp(o.archivedAt, `${w}.archivedAt`),
  };
}

function checkIn(v: unknown, i: number, ids: Set<string>): CheckIn {
  const w = `checkIns[${i}]`;
  const o = obj(v, w);
  const habitId = str(o.habitId, `${w}.habitId`, { max: 100 });
  if (!ids.has(habitId)) fail(`${w} refers to a habit that is not in the file`);
  if (!isDayKey(o.day)) fail(`${w}.day must be a YYYY-MM-DD date`);
  const out: CheckIn = {
    habitId,
    day: o.day,
    count: int(o.count, `${w}.count`, 0, 1_000_000),
    updatedAt: timestamp(o.updatedAt, `${w}.updatedAt`),
  };
  if (o.note !== undefined) out.note = str(o.note, `${w}.note`, { max: 5000, empty: true });
  return out;
}

/** Validates a backup file's text. Never partially accepts a file. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  try {
    const o = obj(raw, 'Backup');
    if (o.format !== BACKUP_FORMAT) fail('This is not a Habits backup file');
    const version = int(o.version, 'version', 1, Number.MAX_SAFE_INTEGER);
    if (version > BACKUP_VERSION) fail('This backup was made by a newer version of the app');
    const s = obj(o.settings, 'settings');
    if (s.weekStartsOn !== 0 && s.weekStartsOn !== 1) fail('settings.weekStartsOn must be 0 or 1');
    if (!Array.isArray(o.habits)) fail('habits must be a list');
    if (!Array.isArray(o.checkIns)) fail('checkIns must be a list');
    const habits = o.habits.map(habit);
    const ids = new Set(habits.map((h) => h.id));
    if (ids.size !== habits.length) fail('Two habits share the same id');
    const checkIns = o.checkIns.map((c, i) => checkIn(c, i, ids));
    const keys = new Set(checkIns.map((c) => `${c.habitId}|${c.day}`));
    if (keys.size !== checkIns.length) fail('Two check-ins share the same habit and day');
    return { ok: true, data: { settings: { weekStartsOn: s.weekStartsOn }, habits, checkIns } };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `${e.message}.` };
    throw e;
  }
}
