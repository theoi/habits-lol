import { HabitIcon } from '../components/HabitIcon';
import { ArchiveIcon, ChevronDown, ChevronUp, PlusIcon, RestoreIcon } from '../components/icons';
import { archiveHabit, reorderHabits, restoreHabit } from '../db/repo';
import { useData } from '../ui/data';
import { describeHabit } from '../ui/format';
import { href } from '../ui/router';

export function HabitsScreen() {
  const { habits, settings, ready } = useData();
  if (!ready) return <div className="page" aria-busy="true" />;
  const active = habits.filter((h) => h.archivedAt === null);
  const archived = habits.filter((h) => h.archivedAt !== null);

  const move = (index: number, delta: number) => {
    const ids = active.map((h) => h.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    void reorderHabits(ids);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="title">Habits</h1>
        <a className="btn primary small" href={href.newHabit}>
          <PlusIcon size={16} /> New
        </a>
      </header>

      {active.length === 0 && <p className="muted">No active habits.</p>}
      <ul className="manage-list" aria-label="Active habits">
        {active.map((h, i) => (
          <li key={h.id} className="manage-row" style={{ ['--hc' as string]: h.color }}>
            <a className="manage-main" href={href.detail(h.id)}>
              <HabitIcon habit={h} size={40} />
              <span className="habit-text">
                <span className="habit-name">{h.name}</span>
                <span className="habit-meta">{describeHabit(h, settings.weekStartsOn)}</span>
              </span>
            </a>
            <div className="manage-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move ${h.name} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move ${h.name} down`}
                disabled={i === active.length - 1}
                onClick={() => move(i, 1)}
              >
                <ChevronDown size={18} />
              </button>
              <button type="button" className="icon-btn" aria-label={`Archive ${h.name}`} onClick={() => void archiveHabit(h.id)}>
                <ArchiveIcon size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="group">
          <h2 className="group-title">Archived</h2>
          <ul className="manage-list" aria-label="Archived habits">
            {archived.map((h) => (
              <li key={h.id} className="manage-row is-muted" style={{ ['--hc' as string]: h.color }}>
                <a className="manage-main" href={href.detail(h.id)}>
                  <HabitIcon habit={h} size={40} />
                  <span className="habit-text">
                    <span className="habit-name">{h.name}</span>
                    <span className="habit-meta">{describeHabit(h, settings.weekStartsOn)}</span>
                  </span>
                </a>
                <div className="manage-actions">
                  <button type="button" className="btn small" onClick={() => void restoreHabit(h.id)}>
                    <RestoreIcon size={16} /> Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
