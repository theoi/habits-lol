import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, makeBackup, parseBackup, type BackupData } from './backup';
import { makeHabit } from '../test/fixtures';

const data: BackupData = {
  settings: { weekStartsOn: 0, compact: true },
  habits: [
    makeHabit({ id: 'a', name: 'Water', icon: 'droplet', goal: { kind: 'count', target: 8, unit: 'glasses' }, reminderTime: '09:00' }),
    makeHabit({
      id: 'b',
      name: 'Gym',
      order: 1,
      schedule: { kind: 'perWeek', times: 3 },
      archivedAt: '2026-11-01T10:00:00.000Z',
    }),
    makeHabit({ id: 'c', name: 'Read', order: 2, schedule: { kind: 'weekdays', days: [1, 3, 5] } }),
  ],
  checkIns: [
    { habitId: 'a', day: '2026-11-10', count: 6, note: 'Hot day 🌞\nsecond line', updatedAt: '2026-11-10T20:00:00.000Z' },
    { habitId: 'b', day: '2026-11-11', count: 1, updatedAt: '2026-11-11T20:00:00.000Z' },
  ],
};

function withChange(mutate: (b: Record<string, unknown>) => void): string {
  const b = JSON.parse(JSON.stringify(makeBackup(data))) as Record<string, unknown>;
  mutate(b);
  return JSON.stringify(b);
}

describe('backup', () => {
  it('round-trips all data without loss', () => {
    const text = JSON.stringify(makeBackup(data, new Date('2026-11-12T10:00:00Z')));
    const parsed = parseBackup(text);
    expect(parsed).toEqual({ ok: true, data, skippedCheckIns: 0 });
  });

  it('imports version 1 files from before line icons and the compact setting', () => {
    const old = withChange((b) => {
      (b.habits as { icon: string }[])[0]!.icon = '💧';
      (b.habits as { icon: string }[])[1]!.icon = '🏋️';
      (b.habits as { icon: string }[])[2]!.icon = '🦄';
      delete (b.settings as { compact?: boolean }).compact;
    });
    const r = parseBackup(old);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.habits.map((h) => h.icon)).toEqual(['droplet', 'dumbbell', 'check']);
    expect(r.data.settings).toEqual({ weekStartsOn: 0, compact: false });
  });

  it('skips check-ins for habits not in the file and keeps everything else exactly', () => {
    const withOrphans = withChange((b) => {
      const list = b.checkIns as Record<string, unknown>[];
      list.splice(1, 0, { habitId: 'deleted', day: '2026-11-10', count: 1, updatedAt: '2026-11-10T20:00:00.000Z' });
      list.push({ habitId: 'deleted', day: '2026-11-11', count: 0, note: 'orphan note', updatedAt: '2026-11-11T20:00:00.000Z' });
    });
    expect(parseBackup(withOrphans)).toEqual({ ok: true, data, skippedCheckIns: 2 });
  });

  const orphan = { habitId: 'deleted', day: '2026-11-10', count: 1, updatedAt: '2026-11-10T20:00:00.000Z' };
  const addCheckIns = (...rows: unknown[]) => withChange((b) => (b.checkIns as unknown[]).push(...rows));

  it.each([
    ['an impossible day', addCheckIns({ ...orphan, day: '2026-02-30' }), /checkIns\[2\]\.day/],
    ['a count given as text', addCheckIns({ ...orphan, count: '1' }), /checkIns\[2\]\.count/],
    ['a count over the limit', addCheckIns({ ...orphan, count: 1_000_001 }), /checkIns\[2\]\.count/],
    ['no updatedAt', addCheckIns({ ...orphan, updatedAt: undefined }), /checkIns\[2\]\.updatedAt/],
    ['an over-long note', addCheckIns({ ...orphan, note: 'x'.repeat(2001) }), /checkIns\[2\]\.note/],
    ['a habitId that is not text', addCheckIns({ ...orphan, habitId: 7 }), /checkIns\[2\]\.habitId/],
    ['a duplicate', addCheckIns(orphan, orphan), /same habit and day/],
  ])('rejects an orphan check-in with %s rather than skipping it', (_, text, message) => {
    const r = parseBackup(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(message);
  });

  it('rejects a file with check-ins but no habits as not a usable backup', () => {
    const r = parseBackup(withChange((b) => ((b.habits = []), (b.checkIns = [orphan, { ...orphan, day: '2026-11-11' }]))));
    expect(r).toEqual({ ok: false, error: 'This file has check-ins but no habits, so it is not a usable backup.' });
  });

  it('imports an empty backup from an empty app', () => {
    const r = parseBackup(withChange((b) => ((b.habits = []), (b.checkIns = []))));
    expect(r).toEqual({ ok: true, data: { settings: data.settings, habits: [], checkIns: [] }, skippedCheckIns: 0 });
  });

  it('still rejects the file when an orphan check-in sits beside other invalid data', () => {
    const bad = withChange((b) => {
      const list = b.checkIns as Record<string, unknown>[];
      list.push({ habitId: 'deleted', day: '2026-11-10', count: 1, updatedAt: '2026-11-10T20:00:00.000Z' });
      list[0]!.count = -1;
    });
    const r = parseBackup(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/checkIns\[0\]\.count/);
  });

  it('records format and version', () => {
    const b = makeBackup(data);
    expect(b.format).toBe('habits-lol-backup');
    expect(b.version).toBe(BACKUP_VERSION);
  });

  it.each([
    ['not JSON', 'nope', /not valid JSON/],
    ['another file', JSON.stringify({ hello: 1 }), /not a Habits backup/],
    ['a newer version', withChange((b) => (b.version = BACKUP_VERSION + 1)), /newer version/],
    ['a duplicate habit id', withChange((b) => ((b.habits as { id: string }[])[1]!.id = 'a')), /same id/],
    ['an invalid day', withChange((b) => ((b.checkIns as { day: string }[])[0]!.day = '2026-02-30')), /YYYY-MM-DD/],
    ['a bad weekday', withChange((b) => ((b.habits as { schedule: unknown }[])[2]!.schedule = { kind: 'weekdays', days: [7] })), /days\[0\]/],
    ['a negative count', withChange((b) => ((b.checkIns as { count: number }[])[0]!.count = -1)), /count/],
    ['a non-boolean compact setting', withChange((b) => ((b.settings as { compact: unknown }).compact = 'yes')), /compact/],
    ['a bad reminder', withChange((b) => ((b.habits as { reminderTime: string }[])[0]!.reminderTime = '25:00')), /reminderTime/],
    [
      'duplicate check-ins',
      withChange((b) => {
        const list = b.checkIns as unknown[];
        list.push(list[0]);
      }),
      /same habit and day/,
    ],
  ])('rejects %s', (_, text, message) => {
    const r = parseBackup(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(message);
  });
});
