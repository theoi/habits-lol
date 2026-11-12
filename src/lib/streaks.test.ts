import { describe, expect, it } from 'vitest';
import { computeStreaks, totalDone } from './streaks';
import { addDays, eachDay, toDayKey } from './dates';
import { counts, makeHabit, withTZ, ZONES } from '../test/fixtures';

describe('daily streaks', () => {
  const habit = makeHabit({ startDay: '2026-10-01' });

  it('counts consecutive done days through today', () => {
    const c = counts(eachDay('2026-11-08', '2026-11-12'));
    expect(computeStreaks(habit, c, '2026-11-12', 1)).toEqual({ current: 5, best: 5, unit: 'day' });
  });

  it('keeps the streak while today is still open', () => {
    const c = counts(eachDay('2026-11-07', '2026-11-11'));
    expect(computeStreaks(habit, c, '2026-11-12', 1).current).toBe(5);
  });

  it('breaks on a missed past day and keeps the best run', () => {
    const c = counts([...eachDay('2026-10-01', '2026-10-07'), ...eachDay('2026-11-10', '2026-11-12')]);
    expect(computeStreaks(habit, c, '2026-11-12', 1)).toEqual({ current: 3, best: 7, unit: 'day' });
    const missedYesterday = counts(eachDay('2026-11-01', '2026-11-10'));
    expect(computeStreaks(habit, missedYesterday, '2026-11-12', 1).current).toBe(0);
  });

  it('runs across month and year boundaries', () => {
    const h = makeHabit({ startDay: '2026-12-20' });
    const c = counts(eachDay('2026-12-29', '2027-01-03'));
    expect(computeStreaks(h, c, '2027-01-03', 1).current).toBe(6);
    const leap = makeHabit({ startDay: '2028-02-20' });
    expect(computeStreaks(leap, counts(eachDay('2028-02-27', '2028-03-02')), '2028-03-02', 1).current).toBe(5);
  });

  it('is unaffected by DST changes in every zone', () => {
    for (const tz of ZONES) {
      withTZ(tz, () => {
        // "Today" is read from the clock the way the app does it.
        const today = toDayKey(new Date('2026-04-08T12:00:00Z'));
        const h = makeHabit({ startDay: '2026-02-20' });
        const c = counts(eachDay('2026-03-01', today));
        expect(computeStreaks(h, c, today, 1).current).toBe(eachDay('2026-03-01', today).length);
      });
    }
  });

  it('only counts days that meet a count goal', () => {
    const h = makeHabit({ startDay: '2026-11-01', goal: { kind: 'count', target: 8, unit: 'glasses' } });
    const c = counts([
      ['2026-11-09', 8],
      ['2026-11-10', 12],
      ['2026-11-11', 7],
      ['2026-11-12', 3],
    ]);
    expect(computeStreaks(h, c, '2026-11-12', 1)).toEqual({ current: 0, best: 2, unit: 'day' });
    expect(totalDone(h, c)).toBe(2);
  });

  it('extends history to back-filled days before the start day', () => {
    const h = makeHabit({ startDay: '2026-11-10' });
    const c = counts(eachDay('2026-11-05', '2026-11-12'));
    expect(computeStreaks(h, c, '2026-11-12', 1).current).toBe(8);
  });

  it('returns zero for a habit with no history', () => {
    const h = makeHabit({ startDay: '2026-11-12' });
    expect(computeStreaks(h, new Map(), '2026-11-12', 1)).toEqual({ current: 0, best: 0, unit: 'day' });
  });
});

describe('weekday streaks', () => {
  // Mon, Wed, Fri
  const habit = makeHabit({ startDay: '2026-10-26', schedule: { kind: 'weekdays', days: [1, 3, 5] } });

  it('skips unscheduled days without breaking', () => {
    // Weeks of 2026-11-02 and 2026-11-09 (Mondays); today is Thu 2026-11-12.
    const c = counts(['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11']);
    expect(computeStreaks(habit, c, '2026-11-12', 1).current).toBe(5);
  });

  it('breaks on a missed scheduled day', () => {
    const c = counts(['2026-11-02', '2026-11-06', '2026-11-09', '2026-11-11']);
    expect(computeStreaks(habit, c, '2026-11-12', 1)).toEqual({ current: 3, best: 3, unit: 'day' });
  });

  it('ignores extra check-ins on unscheduled days', () => {
    const c = counts(['2026-11-09', '2026-11-10', '2026-11-11']);
    expect(computeStreaks(habit, c, '2026-11-12', 1).current).toBe(2);
  });

  it('keeps the streak on a scheduled today that is still open', () => {
    const c = counts(['2026-11-09', '2026-11-11']);
    expect(computeStreaks(habit, c, '2026-11-13', 1).current).toBe(2);
  });
});

