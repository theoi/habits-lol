import { addDays, eachDay, startOfWeek, weekdayOf } from '../lib/dates';
import type { DayKey, WeekStart } from '../lib/types';
import { formatDay, WEEKDAY_INITIAL } from '../ui/format';
import { ChevronLeft, ChevronRight } from './icons';
import { ProgressRing } from './ProgressRing';

export function WeekStrip({
  selected,
  today,
  weekStartsOn,
  progress,
  onSelect,
}: {
  selected: DayKey;
  today: DayKey;
  weekStartsOn: WeekStart;
  /** Share of due habits done per day, or null when nothing was due. */
  progress: (day: DayKey) => number | null;
  onSelect: (day: DayKey) => void;
}) {
  const ws = startOfWeek(selected, weekStartsOn);
  const days = eachDay(ws, addDays(ws, 6));
  const canNext = addDays(ws, 7) <= today;
  return (
    <div className="week-strip">
      <button
        type="button"
        className="icon-btn ghost"
        aria-label="Previous week"
        onClick={() => onSelect(addDays(selected, -7))}
      >
        <ChevronLeft />
      </button>
      <ol className="week-days">
        {days.map((day) => {
          const future = day > today;
          const p = future ? null : progress(day);
          const isSel = day === selected;
          return (
            <li key={day}>
              <button
                type="button"
                className={`week-day${isSel ? ' is-selected' : ''}${day === today ? ' is-today' : ''}`}
                disabled={future}
                aria-current={isSel ? 'date' : undefined}
                aria-label={formatDay(day, 'EEEE d MMMM')}
                onClick={() => onSelect(day)}
              >
                <span className="week-day-name">{WEEKDAY_INITIAL[weekdayOf(day)]}</span>
                <ProgressRing value={p ?? 0} size={34} stroke={3} color={p === 1 ? 'var(--accent)' : 'var(--accent-soft-strong)'}>
                  <span className="week-day-num">{Number(day.slice(8))}</span>
                </ProgressRing>
              </button>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="icon-btn ghost"
        aria-label="Next week"
        disabled={!canNext}
        onClick={() => {
          const next = addDays(selected, 7);
          onSelect(next > today ? today : next);
        }}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
