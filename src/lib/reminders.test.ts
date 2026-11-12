import { describe, expect, it } from 'vitest';
import { remindersDue } from './reminders';
import { counts, makeHabit, withTZ } from '../test/fixtures';
import type { DayCounts, Habit } from './types';

const walk = makeHabit({ id: 'walk', startDay: '2026-11-01', reminderTime: '07:30' });

function due(
  habits: Habit[],
  now: Date,
  opts: { counts?: Record<string, DayCounts>; lastFired?: Record<string, string>; weekStartsOn?: 0 | 1 } = {},
) {
  return remindersDue({
    habits,
    countsByHabit: new Map(Object.entries(opts.counts ?? {})),
    now,
    lastFired: opts.lastFired ?? {},
    weekStartsOn: opts.weekStartsOn ?? 1,
  }).map((h) => h.id);
}

describe('remindersDue', () => {
  it('fires from the set time through the grace window', () => {
    expect(due([walk], new Date(2026, 10, 12, 7, 29))).toEqual([]);
    expect(due([walk], new Date(2026, 10, 12, 7, 30))).toEqual(['walk']);
    expect(due([walk], new Date(2026, 10, 12, 8, 30))).toEqual(['walk']);
    expect(due([walk], new Date(2026, 10, 12, 8, 31))).toEqual([]);
  });

  it('fires at most once per day', () => {
    const now = new Date(2026, 10, 12, 7, 45);
    expect(due([walk], now, { lastFired: { walk: '2026-11-12' } })).toEqual([]);
    expect(due([walk], now, { lastFired: { walk: '2026-11-11' } })).toEqual(['walk']);
  });

  it('skips habits already done today', () => {
    const now = new Date(2026, 10, 12, 7, 45);
    expect(due([walk], now, { counts: { walk: counts(['2026-11-12']) } })).toEqual([]);
  });

  it('fires for a count goal that is only partly done', () => {
    const water = makeHabit({ id: 'water', reminderTime: '07:30', goal: { kind: 'count', target: 8, unit: '' } });
    const now = new Date(2026, 10, 12, 7, 45);
    expect(due([water], now, { counts: { water: counts([['2026-11-12', 5]]) } })).toEqual(['water']);
  });

  it('skips archived habits, habits without a reminder, and unscheduled days', () => {
    const now = new Date(2026, 10, 12, 7, 45); // Thursday
    expect(due([{ ...walk, archivedAt: '2026-11-10T00:00:00Z' }], now)).toEqual([]);
    expect(due([{ ...walk, reminderTime: null }], now)).toEqual([]);
    expect(due([{ ...walk, schedule: { kind: 'weekdays', days: [1, 3] } }], now)).toEqual([]);
    expect(due([{ ...walk, schedule: { kind: 'weekdays', days: [4] } }], now)).toEqual(['walk']);
  });

  it('skips a per-week habit once its weekly target is met', () => {
    const gym = makeHabit({ id: 'gym', reminderTime: '07:30', schedule: { kind: 'perWeek', times: 2 } });
    const now = new Date(2026, 10, 12, 7, 45);
    expect(due([gym], now, { counts: { gym: counts(['2026-11-09']) } })).toEqual(['gym']);
    expect(due([gym], now, { counts: { gym: counts(['2026-11-09', '2026-11-10']) } })).toEqual([]);
  });

  it('fires after a reminder time skipped by the spring-forward gap', () => {
    withTZ('America/New_York', () => {
      const h = { ...walk, startDay: '2026-03-01', reminderTime: '02:30' };
      // 2026-03-08 02:00 EST jumps to 03:00 EDT; 07:00Z is 03:00 EDT.
      expect(due([h], new Date('2026-03-08T07:00:00Z'))).toEqual(['walk']);
    });
  });

  it('uses the local day when deciding whether it already fired', () => {
    withTZ('Pacific/Auckland', () => {
      const h = { ...walk, reminderTime: '07:30' };
      // 2026-11-12T18:45Z is 07:45 on 2026-11-13 in Auckland (NZDT, +13).
      expect(due([h], new Date('2026-11-12T18:45:00Z'), { lastFired: { walk: '2026-11-12' } })).toEqual(['walk']);
    });
  });
});
