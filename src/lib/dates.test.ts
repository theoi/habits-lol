import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  endOfWeek,
  isDayKey,
  orderedWeekdays,
  parseTimeOfDay,
  startOfWeek,
  toDayKey,
  weekdayOf,
} from './dates';
import { intlDayKey, withTZ, ZONES } from '../test/fixtures';

describe('toDayKey', () => {
  it('changes TZ inside tests (guards the TZ-switching harness)', () => {
    const d = new Date('2026-07-01T12:00:00Z');
    const ny = withTZ('America/New_York', () => d.getTimezoneOffset());
    const tokyo = withTZ('Asia/Tokyo', () => d.getTimezoneOffset());
    expect(ny).toBe(240);
    expect(tokyo).toBe(-540);
  });

  it.each(ZONES)('matches the local calendar hourly across DST changes and year end in %s', (tz) => {
    const windows = [
      ['2026-03-06T00:00Z', '2026-04-08T00:00Z'], // northern spring forward (US, EU) and southern fall back
      ['2026-09-25T00:00Z', '2026-11-05T00:00Z'], // southern spring forward, northern fall back
      ['2026-12-30T00:00Z', '2027-01-02T00:00Z'],
    ];
    withTZ(tz, () => {
      for (const [from, to] of windows) {
        for (let t = Date.parse(from!); t <= Date.parse(to!); t += 30 * 60_000) {
          const d = new Date(t);
          expect(toDayKey(d)).toBe(intlDayKey(d, tz));
        }
      }
    });
  });

  it('keeps the last minute before midnight on the same day across US DST', () => {
    withTZ('America/New_York', () => {
      expect(toDayKey(new Date('2026-03-09T03:59:00Z'))).toBe('2026-03-08'); // 23:59 EDT
      expect(toDayKey(new Date('2026-03-09T04:00:00Z'))).toBe('2026-03-09');
      expect(toDayKey(new Date('2026-11-02T04:59:00Z'))).toBe('2026-11-01'); // 23:59 EST
      expect(toDayKey(new Date('2026-11-02T05:00:00Z'))).toBe('2026-11-02');
    });
  });
});

describe('day arithmetic', () => {
  it('crosses month, year, and leap-day boundaries', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-01-31', 30)).toBe('2026-03-02');
  });

  it('counts whole days across DST in every zone', () => {
    for (const tz of ZONES) {
      withTZ(tz, () => {
        expect(diffDays('2026-03-09', '2026-03-07')).toBe(2);
        expect(diffDays('2026-11-02', '2026-10-31')).toBe(2);
        expect(diffDays('2026-04-06', '2026-04-04')).toBe(2);
        expect(eachDay('2026-03-28', '2026-04-01')).toEqual([
          '2026-03-28',
          '2026-03-29',
          '2026-03-30',
          '2026-03-31',
          '2026-04-01',
        ]);
      });
    }
  });

  it('returns no days for an inverted range', () => {
    expect(eachDay('2026-01-02', '2026-01-01')).toEqual([]);
  });

  it('agrees with Date#getDay for weekdays over several years', () => {
    for (let k = '2023-12-25'; k < '2028-01-10'; k = addDays(k, 1)) {
      const [y, m, d] = k.split('-').map(Number);
      expect(weekdayOf(k)).toBe(new Date(y!, m! - 1, d!).getDay());
    }
    expect(weekdayOf('2026-11-12')).toBe(4);
  });

  it('finds week bounds for Monday and Sunday starts across a year boundary', () => {
    expect(startOfWeek('2027-01-01', 1)).toBe('2026-12-28');
    expect(endOfWeek('2027-01-01', 1)).toBe('2027-01-03');
    expect(startOfWeek('2027-01-01', 0)).toBe('2026-12-27');
    expect(endOfWeek('2027-01-01', 0)).toBe('2027-01-02');
    expect(startOfWeek('2026-11-15', 1)).toBe('2026-11-09'); // Sunday belongs to the week before
    expect(startOfWeek('2026-11-15', 0)).toBe('2026-11-15');
  });

  it('adds months and clamps to the month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-10', -1)).toBe('2025-12-10');
    expect(addMonths('2026-03-31', -13)).toBe('2025-02-28');
  });

  it('orders weekdays by week start', () => {
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(orderedWeekdays(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('validation helpers', () => {
  it('accepts only real calendar days', () => {
    expect(isDayKey('2024-02-29')).toBe(true);
    expect(isDayKey('2026-02-29')).toBe(false);
    expect(isDayKey('2026-13-01')).toBe(false);
    expect(isDayKey('2026-1-01')).toBe(false);
    expect(isDayKey(20260101)).toBe(false);
  });

  it('parses HH:mm times', () => {
    expect(parseTimeOfDay('00:00')).toBe(0);
    expect(parseTimeOfDay('07:30')).toBe(450);
    expect(parseTimeOfDay('23:59')).toBe(1439);
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('7:30')).toBeNull();
  });
});
