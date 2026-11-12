import { useEffect, useId, useRef, useState } from 'react';
import { setCheckIn } from '../db/repo';
import { checkCount, checkNote, LIMITS, parseWhole } from '../lib/limits';
import { goalTarget } from '../lib/schedule';
import type { DayKey, Habit } from '../lib/types';
import { formatDay } from '../ui/format';
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon } from './icons';
import { HabitIcon } from './HabitIcon';
import { habitVars } from '../ui/color';

/** Edit one day's check-in: count (or done) and note. */
export function DaySheet({
  habit,
  day,
  count,
  note,
  onClose,
}: {
  habit: Habit;
  day: DayKey;
  count: number;
  note: string | undefined;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [countText, setCountText] = useState(String(count));
  const value = parseWhole(countText);
  const countError = habit.goal.kind === 'count' ? checkCount(value) : null;
  const setValue = (n: number) => setCountText(String(n));
  const [text, setText] = useState(note ?? '');
  const noteError = checkNote(text);
  const titleId = useId();
  const target = goalTarget(habit.goal);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const save = async () => {
    if (value === null || countError || noteError) return;
    await setCheckIn(habit.id, day, { count: value, note: text });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <form
        className="sheet-body"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="sheet-head" style={habitVars(habit.color)}>
          <HabitIcon habit={habit} size={40} />
          <div>
            <h2 id={titleId} className="sheet-title">
              {habit.name}
            </h2>
            <p className="muted small">{formatDay(day, 'EEEE d MMMM yyyy')}</p>
          </div>
          <button type="button" className="icon-btn ghost" aria-label="Close" onClick={() => ref.current?.close()}>
            <CloseIcon />
          </button>
        </div>

        {habit.goal.kind === 'check' ? (
          <button
            type="button"
            className={`toggle-done${(value ?? 0) >= 1 ? ' is-done' : ''}`}
            aria-pressed={(value ?? 0) >= 1}
            style={habitVars(habit.color)}
            onClick={() => setValue((value ?? 0) >= 1 ? 0 : 1)}
          >
            <span className="toggle-done-box">
              <CheckIcon size={18} strokeWidth={2.6} />
            </span>
            {(value ?? 0) >= 1 ? 'Done' : 'Not done'}
          </button>
        ) : (
          <div className="count-edit" style={habitVars(habit.color)}>
            <button
              type="button"
              className="stepper-btn big"
              aria-label="Decrease"
              disabled={value === null || value <= 0}
              onClick={() => setValue(Math.min(LIMITS.countMax, Math.max(0, (value ?? 1) - 1)))}
            >
              <MinusIcon />
            </button>
            <label className="count-edit-field">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={LIMITS.countMax}
                step={1}
                value={countText}
                onChange={(e) => setCountText(e.target.value)}
                aria-label={`Count (${habit.goal.unit || 'times'})`}
                aria-invalid={countError !== null}
                aria-describedby={countError ? 'count-error' : undefined}
              />
              <span className="muted">
                of {target} {habit.goal.unit}
              </span>
            </label>
            <button
              type="button"
              className="stepper-btn big"
              aria-label="Increase"
              disabled={value !== null && value >= LIMITS.countMax}
              onClick={() => setValue(Math.min(LIMITS.countMax, (value ?? 0) + 1))}
            >
              <PlusIcon />
            </button>
          </div>
        )}
        {countError && (
          <p id="count-error" className="field-error center" role="alert">
            {countError}
          </p>
        )}

        <label className="field">
          <span className="field-label">Note</span>
          <textarea
            rows={3}
            value={text}
            maxLength={LIMITS.noteLength}
            placeholder="How did it go?"
            onChange={(e) => setText(e.target.value)}
            aria-invalid={noteError !== null}
            aria-describedby={noteError ? 'note-error' : undefined}
          />
        </label>
        {noteError && (
          <p id="note-error" className="field-error" role="alert">
            {noteError}
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={countError !== null || noteError !== null}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
