import { useMemo, useState } from 'react';
import { DaySheet } from '../components/DaySheet';
import { HabitIcon } from '../components/HabitIcon';
import { Heatmap } from '../components/Heatmap';
import { BellIcon, ChevronLeft, EditIcon, FlameIcon, NoteIcon } from '../components/icons';
import { MonthCalendar } from '../components/MonthCalendar';
import { WeeklyChart } from '../components/WeeklyChart';
import { addDays } from '../lib/dates';
import { effectiveStart } from '../lib/schedule';
import { completionRate, weeklyRates } from '../lib/stats';
import { computeStreaks, totalDone } from '../lib/streaks';
import type { DayKey } from '../lib/types';
import { useData } from '../ui/data';
import { describeHabit, formatDay, formatPercent, formatStreak, formatTime } from '../ui/format';
import { href } from '../ui/router';

const NO_NOTES: ReadonlyMap<DayKey, string> = new Map();

export function HabitDetail({ id }: { id: string }) {
  const { habits, countsByHabit, notesByHabit, settings, today, ready } = useData();
  const habit = habits.find((h) => h.id === id);
  const [month, setMonth] = useState<DayKey>(today);
  const [sheetDay, setSheetDay] = useState<DayKey | null>(null);
  const ws = settings.weekStartsOn;
  const counts = useMemo(() => countsByHabit.get(id) ?? new Map<DayKey, number>(), [countsByHabit, id]);
  const notes = notesByHabit.get(id) ?? NO_NOTES;

  const stats = useMemo(() => {
    if (!habit) return null;
    const start = effectiveStart(habit, counts);
    return {
      streaks: computeStreaks(habit, counts, today, ws),
      total: totalDone(habit, counts),
      rate30: completionRate(habit, counts, addDays(today, -29), today, today, ws),
      rate90: completionRate(habit, counts, addDays(today, -89), today, today, ws),
      rateAll: completionRate(habit, counts, start, today, today, ws),
      weekly: weeklyRates(habit, counts, today, ws, 12),
    };
  }, [habit, counts, today, ws]);

  if (!ready) return <div className="page" aria-busy="true" />;
  if (!habit || !stats) {
    return (
      <div className="page">
        <div className="empty">
          <h1>Habit not found</h1>
          <a className="btn" href={href.today}>
            Back to today
          </a>
        </div>
      </div>
    );
  }

  const recentNotes = [...notes.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8);
  const { streaks } = stats;

  return (
    <div className="page detail" style={{ ['--hc' as string]: habit.color }}>
      <nav className="topbar">
        <a className="icon-btn ghost" href={href.today} aria-label="Back">
          <ChevronLeft />
        </a>
        <a className="btn small" href={href.edit(habit.id)}>
          <EditIcon size={16} /> Edit
        </a>
      </nav>

      <header className="detail-hero">
        <HabitIcon habit={habit} size={60} />
        <div>
          <h1 className="title">{habit.name}</h1>
          <p className="muted">
            {describeHabit(habit, ws)}
            {habit.reminderTime && (
              <span className="inline-meta">
                <BellIcon size={14} /> {formatTime(habit.reminderTime)}
              </span>
            )}
          </p>
          {habit.archivedAt && <p className="chip warn">Archived</p>}
        </div>
      </header>

      <section className="stats" aria-label="Statistics">
        <div className="stat accent">
          <span className="stat-label">
            <FlameIcon size={15} /> Current streak
          </span>
          <span className="stat-value">{formatStreak(streaks.current, streaks.unit)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Best streak</span>
          <span className="stat-value">{formatStreak(streaks.best, streaks.unit)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Last 30 days</span>
          <span className="stat-value">{formatPercent(stats.rate30.rate)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Times done</span>
          <span className="stat-value">{stats.total}</span>
        </div>
      </section>

      <div className="detail-grid">
        <div className="detail-col">

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Completion</h2>
              <p className="muted small">
                90 days {formatPercent(stats.rate90.rate)} · all time {formatPercent(stats.rateAll.rate)}
              </p>
            </div>
            <WeeklyChart rates={stats.weekly} color={habit.color} />
          </section>

          <section className="card">
            <h2 className="card-title">Past year</h2>
            <Heatmap habit={habit} counts={counts} today={today} weekStartsOn={ws} />
          </section>
        </div>

        <div className="detail-col">
          <section className="card">
            <MonthCalendar
              habit={habit}
              counts={counts}
              notes={notes}
              today={today}
              weekStartsOn={ws}
              month={month}
              onMonth={setMonth}
              onPick={setSheetDay}
            />
            <p className="muted small center">Tap a day to change it or add a note.</p>
          </section>

          <section className="card">
            <h2 className="card-title">Notes</h2>
            {recentNotes.length === 0 ? (
              <p className="muted small">No notes yet.</p>
            ) : (
              <ul className="notes">
                {recentNotes.map(([day, text]) => (
                  <li key={day}>
                    <button type="button" className="note-item" onClick={() => setSheetDay(day)}>
                      <span className="note-date">
                        <NoteIcon size={14} /> {formatDay(day, 'EEE d MMM')}
                      </span>
                      <span className="note-text">{text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {sheetDay && (
        <DaySheet
          key={sheetDay}
          habit={habit}
          day={sheetDay}
          count={counts.get(sheetDay) ?? 0}
          note={notes.get(sheetDay)}
          onClose={() => setSheetDay(null)}
        />
      )}
    </div>
  );
}
