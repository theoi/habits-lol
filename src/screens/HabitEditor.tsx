import { useState, type FormEvent } from 'react';
import { HabitIcon } from '../components/HabitIcon';
import { ArchiveIcon, ChevronLeft, MinusIcon, PlusIcon, RestoreIcon, TrashIcon } from '../components/icons';
import { archiveHabit, createHabit, deleteHabit, restoreHabit, updateHabit, type HabitDraft } from '../db/repo';
import { orderedWeekdays } from '../lib/dates';
import type { Habit, Weekday } from '../lib/types';
import { useData } from '../ui/data';
import { WEEKDAY_SHORT } from '../ui/format';
import { href } from '../ui/router';

export const HABIT_COLORS = ['#4f9a78', '#3d7fb8', '#d49a2a', '#d8664b', '#8d6ac2', '#2f9ea0', '#c95b84', '#64748b'];
export const HABIT_ICONS = [
  '💧', '🚶', '📖', '🏋️', '🧘', '📞', '🥗', '😴', '✍️', '🎸', '🧹', '💊',
  '🌱', '🏃', '🚴', '🧠', '🎨', '💻', '🦷', '☀️', '🍎', '🚭', '💰', '❤️',
];

type ScheduleKind = 'daily' | 'weekdays' | 'perWeek';

function initialDraft(habit: Habit | undefined): HabitDraft {
  return habit
    ? {
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        schedule: habit.schedule,
        goal: habit.goal,
        reminderTime: habit.reminderTime,
      }
    : {
        name: '',
        icon: '🌱',
        color: HABIT_COLORS[0]!,
        schedule: { kind: 'daily' },
        goal: { kind: 'check' },
        reminderTime: null,
      };
}

export function HabitEditor({ id }: { id?: string }) {
  const { habits, settings, ready } = useData();
  const existing = id ? habits.find((h) => h.id === id) : undefined;
  if (!ready) return <div className="page" aria-busy="true" />;
  if (id && !existing)
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
  return <EditorForm key={id ?? 'new'} existing={existing} weekStartsOn={settings.weekStartsOn} />;
}

