import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { db, HabitsDB } from './db';
import {
  archiveHabit,
  claimReminder,
  createHabit,
  deleteHabit,
  exportAll,
  getLastFired,
  getSettings,
  releaseReminder,
  reorderHabits,
  replaceAll,
  restoreHabit,
  saveSettings,
  setCheckIn,
  type HabitDraft,
} from './repo';

const draft = (name: string): HabitDraft => ({
  name,
  icon: 'droplet',
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

  it('lets a released claim be claimed again, without touching other days', async () => {
    expect(await claimReminder('h', '2026-11-12')).toBe(true);
    await releaseReminder('h', '2026-11-11');
    expect(await claimReminder('h', '2026-11-12')).toBe(false);
    await releaseReminder('h', '2026-11-12');
    expect(await claimReminder('h', '2026-11-12')).toBe(true);
  });
});

describe('export and import', () => {
  it('replaces everything and exports the same data back', async () => {
    const a = await createHabit(draft('A'));
    await setCheckIn(a.id, '2026-11-10', { count: 1, note: 'first' });
    await saveSettings({ weekStartsOn: 0, compact: true });
    const snapshot = await exportAll();

    await createHabit(draft('Extra'));
    await setCheckIn(a.id, '2026-11-11', { count: 1 });
    await saveSettings({ weekStartsOn: 1, compact: false });

    await replaceAll(snapshot);
    expect(await exportAll()).toEqual(snapshot);
    expect(await getSettings()).toEqual({ weekStartsOn: 0, compact: true });
  });

  it('keeps reminder history so an import does not re-fire today', async () => {
    await claimReminder('h', '2026-11-12');
    await replaceAll({ settings: { weekStartsOn: 1, compact: false }, habits: [], checkIns: [] });
    expect(await claimReminder('h', '2026-11-12')).toBe(false);
  });
});

describe('schema upgrade', () => {
  it('maps emoji icons from version 1 data to line icons', async () => {
    const v1 = new Dexie('upgrade-test');
    v1.version(1).stores({ habits: 'id, order', checkIns: '[habitId+day], habitId, day', meta: 'key' });
    await v1.table('habits').bulkAdd([
      { id: 'a', name: 'Water', icon: '💧', order: 0 },
      { id: 'b', name: 'Gym', icon: '🏋️', order: 1 },
      { id: 'c', name: 'Odd', icon: '🦄', order: 2 },
    ]);
    v1.close();

    const upgraded = new HabitsDB('upgrade-test');
    const icons = (await upgraded.habits.orderBy('order').toArray()).map((h) => h.icon);
    expect(icons).toEqual(['droplet', 'dumbbell', 'check']);
    upgraded.close();
    await Dexie.delete('upgrade-test');
  });

  it('deletes check-ins whose habit no longer exists, keeping the rest', async () => {
    const v2 = new Dexie('orphan-test');
    v2.version(1).stores({ habits: 'id, order', checkIns: '[habitId+day], habitId, day', meta: 'key' });
    v2.version(2).stores({});
    const kept = [
      { habitId: 'a', day: '2026-11-10', count: 1, updatedAt: '2026-11-10T20:00:00.000Z' },
      { habitId: 'a', day: '2026-11-11', count: 0, note: 'note only', updatedAt: '2026-11-11T20:00:00.000Z' },
    ];
    await v2.table('habits').bulkAdd([{ id: 'a', name: 'Kept', icon: 'droplet', order: 0 }]);
    await v2.table('checkIns').bulkAdd([
      ...kept,
      { habitId: 'gone', day: '2026-11-10', count: 3, note: 'saved after delete', updatedAt: '2026-11-10T21:00:00.000Z' },
      { habitId: 'gone', day: '2026-11-11', count: 1, updatedAt: '2026-11-11T21:00:00.000Z' },
    ]);
    v2.close();

    const upgraded = new HabitsDB('orphan-test');
    expect(await upgraded.checkIns.toArray()).toEqual(kept);
    expect(upgraded.verno).toBe(3);
    upgraded.close();
    await Dexie.delete('orphan-test');
  });
});

describe('export', () => {
  it('leaves out check-ins whose habit no longer exists', async () => {
    const a = await createHabit(draft('A'));
    await setCheckIn(a.id, '2026-11-10', { count: 1 });
    await db.checkIns.put({ habitId: 'gone', day: '2026-11-10', count: 1, updatedAt: '2026-11-10T20:00:00.000Z' });
    const data = await exportAll();
    expect(data.checkIns.map((c) => c.habitId)).toEqual([a.id]);
  });
});
