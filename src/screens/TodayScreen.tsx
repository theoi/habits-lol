import { useMemo, useState } from 'react';
import { CheckControl } from '../components/CheckControl';
import { DaySheet } from '../components/DaySheet';
import { HabitIcon } from '../components/HabitIcon';
import { BellIcon, FlameIcon, NoteIcon, PlusIcon } from '../components/icons';
import { ProgressRing } from '../components/ProgressRing';
import { WeekStrip } from '../components/WeekStrip';
import { seedSampleData } from '../db/seed';
import { dayStatus, effectiveStart, goalTarget, weekProgress, type DayStatus } from '../lib/schedule';
import { computeStreaks } from '../lib/streaks';
import type { DayCounts, DayKey, Habit } from '../lib/types';
import { useData } from '../ui/data';
import { describeGoal, formatDay, formatStreak, formatTime } from '../ui/format';
import { href } from '../ui/router';
import { useToast } from '../ui/toast';

const NO_COUNTS: DayCounts = new Map();

type RowStatus = DayStatus | 'notStarted';

interface Row {
  habit: Habit;
  counts: DayCounts;
  status: RowStatus;
}

/**
 * Status of a habit on a day. Days before a habit's start are shown so they can
 * be back-filled, but they are not counted as due.
 */
function rowStatus(habit: Habit, counts: DayCounts, day: DayKey, weekStartsOn: 0 | 1): RowStatus {
  const status = dayStatus(habit, counts, day, weekStartsOn);
  return status !== 'done' && day < effectiveStart(habit, counts) ? 'notStarted' : status;
}

