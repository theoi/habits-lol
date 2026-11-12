import { useLayoutEffect, useRef } from 'react';
import { addDays, orderedWeekdays, startOfWeek } from '../lib/dates';
import { dayCells, type DayCell } from '../lib/stats';
import type { DayCounts, DayKey, Habit, WeekStart } from '../lib/types';
import { formatDay, WEEKDAY_SHORT } from '../ui/format';
import { habitVars } from '../ui/color';

const CELL = 13;
const GAP = 3;
const LEFT = 26;
const TOP = 18;

function fill(cell: DayCell): string {
  switch (cell.state) {
    case 'done':
      return 'var(--hc)';
    case 'partial':
      return `color-mix(in srgb, var(--hc) ${20 + cell.level * 18}%, var(--cell-empty))`;
    case 'future':
    case 'beforeStart':
    case 'rest':
      return 'var(--cell-none)';
    default:
      return 'var(--cell-empty)';
  }
}

function describe(cell: DayCell, habit: Habit): string {
  const date = formatDay(cell.day, 'EEE d MMM yyyy');
  if (cell.state === 'future' || cell.state === 'beforeStart') return date;
  if (habit.goal.kind === 'count') return `${date}: ${cell.count}/${cell.target} ${habit.goal.unit}`;
  return `${date}: ${cell.state === 'done' ? 'done' : cell.state === 'rest' ? 'not scheduled' : 'not done'}`;
}

export function Heatmap({
  habit,
  counts,
  today,
  weekStartsOn,
  weeks = 53,
}: {
  habit: Habit;
  counts: DayCounts;
  today: DayKey;
  weekStartsOn: WeekStart;
  weeks?: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const first = addDays(startOfWeek(today, weekStartsOn), -7 * (weeks - 1));
  const cells = dayCells(habit, counts, first, addDays(first, weeks * 7 - 1), today);
  const rows = orderedWeekdays(weekStartsOn);
  const width = LEFT + weeks * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  const months: { x: number; label: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    const ws = addDays(first, w * 7);
    const prev = addDays(ws, -7);
    if (w === 0 ? Number(ws.slice(8)) <= 7 : ws.slice(5, 7) !== prev.slice(5, 7))
      months.push({ x: LEFT + w * (CELL + GAP), label: formatDay(ws.slice(8) === '01' ? ws : addDays(ws, 6), 'MMM') });
  }

  return (
    <div
      className="heatmap-scroll"
      ref={scroller}
      style={habitVars(habit.color)}
      tabIndex={0}
      role="region"
      aria-label="Past year, scrollable"
    >
      <svg
        className="heatmap"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${habit.name}: last ${weeks} weeks`}
      >
        {months.map((m) => (
          <text key={m.x} x={m.x} y={11} className="heatmap-label">
            {m.label}
          </text>
        ))}
        {rows.map((d, i) =>
          i % 2 === 0 ? (
            <text key={d} x={0} y={TOP + i * (CELL + GAP) + CELL - 3} className="heatmap-label">
              {WEEKDAY_SHORT[d]}
            </text>
          ) : null,
        )}
        {cells.map((cell, idx) => {
          const w = Math.floor(idx / 7);
          const r = idx % 7;
          return (
            <rect
              key={cell.day}
              x={LEFT + w * (CELL + GAP)}
              y={TOP + r * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={3.5}
              fill={fill(cell)}
              className={cell.day === today ? 'heatmap-today' : undefined}
              data-state={cell.state}
            >
              <title>{describe(cell, habit)}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
