import { setCheckIn } from '../db/repo';
import { goalTarget } from '../lib/schedule';
import type { DayKey, Habit } from '../lib/types';
import { CheckIcon, MinusIcon, PlusIcon } from './icons';

export function CheckControl({
  habit,
  day,
  count,
  note,
  onChanged,
  onOpenDay,
}: {
  habit: Habit;
  day: DayKey;
  count: number;
  note: string | undefined;
  onChanged?: (count: number) => void;
  onOpenDay?: () => void;
}) {
  const target = goalTarget(habit.goal);
  const done = count >= target;
  const set = (next: number) => {
    void setCheckIn(habit.id, day, { count: next, note });
    onChanged?.(next);
  };

  if (habit.goal.kind === 'check') {
    return (
      <button
        type="button"
        className={`check-btn${done ? ' is-done' : ''}`}
        aria-pressed={done}
        aria-label={done ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
        onClick={() => set(done ? 0 : 1)}
      >
        <CheckIcon size={22} strokeWidth={2.6} />
      </button>
    );
  }

  return (
    <div className={`stepper${done ? ' is-done' : ''}`} role="group" aria-label={`${habit.name} count`}>
      <button
        type="button"
        className="stepper-btn"
        aria-label={`Decrease ${habit.name}`}
        disabled={count === 0}
        onClick={() => set(count - 1)}
      >
        <MinusIcon size={18} />
      </button>
      <button
        type="button"
        className="stepper-value"
        onClick={onOpenDay}
        aria-label={`${count} of ${target} ${habit.goal.unit}. Edit`}
      >
        <span className="stepper-count">{count}</span>
        <span className="stepper-target">/{target}</span>
      </button>
      <button type="button" className="stepper-btn" aria-label={`Increase ${habit.name}`} onClick={() => set(count + 1)}>
        {done ? <CheckIcon size={18} strokeWidth={2.6} /> : <PlusIcon size={18} />}
      </button>
    </div>
  );
}