export function TodayScreen() {
  const { habits, countsByHabit, notesByHabit, settings, today, ready } = useData();
  const [picked, setPicked] = useState<DayKey | null>(null);
  const [sheet, setSheet] = useState<Habit | null>(null);
  const toast = useToast();
  const day = picked && picked <= today ? picked : today;
  const ws = settings.weekStartsOn;

  const rows: Row[] = useMemo(
    () =>
      habits
        .filter((h) => h.archivedAt === null)
        .map((habit) => {
          const counts = countsByHabit.get(habit.id) ?? NO_COUNTS;
          return { habit, counts, status: rowStatus(habit, counts, day, ws) };
        }),
    [habits, countsByHabit, day, ws],
  );

  const due = rows.filter((r) => r.status === 'due');
  const done = rows.filter((r) => r.status === 'done');
  const other = rows.filter((r) => r.status === 'rest' || r.status === 'weekMet' || r.status === 'notStarted');
  const total = due.length + done.length;

  const progress = (d: DayKey) => {
    let n = 0;
    let k = 0;
    for (const h of habits) {
      if (h.archivedAt !== null) continue;
      const s = rowStatus(h, countsByHabit.get(h.id) ?? NO_COUNTS, d, ws);
      if (s === 'done') {
        n++;
        k++;
      } else if (s === 'due') n++;
    }
    return n === 0 ? null : k / n;
  };

  if (!ready) return <div className="page" aria-busy="true" />;

  if (habits.filter((h) => h.archivedAt === null).length === 0) {
    return (
      <div className="page">
        <div className="empty">
          <ProgressRing value={0.66} size={96} stroke={9} />
          <h1>Build habits, one day at a time</h1>
          <p className="muted">Add something you want to do regularly. Everything stays on this device.</p>
          <div className="row gap">
            <a className="btn primary" href={href.newHabit}>
              <PlusIcon size={18} /> New habit
            </a>
            <button type="button" className="btn" onClick={() => void seedSampleData(new Date())}>
              Try sample habits
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isToday = day === today;
  const renderRow = (r: Row) => (
    <HabitRow
      key={r.habit.id}
      row={r}
      day={day}
      today={today}
      note={notesByHabit.get(r.habit.id)?.get(day)}
      weekStartsOn={ws}
      onOpenDay={() => setSheet(r.habit)}
      onDone={() =>
        toast({ message: `${r.habit.name} done`, action: { label: 'Add note', run: () => setSheet(r.habit) } })
      }
    />
  );

  return (
    <div className="page today">
      <header className="today-head">
        <div>
          <p className="eyebrow">{isToday ? formatDay(day, 'EEEE') : 'Editing a past day'}</p>
          <h1 className="display">{isToday ? formatDay(day, 'd MMMM') : formatDay(day, 'EEE d MMMM')}</h1>
          {!isToday && (
            <button type="button" className="chip" onClick={() => setPicked(null)}>
              Back to today
            </button>
          )}
        </div>
        <div className="today-head-side">
          <a className="icon-btn add-btn" href={href.newHabit} aria-label="New habit">
            <PlusIcon size={22} />
          </a>
          <ProgressRing
          value={total ? done.length / total : 0}
          size={64}
          stroke={7}
          label={`${done.length} of ${total} done`}
        >
          <span className="ring-text">
            {done.length}
            <small>/{total}</small>
          </span>
          </ProgressRing>
        </div>
      </header>

      <WeekStrip
        selected={day}
        today={today}
        weekStartsOn={ws}
        progress={progress}
        onSelect={(d) => setPicked(d === today ? null : d)}
      />

      {due.length > 0 && (
        <section className="group" aria-labelledby="due-h">
          <h2 id="due-h" className="group-title">
            {isToday ? 'To do' : 'Not done'} <span className="count-badge">{due.length}</span>
          </h2>
          <div className="stack">{due.map(renderRow)}</div>
        </section>
      )}
      {due.length === 0 && total > 0 && (
        <div className="all-done" role="status">
          <span className="all-done-mark">✓</span>
          <div>
            <strong>{isToday ? 'All done for today' : 'Everything done that day'}</strong>
            <p className="muted small">Nice work. Rest is part of the routine too.</p>
          </div>
        </div>
      )}
      {done.length > 0 && (
        <section className="group" aria-labelledby="done-h">
          <h2 id="done-h" className="group-title">
            Done <span className="count-badge">{done.length}</span>
          </h2>
          <div className="stack">{done.map(renderRow)}</div>
        </section>
      )}
      {other.length > 0 && (
        <section className="group" aria-labelledby="other-h">
          <h2 id="other-h" className="group-title">
            {isToday ? 'Not due today' : 'Not due that day'}
          </h2>
          <div className="stack">{other.map(renderRow)}</div>
        </section>
      )}

      {sheet && (
        <DaySheet
          key={`${sheet.id}${day}`}
          habit={sheet}
          day={day}
          count={countsByHabit.get(sheet.id)?.get(day) ?? 0}
          note={notesByHabit.get(sheet.id)?.get(day)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function HabitRow({
  row,
  day,
  today,
  note,
  weekStartsOn,
  onOpenDay,
  onDone,
}: {
  row: Row;
  day: DayKey;
  today: DayKey;
  note: string | undefined;
  weekStartsOn: 0 | 1;
  onOpenDay: () => void;
  onDone: () => void;
}) {
  const { habit, counts, status } = row;
  const count = counts.get(day) ?? 0;
  const target = goalTarget(habit.goal);
  const streak = computeStreaks(habit, counts, today, weekStartsOn);
  const muted = status === 'rest' || status === 'weekMet' || status === 'notStarted';

  let meta: React.ReactNode;
  if (status === 'notStarted') {
    meta = <span>Before this habit started</span>;
  } else if (habit.schedule.kind === 'perWeek') {
    const wp = weekProgress(habit, counts, day, weekStartsOn);
    meta = (
      <span>
        {Math.min(wp.done, wp.required)} of {wp.required} this week
      </span>
    );
  } else if (status === 'rest') {
    meta = <span>Rest day</span>;
  } else if (habit.goal.kind === 'count') {
    meta = <span>{describeGoal(habit.goal)}</span>;
  }

  return (
    <article
      className={`habit-row status-${status}${muted ? ' is-muted' : ''}`}
      style={{ ['--hc' as string]: habit.color }}
    >
      <a className="habit-row-main" href={href.detail(habit.id)}>
        <HabitIcon habit={habit} />
        <span className="habit-text">
          <span className="habit-name">{habit.name}</span>
          <span className="habit-meta">
            {streak.current > 0 && (
              <span className="streak" title="Current streak">
                <FlameIcon size={14} /> {formatStreak(streak.current, streak.unit)}
              </span>
            )}
            {meta}
            {habit.reminderTime && day === today && status === 'due' && (
              <span className="reminder">
                <BellIcon size={13} /> {formatTime(habit.reminderTime)}
              </span>
            )}
            {note && (
              <span className="has-note" title={note}>
                <NoteIcon size={13} /> Note
              </span>
            )}
          </span>
        </span>
      </a>
      <CheckControl
        habit={habit}
        day={day}
        count={count}
        note={note}
        onOpenDay={onOpenDay}
        onChanged={(next) => {
          if (next >= target && count < target) onDone();
        }}
      />
      {habit.goal.kind === 'count' && (
        <span className="row-progress" style={{ width: `${Math.min(100, (count / target) * 100)}%` }} aria-hidden="true" />
      )}
    </article>
  );
}
