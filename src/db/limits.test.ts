import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeBackup, parseBackup } from '../lib/backup';
import { LIMITS, MESSAGES } from '../lib/limits';
import { db } from './db';
import { createHabit, exportAll, replaceAll, setCheckIn, updateHabit, type HabitDraft } from './repo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

const NOTE = ('Ünïcödé “quotes” and a line break\n' + 'x'.repeat(LIMITS.noteLength)).slice(0, LIMITS.noteLength);

const maxDraft: HabitDraft = {
  name: 'N'.repeat(LIMITS.nameLength - 2) + 'ñé',
  icon: 'droplet',
  color: '#3d7fb8',
  schedule: { kind: 'perWeek', times: LIMITS.timesPerWeekMax },
  goal: { kind: 'count', target: LIMITS.targetMax, unit: 'u'.repeat(LIMITS.unitLength) },
  reminderTime: '23:59',
};

async function roundTrip() {
  const before = await exportAll();
  const parsed = parseBackup(JSON.stringify(makeBackup(before)));
  return { before, parsed };
}

describe('saved values always survive export and import', () => {
  it('round-trips the largest values the app allows, exactly', async () => {
    const h = await createHabit(maxDraft);
    await createHabit({ ...maxDraft, name: 'Days', schedule: { kind: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] } });
    await setCheckIn(h.id, '2026-11-12', { count: LIMITS.countMax, note: NOTE });
    await setCheckIn(h.id, '2026-11-11', { count: 0, note: 'note only' });

    const { before, parsed } = await roundTrip();
    expect(parsed).toEqual({ ok: true, data: before, skippedCheckIns: 0 });
    expect(NOTE.length).toBe(LIMITS.noteLength);

    await db.delete();
    await db.open();
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceAll(parsed.data);
    expect(await exportAll()).toEqual(before);
  });

  // Each case is rejected by the save path and by the importer alike.
  const overLimit: Array<[string, Partial<HabitDraft>, RegExp, RegExp]> = [
    ['a target one over the limit', { goal: { kind: 'count', target: LIMITS.targetMax + 1, unit: '' } }, /Target must/, /goal\.target/],
    ['a zero target', { goal: { kind: 'count', target: 0, unit: '' } }, /Target must/, /goal\.target/],
    ['a fractional target', { goal: { kind: 'count', target: 2.5, unit: '' } }, /Target must/, /goal\.target/],
    ['a name one over the limit', { name: 'n'.repeat(LIMITS.nameLength + 1) }, /name/, /name is too long/],
    ['a blank name', { name: '   ' }, /name/, /name must not be empty/],
    ['a unit one over the limit', { goal: { kind: 'count', target: 1, unit: 'u'.repeat(LIMITS.unitLength + 1) } }, /unit/, /unit is too long/],
    ['8 times a week', { schedule: { kind: 'perWeek', times: 8 } }, /Times a week/, /times/],
    ['no weekdays', { schedule: { kind: 'weekdays', days: [] } }, /Pick at least one day/, /days/],
    ['a repeated weekday', { schedule: { kind: 'weekdays', days: [1, 1] } }, /Pick at least one day/, /duplicates/],
    ['a bad reminder time', { reminderTime: '24:00' }, /reminder/, /reminderTime/],
    ['a reminder time with seconds', { reminderTime: '07:30:00' }, /reminder/, /reminderTime/],
    ['a non-hex color', { color: 'red' }, /color/, /color/],
  ];

  it.each(overLimit)('rejects %s when saving and when importing', async (_, change, saveMsg, importMsg) => {
    const draft = { ...maxDraft, ...change } as HabitDraft;
    await expect(createHabit(draft)).rejects.toThrow(saveMsg);
    const ok = await createHabit(maxDraft);
    await expect(updateHabit(ok.id, draft)).rejects.toThrow(saveMsg);

    const data = await exportAll();
    data.habits[0] = { ...data.habits[0]!, ...change };
    const parsed = parseBackup(JSON.stringify(makeBackup(data)));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(importMsg);
  });

  it.each([
    ['a count one over the limit', { count: LIMITS.countMax + 1 }, MESSAGES.count, /count/],
    ['a negative count', { count: -1 }, MESSAGES.count, /count/],
    ['a fractional count', { count: 1.5 }, MESSAGES.count, /count/],
    ['a note one over the limit', { count: 1, note: 'x'.repeat(LIMITS.noteLength + 1) }, MESSAGES.noteLong, /note is too long/],
  ])('rejects %s when saving and when importing', async (_, value, saveMsg, importMsg) => {
    const h = await createHabit(maxDraft);
    await expect(setCheckIn(h.id, '2026-11-12', value)).rejects.toThrow(saveMsg);
    expect(await db.checkIns.count()).toBe(0);

    const data = await exportAll();
    data.checkIns.push({ habitId: h.id, day: '2026-11-12', updatedAt: '2026-11-12T10:00:00.000Z', ...value });
    const parsed = parseBackup(JSON.stringify(makeBackup(data)));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(importMsg);
  });

  it('does not save a check-in for a habit that no longer exists', async () => {
    await setCheckIn('deleted-elsewhere', '2026-11-12', { count: 1, note: 'late tap' });
    expect(await db.checkIns.count()).toBe(0);
    const { parsed } = await roundTrip();
    expect(parsed.ok).toBe(true);
  });
});
