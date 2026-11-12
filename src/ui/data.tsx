import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getSettings } from '../db/repo';
import { todayKey } from '../lib/dates';
import { DEFAULT_SETTINGS, type CheckIn, type DayKey, type Habit, type Settings } from '../lib/types';

export interface AppData {
  ready: boolean;
  habits: Habit[];
  checkIns: CheckIn[];
  settings: Settings;
  countsByHabit: Map<string, Map<DayKey, number>>;
  notesByHabit: Map<string, Map<DayKey, string>>;
  today: DayKey;
}

const DataContext = createContext<AppData | null>(null);

const EMPTY: never[] = [];

function useToday(): DayKey {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);
  return today;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const today = useToday();

  const { countsByHabit, notesByHabit } = useMemo(() => {
    const counts = new Map<string, Map<DayKey, number>>();
    const notes = new Map<string, Map<DayKey, string>>();
    for (const c of checkIns ?? EMPTY) {
      if (c.count > 0) {
        let m = counts.get(c.habitId);
        if (!m) counts.set(c.habitId, (m = new Map()));
        m.set(c.day, c.count);
      }
      if (c.note) {
        let m = notes.get(c.habitId);
        if (!m) notes.set(c.habitId, (m = new Map()));
        m.set(c.day, c.note);
      }
    }
    return { countsByHabit: counts, notesByHabit: notes };
  }, [checkIns]);

  const value = useMemo<AppData>(
    () => ({
      ready: habits !== undefined && checkIns !== undefined && settings !== undefined,
      habits: habits ?? EMPTY,
      checkIns: checkIns ?? EMPTY,
      settings: settings ?? DEFAULT_SETTINGS,
      countsByHabit,
      notesByHabit,
      today,
    }),
    [habits, checkIns, settings, countsByHabit, notesByHabit, today],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): AppData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

const NO_COUNTS: ReadonlyMap<DayKey, number> = new Map();

export function useCounts(habitId: string): ReadonlyMap<DayKey, number> {
  return useData().countsByHabit.get(habitId) ?? NO_COUNTS;
}
