import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  archiveHabit,
  claimReminder,
  createHabit,
  deleteHabit,
  exportAll,
  getLastFired,
  getSettings,
  reorderHabits,
  replaceAll,
  restoreHabit,
  saveSettings,
  setCheckIn,
  type HabitDraft,
} from './repo';

const draft = (name: string): HabitDraft => ({
  name,
  icon: '💧',
  color: '#3a7bd5',
  schedule: { kind: 'daily' },
  goal: { kind: 'check' },
  reminderTime: null,
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('habits', () => {
  it('creates habits in order with a local start day', async () => {
    const a = await createHabit(draft('A'), new Date(2026, 10, 12, 23, 30));
    const b = await createHabit(draft('B'));
    expect(a.startDay).toBe('2026-11-12');
    expect([a.order, b.order]).toEqual([0, 1]);
    expect(await db.habits.count()).toBe(2);
  });

  it('reorders, archives, and restores to the end', async () => {
    const [a, b, c] = [await createHabit(draft('A')), await createHabit(draft('B')), await createHabit(draft('C'))];
    await reorderHabits([c.id, a.id, b.id]);
    expect((await db.habits.orderBy('order').toArray()).map((h) => h.name)).toEqual(['C', 'A', 'B']);
    await archiveHabit(c.id);
    expect((await db.habits.get(c.id))!.archivedAt).not.toBeNull();
    await restoreHabit(c.id);
    const restored = (await db.habits.get(c.id))!;
    expect(restored.archivedAt).toBeNull();
    expect(restored.order).toBe(3);
  });

  it('deletes a habit with its check-ins', async () => {
    const a = await createHabit(draft('A'));
    const b = await createHabit(draft('B'));
    await setCheckIn(a.id, '2026-11-10', { count: 1 });
    await setCheckIn(b.id, '2026-11-10', { count: 1 });
    await deleteHabit(a.id);
    expect((await db.checkIns.toArray()).map((c) => c.habitId)).toEqual([b.id]);
  });
});

describe('check-ins', () => {
  it('stores counts and notes and removes empty check-ins', async () => {
    const a = await createHabit(draft('A'));
    await setCheckIn(a.id, '2026-11-10', { count: 3, note: 'ok' });
    expect(await db.checkIns.get([a.id, '2026-11-10'])).toMatchObject({ count: 3, note: 'ok' });
    await setCheckIn(a.id, '2026-11-10', { count: 0, note: 'kept note' });
    expect(await db.checkIns.get([a.id, '2026-11-10'])).toMatchObject({ count: 0, note: 'kept note' });
    await setCheckIn(a.id, '2026-11-10', { count: 0, note: '  ' });
    expect(await db.checkIns.get([a.id, '2026-11-10'])).toBeUndefined();
  });
});

describe('reminders', () => {
  it('lets exactly one concurrent caller claim a habit-day', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => claimReminder('h', '2026-11-12')));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await claimReminder('h', '2026-11-13')).toBe(true);
    expect(await getLastFired()).toEqual({ h: '2026-11-13' });
  });
});

describe('export and import', () => {
  it('replaces everything and exports the same data back', async () => {
    const a = await createHabit(draft('A'));
    await setCheckIn(a.id, '2026-11-10', { count: 1, note: 'first' });
    await saveSettings({ weekStartsOn: 0 });
    const snapshot = await exportAll();

    await createHabit(draft('Extra'));
    await setCheckIn(a.id, '2026-11-11', { count: 1 });
    await saveSettings({ weekStartsOn: 1 });

    await replaceAll(snapshot);
    expect(await exportAll()).toEqual(snapshot);
    expect(await getSettings()).toEqual({ weekStartsOn: 0 });
  });

  it('keeps reminder history so an import does not re-fire today', async () => {
    await claimReminder('h', '2026-11-12');
    await replaceAll({ settings: { weekStartsOn: 1 }, habits: [], checkIns: [] });
    expect(await claimReminder('h', '2026-11-12')).toBe(false);
  });
});