describe('per-week streaks', () => {
  const habit = makeHabit({ startDay: '2026-10-05', schedule: { kind: 'perWeek', times: 3 } }); // a Monday

  it('counts consecutive weeks that meet the target', () => {
    const c = counts([
      ...['2026-10-19', '2026-10-21', '2026-10-23'],
      ...['2026-10-26', '2026-10-27', '2026-11-01'],
      ...['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'],
    ]);
    expect(computeStreaks(habit, c, '2026-11-12', 1)).toEqual({ current: 3, best: 3, unit: 'week' });
  });

  it('does not break while the current week is in progress, and counts it once met', () => {
    const base = ['2026-11-02', '2026-11-03', '2026-11-04'];
    expect(computeStreaks(habit, counts([...base, '2026-11-09']), '2026-11-12', 1).current).toBe(1);
    expect(
      computeStreaks(habit, counts([...base, '2026-11-09', '2026-11-10', '2026-11-11']), '2026-11-12', 1).current,
    ).toBe(2);
  });

  it('breaks on a past week that fell short', () => {
    const c = counts(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-26', '2026-10-27', '2026-11-02', '2026-11-03', '2026-11-04']);
    expect(computeStreaks(habit, c, '2026-11-12', 1)).toEqual({ current: 1, best: 1, unit: 'week' });
  });

  it('groups days by the chosen week start', () => {
    const h = makeHabit({ startDay: '2026-10-25', schedule: { kind: 'perWeek', times: 2 } });
    // Sun 11-01 + Mon 11-02: with Sunday weeks both fall in the week of 11-01; with Monday
    // weeks they split across two weeks and neither meets 2.
    const c = counts(['2026-10-26', '2026-10-27', '2026-11-01', '2026-11-02']);
    expect(computeStreaks(h, c, '2026-11-07', 0).current).toBe(2);
    expect(computeStreaks(h, c, '2026-11-08', 1).best).toBe(1);
  });

  it('scales the first week to the days left after the start day', () => {
    const h = makeHabit({ startDay: '2026-10-31', schedule: { kind: 'perWeek', times: 3 } }); // Saturday
    const c = counts(['2026-10-31', '2026-11-01', '2026-11-03', '2026-11-04', '2026-11-05']);
    expect(computeStreaks(h, c, '2026-11-06', 1)).toEqual({ current: 2, best: 2, unit: 'week' });
  });

  it('crosses the year boundary', () => {
    const h = makeHabit({ startDay: '2026-12-14', schedule: { kind: 'perWeek', times: 1 } });
    const c = counts(['2026-12-15', '2026-12-23', '2026-12-31', '2027-01-05']);
    expect(computeStreaks(h, c, '2027-01-06', 1).current).toBe(4);
    // The ISO week of 2026-12-28 spans the new year; the check-in on 2027-01-02 belongs to it.
    const c2 = counts(['2026-12-15', '2026-12-23', '2027-01-02']);
    expect(computeStreaks(h, c2, '2027-01-04', 1).current).toBe(3);
  });

  it('runs the same in every time zone', () => {
    const c = counts(eachDay('2026-03-02', '2026-04-05').filter((_, i) => i % 2 === 0));
    const results = ZONES.map((tz) => withTZ(tz, () => computeStreaks(habit, c, '2026-04-05', 1)));
    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
    expect(results[0]).toEqual({ current: 5, best: 5, unit: 'week' });
  });
});

it('treats a future start day as no streak', () => {
  const h = makeHabit({ startDay: addDays('2026-11-12', 3) });
  expect(computeStreaks(h, new Map(), '2026-11-12', 1).current).toBe(0);
});