function EditorForm({ existing, weekStartsOn }: { existing: Habit | undefined; weekStartsOn: 0 | 1 }) {
  const [draft, setDraft] = useState<HabitDraft>(() => initialDraft(existing));
  const [weekdays, setWeekdays] = useState<Weekday[]>(
    existing?.schedule.kind === 'weekdays' ? existing.schedule.days : [1, 2, 3, 4, 5],
  );
  const [times, setTimes] = useState(existing?.schedule.kind === 'perWeek' ? existing.schedule.times : 3);
  const [target, setTarget] = useState(existing?.goal.kind === 'count' ? existing.goal.target : 8);
  const [unit, setUnit] = useState(existing?.goal.kind === 'count' ? existing.goal.unit : '');
  const [error, setError] = useState<string | null>(null);
  const kind: ScheduleKind = draft.schedule.kind;
  const back = existing ? href.detail(existing.id) : href.today;

  const patch = (p: Partial<HabitDraft>) => setDraft((d) => ({ ...d, ...p }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return setError('Give your habit a name.');
    if (kind === 'weekdays' && weekdays.length === 0) return setError('Pick at least one day.');
    const final: HabitDraft = {
      ...draft,
      name,
      schedule:
        kind === 'daily'
          ? { kind: 'daily' }
          : kind === 'weekdays'
            ? { kind: 'weekdays', days: [...weekdays].sort() }
            : { kind: 'perWeek', times },
      goal:
        draft.goal.kind === 'check'
          ? { kind: 'check' }
          : { kind: 'count', target: Math.max(1, Math.floor(target) || 1), unit: unit.trim() },
    };
    if (existing) {
      await updateHabit(existing.id, final);
      window.location.replace(href.detail(existing.id));
    } else {
      await createHabit(final);
      window.location.replace(href.today);
    }
  };

  return (
    <div className="page editor">
      <nav className="topbar">
        <a className="icon-btn ghost" href={back} aria-label="Cancel">
          <ChevronLeft />
        </a>
        <h1 className="topbar-title">{existing ? 'Edit habit' : 'New habit'}</h1>
        <span className="topbar-spacer" />
      </nav>

      <form className="form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="name-row" style={{ ['--hc' as string]: draft.color }}>
          <HabitIcon habit={draft} size={56} />
          <label className="field grow">
            <span className="field-label">Name</span>
            <input
              className="input-lg"
              value={draft.name}
              maxLength={80}
              placeholder="e.g. Drink water"
              autoFocus={!existing}
              onChange={(e) => {
                patch({ name: e.target.value });
                setError(null);
              }}
            />
          </label>
        </div>

        <fieldset className="field">
          <legend className="field-label">Icon</legend>
          <div className="icon-grid">
            {HABIT_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`icon-choice${draft.icon === icon ? ' is-selected' : ''}`}
                aria-pressed={draft.icon === icon}
                aria-label={`Icon ${icon}`}
                onClick={() => patch({ icon })}
              >
                {icon}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">Color</legend>
          <div className="swatches">
            {HABIT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch${draft.color === color ? ' is-selected' : ''}`}
                style={{ ['--sw' as string]: color }}
                aria-pressed={draft.color === color}
                aria-label={`Color ${color}`}
                onClick={() => patch({ color })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">How often</legend>
          <div className="segmented" role="radiogroup" aria-label="How often">
            {(
              [
                ['daily', 'Every day'],
                ['weekdays', 'Some days'],
                ['perWeek', 'Times a week'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                className={kind === k ? 'is-selected' : ''}
                onClick={() =>
                  patch({
                    schedule:
                      k === 'daily' ? { kind: 'daily' } : k === 'weekdays' ? { kind: 'weekdays', days: weekdays } : { kind: 'perWeek', times },
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          {kind === 'weekdays' && (
            <div className="day-chips" role="group" aria-label="Days">
              {orderedWeekdays(weekStartsOn).map((d) => {
                const on = weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`day-chip${on ? ' is-selected' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      setWeekdays(on ? weekdays.filter((x) => x !== d) : [...weekdays, d]);
                      setError(null);
                    }}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
          )}
          {kind === 'perWeek' && (
            <div className="inline-stepper">
              <button
                type="button"
                className="stepper-btn"
                aria-label="Fewer times"
                disabled={times <= 1}
                onClick={() => setTimes(times - 1)}
              >
                <MinusIcon size={18} />
              </button>
              <span className="inline-stepper-value" aria-live="polite">
                {times}× a week
              </span>
              <button
                type="button"
                className="stepper-btn"
                aria-label="More times"
                disabled={times >= 7}
                onClick={() => setTimes(times + 1)}
              >
                <PlusIcon size={18} />
              </button>
            </div>
          )}
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">Goal each time</legend>
          <div className="segmented" role="radiogroup" aria-label="Goal">
            <button
              type="button"
              role="radio"
              aria-checked={draft.goal.kind === 'check'}
              className={draft.goal.kind === 'check' ? 'is-selected' : ''}
              onClick={() => patch({ goal: { kind: 'check' } })}
            >
              Check off
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={draft.goal.kind === 'count'}
              className={draft.goal.kind === 'count' ? 'is-selected' : ''}
              onClick={() => patch({ goal: { kind: 'count', target, unit } })}
            >
              Reach a number
            </button>
          </div>
          {draft.goal.kind === 'count' && (
            <div className="count-fields">
              <label className="field">
                <span className="field-label small">Target</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                />
              </label>
              <label className="field grow">
                <span className="field-label small">Unit</span>
                <input value={unit} maxLength={24} placeholder="glasses, pages, minutes…" onChange={(e) => setUnit(e.target.value)} />
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="field">
          <legend className="field-label">Reminder</legend>
          <div className="reminder-row">
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                checked={draft.reminderTime !== null}
                onChange={(e) => patch({ reminderTime: e.target.checked ? '09:00' : null })}
              />
              <span className="switch-track" aria-hidden="true" />
              <span>Remind me</span>
            </label>
            {draft.reminderTime !== null && (
              <input
                type="time"
                aria-label="Reminder time"
                value={draft.reminderTime}
                onChange={(e) => e.target.value && patch({ reminderTime: e.target.value })}
              />
            )}
          </div>
          <p className="muted small">Reminders show while the app is open or running in a background tab.</p>
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <a className="btn" href={back}>
            Cancel
          </a>
          <button type="submit" className="btn primary">
            {existing ? 'Save changes' : 'Create habit'}
          </button>
        </div>

        {existing && <DangerZone habit={existing} />}
      </form>
    </div>
  );
}

function DangerZone({ habit }: { habit: Habit }) {
  return (
    <div className="danger">
      {habit.archivedAt === null ? (
        <button
          type="button"
          className="btn"
          onClick={() => void archiveHabit(habit.id).then(() => window.location.replace(href.today))}
        >
          <ArchiveIcon size={18} /> Archive habit
        </button>
      ) : (
        <button type="button" className="btn" onClick={() => void restoreHabit(habit.id)}>
          <RestoreIcon size={18} /> Restore habit
        </button>
      )}
      <button
        type="button"
        className="btn danger-btn"
        onClick={() => {
          if (window.confirm(`Delete “${habit.name}” and all its history? This cannot be undone.`))
            void deleteHabit(habit.id).then(() => window.location.replace(href.today));
        }}
      >
        <TrashIcon size={18} /> Delete
      </button>
      <p className="muted small">Archiving hides the habit and keeps its history. You can restore it later.</p>
    </div>
  );
}
