import { HABIT_ICON_PATHS, normalizeHabitIcon, type HabitIconId } from '../lib/icons';
import type { Habit } from '../lib/types';
import { habitVars } from '../ui/color';

export function LineIcon({ id, size = 22, strokeWidth = 1.8 }: { id: HabitIconId; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={HABIT_ICON_PATHS[id]} />
    </svg>
  );
}

export function HabitIcon({ habit, size = 44 }: { habit: Pick<Habit, 'icon' | 'color'>; size?: number }) {
  return (
    <span className="habit-icon" style={{ ...habitVars(habit.color), width: size, height: size }} aria-hidden="true">
      <LineIcon id={normalizeHabitIcon(habit.icon)} size={Math.round(size * 0.5)} strokeWidth={size >= 52 ? 1.7 : 1.9} />
    </span>
  );
}
