import { DEFAULT_SETTINGS, type CheckIn, type DayKey, type Habit, type Settings } from '../lib/types';
import { todayKey } from '../lib/dates';
import type { BackupData } from '../lib/backup';
import { checkCount, checkHabitDraft, checkNote } from '../lib/limits';
import { db } from './db';

const SETTINGS_KEY = 'settings';
const LAST_FIRED_KEY = 'reminders.lastFired';

export type HabitDraft = Pick<Habit, 'name' | 'icon' | 'color' | 'schedule' | 'goal' | 'reminderTime'>;

function newId(): string {
  return crypto.randomUUID();
}

async function nextOrder(): Promise<number> {
  const last = await db.habits.orderBy('order').last();
  return last ? last.order + 1 : 0;
}

/** Rejects a value the backup importer would not accept, so every save can be restored from a backup. */
function assertValid(problem: string | null): void {
  if (problem) throw new RangeError(problem);
}

export async function createHabit(draft: HabitDraft, now: Date = new Date()): Promise<Habit> {
  assertValid(checkHabitDraft(draft));
  return db.transaction('rw', db.habits, async () => {
    const habit: Habit = {
      ...draft,
      id: newId(),
      order: await nextOrder(),
      createdAt: now.toISOString(),
      startDay: todayKey(now),
      archivedAt: null,
    };
    await db.habits.add(habit);
    return habit;
  });
}

export async function updateHabit(id: string, draft: HabitDraft): Promise<void> {
  assertValid(checkHabitDraft(draft));
  await db.habits.update(id, { ...draft });
}

export async function archiveHabit(id: string, now: Date = new Date()): Promise<void> {
  await db.habits.update(id, { archivedAt: now.toISOString() });
}

export async function restoreHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    await db.habits.update(id, { archivedAt: null, order: await nextOrder() });
  });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.checkIns, async () => {
    await db.checkIns.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  });
}

/** Persists the given order for the listed habits; others keep theirs. */
export async function reorderHabits(ids: readonly string[]): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    await Promise.all(ids.map((id, order) => db.habits.update(id, { order })));
  });
}

/**
 * Sets a day's count and note. A zero count without a note removes the
 * check-in. Does nothing if the habit no longer exists (for example, deleted
 * in another tab), since a check-in without its habit would make backups fail.
 */
export async function setCheckIn(
  habitId: string,
  day: DayKey,
  value: { count: number; note?: string },
  now: Date = new Date(),
): Promise<void> {
  const note = value.note?.trim() ? value.note : undefined;
  assertValid(checkCount(value.count) ?? checkNote(note));
  await db.transaction('rw', db.habits, db.checkIns, async () => {
    if (value.count === 0 && !note) {
      await db.checkIns.delete([habitId, day]);
      return;
    }
    if (!(await db.habits.get(habitId))) return;
    const row: CheckIn = { habitId, day, count: value.count, updatedAt: now.toISOString() };
    if (note) row.note = note;
    await db.checkIns.put(row);
  });
}

export async function getSettings(): Promise<Settings> {
  const row = await db.meta.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.meta.put({ key: SETTINGS_KEY, value: settings });
}

/**
 * Records that a habit's reminder fired today. Returns false when it already
 * fired, including from another open tab: IndexedDB serializes the
 * read-modify-write transactions, so only one caller can claim a day.
 */
export async function claimReminder(habitId: string, day: DayKey): Promise<boolean> {
  return db.transaction('rw', db.meta, async () => {
    const row = await db.meta.get(LAST_FIRED_KEY);
    const lastFired = { ...((row?.value as Record<string, DayKey> | undefined) ?? {}) };
    if (lastFired[habitId] === day) return false;
    lastFired[habitId] = day;
    await db.meta.put({ key: LAST_FIRED_KEY, value: lastFired });
    return true;
  });
}

/** Undoes a claim whose notification could not be shown, so a later check retries it. */
export async function releaseReminder(habitId: string, day: DayKey): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    const row = await db.meta.get(LAST_FIRED_KEY);
    const lastFired = { ...((row?.value as Record<string, DayKey> | undefined) ?? {}) };
    if (lastFired[habitId] !== day) return;
    delete lastFired[habitId];
    await db.meta.put({ key: LAST_FIRED_KEY, value: lastFired });
  });
}

export async function getLastFired(): Promise<Record<string, DayKey>> {
  const row = await db.meta.get(LAST_FIRED_KEY);
  return (row?.value as Record<string, DayKey> | undefined) ?? {};
}

/** All data for a backup. Check-ins whose habit no longer exists are left out. */
export async function exportAll(): Promise<BackupData> {
  return db.transaction('r', db.habits, db.checkIns, db.meta, async () => {
    const habits = await db.habits.orderBy('order').toArray();
    const ids = new Set(habits.map((h) => h.id));
    return {
      settings: await getSettings(),
      habits,
      checkIns: (await db.checkIns.toArray()).filter((c) => ids.has(c.habitId)),
    };
  });
}

/** Replaces every habit, check-in, and setting with the given data in one transaction. */
export async function replaceAll(data: BackupData): Promise<void> {
  await db.transaction('rw', db.habits, db.checkIns, db.meta, async () => {
    await Promise.all([db.habits.clear(), db.checkIns.clear()]);
    await db.habits.bulkAdd(data.habits);
    await db.checkIns.bulkAdd(data.checkIns);
    await saveSettings(data.settings);
  });
}
