import { addDays, addMonths, daysInMonth, orderedWeekdays, startOfMonth, weekdayOf } from '../lib/dates';
import { dayCells } from '../lib/stats';
import type { DayCounts, DayKey, Habit, WeekStart } from '../lib/types';
import { formatDay, WEEKDAY_INITIAL } from '../ui/format';
import { ChevronLeft, ChevronRight } from './icons';
import { habitVars } from '../ui/color';

export function MonthCalendar({
  habit,
  counts,
  notes,
  today,
  weekStartsOn,
  month,
  onMonth,
  onPick,
}: {
  habit: Habit;
  counts: DayCounts;
  notes: ReadonlyMap<DayKey, string>;
  today: DayKey;
  weekStartsOn: WeekStart;
  month: DayKey;
  onMonth: (month: DayKey) => void;
  onPick: (day: DayKey) => void;
}) {
  const first = startOfMonth(month);
  const last = addDays(first, daysInMonth(first) - 1);
  const lead = (weekdayOf(first) - weekStartsOn + 7) % 7;
  const cells = dayCells(habit, counts, first, last, today);
  const canNext = addMonths(first, 1) <= today;
  return (
    <div className="month" style={habitVars(habit.color)}>
      <div className="month-head">
        <button type="button" className="icon-btn ghost" aria-label="Previous month" onClick={() => onMonth(addMonths(first, -1))}>
          <ChevronLeft />
        </button>
        <h3 className="month-title">{formatDay(first, 'MMMM yyyy')}</h3>
        <button
          type="button"
          className="icon-btn ghost"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => onMonth(addMonths(first, 1))}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="month-grid">
        {orderedWeekdays(weekStartsOn).map((d) => (
          <span key={d} className="month-dow" aria-hidden="true">
            {WEEKDAY_INITIAL[d]}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead${i}`} />
        ))}
        {cells.map((cell) => {
          const note = notes.get(cell.day);
          const label = `${formatDay(cell.day, 'EEEE d MMMM')}${
            habit.goal.kind === 'count' ? `, ${cell.count} of ${cell.target}` : cell.state === 'done' ? ', done' : ''
          }${note ? ', has note' : ''}`;
          return (
            <button
              key={cell.day}
              type="button"
              className={`month-day state-${cell.state}${cell.day === today ? ' is-today' : ''}`}
              disabled={cell.state === 'future'}
              onClick={() => onPick(cell.day)}
              aria-label={label}
              style={
                cell.state === 'partial'
                  ? { ['--fill' as string]: `${Math.round((cell.count / cell.target) * 100)}%` }
                  : undefined
              }
            >
              <span className="month-num">{Number(cell.day.slice(8))}</span>
              {note && <span className="month-note" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
