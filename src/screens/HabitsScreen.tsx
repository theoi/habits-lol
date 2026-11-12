import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HabitIcon } from '../components/HabitIcon';
import { ArchiveIcon, BellIcon, ChevronDown, ChevronUp, FlameIcon, PlusIcon, RestoreIcon, TrashIcon } from '../components/icons';
import { archiveHabit, deleteHabit, reorderHabits, restoreHabit } from '../db/repo';
import { computeStreaks } from '../lib/streaks';
import type { Habit } from '../lib/types';
import { habitVars } from '../ui/color';
import { useData } from '../ui/data';
import { describeHabit, formatStreak, formatTime } from '../ui/format';
import { href } from '../ui/router';
import { useToast } from '../ui/toast';

export function HabitsScreen() {
  const { habits, countsByHabit, settings, today, ready } = useData();
  const [deleting, setDeleting] = useState<Habit | null>(null);
  const toast = useToast();
  if (!ready) return <div className="page" aria-busy="true" />;
  const active = habits.filter((h) => h.archivedAt === null);
  const archived = habits.filter((h) => h.archivedAt !== null);
  const ws = settings.weekStartsOn;

  const move = (index: number, delta: number) => {
    const ids = active.map((h) => h.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    void reorderHabits(ids);
  };

  return (
    <div className="page habits">
      <header className="page-head">
        <div>
          <h1 className="title">Habits</h1>
          <p className="muted small">
            {active.length} active{archived.length > 0 && ` · ${archived.length} archived`}
          </p>
        </div>
        <a className="btn primary small" href={href.newHabit}>
          <PlusIcon size={16} /> New habit
        </a>
      </header>

      {active.length === 0 ? (
        <div className="card empty-card">
          <p>No active habits.</p>
          <a className="btn small" href={href.newHabit}>
            <PlusIcon size={16} /> Add one
          </a>
        </div>
      ) : (
        <>
          <ul className="list" aria-label="Active habits">
            {active.map((h, i) => {
              const streak = computeStreaks(h, countsByHabit.get(h.id) ?? new Map(), today, ws);
              return (
                <li key={h.id} className="list-row" style={habitVars(h.color)}>
                  <a className="list-main" href={href.detail(h.id)}>
                    <HabitIcon habit={h} size={40} />
                    <span className="habit-text">
                      <span className="habit-name">{h.name}</span>
                      <span className="habit-meta">
                        <span>{describeHabit(h, ws)}</span>
                        {h.reminderTime && (
                          <span>
                            <BellIcon size={13} /> {formatTime(h.reminderTime)}
                          </span>
                        )}
                        {streak.current > 0 && (
                          <span className="streak">
                            <FlameIcon size={13} /> {formatStreak(streak.current, streak.unit)}
                          </span>
                        )}
                      </span>
                    </span>
                  </a>
                  <div className="list-actions">
                    <button
                      type="button"
                      className="icon-btn ghost"
                      aria-label={`Move ${h.name} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn ghost"
                      aria-label={`Move ${h.name} down`}
                      disabled={i === active.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn ghost"
                      aria-label={`Archive ${h.name}`}
                      title="Archive"
                      onClick={() =>
                        void archiveHabit(h.id).then(() =>
                          toast({ message: `${h.name} archived`, action: { label: 'Undo', run: () => void restoreHabit(h.id) } }),
                        )
                      }
                    >
                      <ArchiveIcon size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="muted small list-hint">The order here is the order on Today.</p>
        </>
      )}

      {archived.length > 0 && (
        <section className="group" aria-labelledby="archived-h">
          <h2 id="archived-h" className="group-title">
            Archived
          </h2>
          <ul className="list" aria-label="Archived habits">
            {archived.map((h) => (
              <li key={h.id} className="list-row is-archived" style={habitVars(h.color)}>
                <a className="list-main" href={href.detail(h.id)}>
                  <HabitIcon habit={h} size={40} />
                  <span className="habit-text">
                    <span className="habit-name">{h.name}</span>
                    <span className="habit-meta">{describeHabit(h, ws)}</span>
                  </span>
                </a>
                <div className="list-actions">
                  <button
                    type="button"
                    className="icon-btn ghost"
                    aria-label={`Restore ${h.name}`}
                    title="Restore"
                    onClick={() => void restoreHabit(h.id)}
                  >
                    <RestoreIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn ghost danger-icon"
                    aria-label={`Delete ${h.name}`}
                    title="Delete"
                    onClick={() => setDeleting(h)}
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted small list-hint">Archived habits keep their history and don’t appear on Today.</p>
        </section>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => deleteHabit(deleting.id)}
          onClose={() => setDeleting(null)}
        >
          <p>This removes the habit and all of its history. It cannot be undone.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
