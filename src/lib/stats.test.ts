import { describe, expect, it } from 'vitest';
import { completionRate, dayCells, weeklyRates } from './stats';
import { eachDay } from './dates';
import { counts, makeHabit } from '../test/fixtures';

describe('completionRate', () => {
  const daily = makeHabit({ startDay: '2026-11-01' });

  it('divides done scheduled days by expected days', () => {
    const c = counts(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05', '2026-11-08', '2026-11-09', '2026-11-10']);
    // 11-01..11-11 expected (today 11-12 open, so excluded): 11 days, 7 done.
    expect(completionRate(daily, c, '2026-10-01', '2026-11-30', '2026-11-12', 1)).toEqual({
      done: 7,
      expected: 11,
      rate: 7 / 11,
    });
  });

  it('includes today once it is done', () => {
    const c = counts(eachDay('2026-11-01', '2026-11-12'));
    expect(completionRate(daily, c, '2026-11-01', '2026-11-12', '2026-11-12', 1).rate).toBe(1);
  });

  it('has no rate before anything is expected', () => {
    expect(completionRate(daily, new Map(), '2026-11-01', '2026-11-01', '2026-11-01', 1).rate).toBeNull();
    expect(completionRate(daily, new Map(), '2026-10-01', '2026-10-31', '2026-11-12', 1).rate).toBeNull();
  });

  it('counts only scheduled weekdays', () => {
    const h = makeHabit({ startDay: '2026-11-02', schedule: { kind: 'weekdays', days: [2, 4] } }); // Tue, Thu
    const c = counts(['2026-11-03', '2026-11-07', '2026-11-10']); // Sat 11-07 is extra
    // Scheduled: 11-03, 11-05, 11-10, 11-12 (today, open).
    expect(completionRate(h, c, '2026-11-01', '2026-11-30', '2026-11-12', 1)).toEqual({
      done: 2,
      expected: 3,
      rate: 2 / 3,
    });
  });

  it('measures per-week habits by weekly target, capping extra days', () => {
    const h = makeHabit({ startDay: '2026-10-19', schedule: { kind: 'perWeek', times: 3 } });
    const c = counts([
      ...eachDay('2026-10-19', '2026-10-25'), // 7 done, counts as 3/3
      '2026-10-27', // 1/3
      '2026-11-09', // current week, 1/3: left out
    ]);
    expect(completionRate(h, c, '2026-10-01', '2026-11-30', '2026-11-12', 1)).toEqual({
      done: 4,
      expected: 9,
      rate: 4 / 9,
    });
  });

  it('counts the current week once its target is met', () => {
    const h = makeHabit({ startDay: '2026-11-09', schedule: { kind: 'perWeek', times: 2 } });
    const c = counts(['2026-11-09', '2026-11-10']);
    expect(completionRate(h, c, '2026-11-01', '2026-11-30', '2026-11-12', 1).rate).toBe(1);
  });
});

describe('weeklyRates', () => {
  it('returns one entry per week, oldest first, null before the start', () => {
    const h = makeHabit({ startDay: '2026-11-02' });
    const c = counts(eachDay('2026-11-02', '2026-11-05'));
    const r = weeklyRates(h, c, '2026-11-12', 1, 3);
    expect(r.map((w) => w.weekStart)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(r.map((w) => w.rate)).toEqual([null, 4 / 7, 0]);
  });
});

describe('dayCells', () => {
  it('labels days for the heatmap and calendar', () => {
    const h = makeHabit({ startDay: '2026-11-03', goal: { kind: 'count', target: 8, unit: 'glasses' } });
    const c = counts([
      ['2026-11-04', 8],
      ['2026-11-05', 2],
      ['2026-11-06', 6],
    ]);
    const cells = dayCells(h, c, '2026-11-02', '2026-11-09', '2026-11-08');
    expect(cells.map((x) => [x.state, x.level])).toEqual([
      ['beforeStart', 0],
      ['missed', 0],
      ['done', 4],
      ['partial', 1],
      ['partial', 3],
      ['missed', 0],
      ['pending', 0],
      ['future', 0],
    ]);
  });

  it('marks unscheduled and per-week days without calling them missed', () => {
    const wk = makeHabit({ startDay: '2026-11-02', schedule: { kind: 'weekdays', days: [1] } });
    expect(dayCells(wk, new Map(), '2026-11-02', '2026-11-03', '2026-11-12').map((x) => x.state)).toEqual([
      'missed',
      'rest',
    ]);
    const pw = makeHabit({ startDay: '2026-11-02', schedule: { kind: 'perWeek', times: 2 } });
    expect(dayCells(pw, new Map(), '2026-11-02', '2026-11-02', '2026-11-12')[0]!.state).toBe('open');
  });
});
