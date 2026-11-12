import type { Habit } from '../lib/types';

export function HabitIcon({ habit, size = 44 }: { habit: Pick<Habit, 'icon' | 'color'>; size?: number }) {
  return (
    <span
      className="habit-icon"
      style={{ ['--hc' as string]: habit.color, width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {habit.icon || '•'}
    </span>
  );
}
