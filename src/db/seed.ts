import { addDays, eachDay, startOfWeek, todayKey, weekdayOf } from '../lib/dates';
import type { CheckIn, DayKey, Habit } from '../lib/types';
import { db } from './db';

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES: Record<string, string[]> = {
  walk: ['Along the river, saw two herons', 'Short loop, it was raining', 'Walked to the market instead of driving'],
  workout: ['Leg day. Tough but good.', 'New personal best on rows', 'Easy session, a bit tired'],
  read: ['Finished “The Overstory”', 'Started a new chapter on sleep'],
  meditate: [
    '10 minutes, felt calmer afterwards',
    'Mind kept wandering, still sat through it',
    'Body scan before bed',
    'Breathing exercise on the train',
    'Guided session on gratitude',
  ],
};

/** Adds a realistic set of habits with about four months of history. */
export async function seedSampleData(now: Date): Promise<void> {
  const today = todayKey(now);
  const start = addDays(today, -120);
  const createdAt = new Date(now.getTime() - 120 * 86_400_000).toISOString();
  const r = rng(7);
  const base = { createdAt, startDay: start, archivedAt: null };

  const habits: Habit[] = [
    { ...base, id: 'water', order: 0, name: 'Drink water', icon: 'droplet', color: '#3d7fb8', schedule: { kind: 'daily' }, goal: { kind: 'count', target: 8, unit: 'glasses' }, reminderTime: '11:00' },
    { ...base, id: 'walk', order: 1, name: 'Morning walk', icon: 'walk', color: '#4f9a78', schedule: { kind: 'daily' }, goal: { kind: 'check' }, reminderTime: '07:30' },
    { ...base, id: 'meditate', order: 2, name: 'Meditate', icon: 'lotus', color: '#8d6ac2', schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] }, goal: { kind: 'check' }, reminderTime: null },
    { ...base, id: 'read', order: 3, name: 'Read', icon: 'book', color: '#d49a2a', schedule: { kind: 'daily' }, goal: { kind: 'count', target: 20, unit: 'pages' }, reminderTime: '21:30' },
    { ...base, id: 'workout', order: 4, name: 'Strength training', icon: 'dumbbell', color: '#d8664b', schedule: { kind: 'perWeek', times: 3 }, goal: { kind: 'check' }, reminderTime: null },
    { ...base, id: 'call', order: 5, name: 'Call family', icon: 'phone', color: '#2f9ea0', schedule: { kind: 'perWeek', times: 1 }, goal: { kind: 'check' }, reminderTime: null },
    { ...base, id: 'nosocial', order: 6, name: 'No phone in bed', icon: 'moon', color: '#64748b', schedule: { kind: 'daily' }, goal: { kind: 'check' }, reminderTime: null, archivedAt: new Date(now.getTime() - 20 * 86_400_000).toISOString() },
  ];

  const checkIns: CheckIn[] = [];
  const lastNote = new Map<string, string>();
  const add = (habitId: string, day: DayKey, count: number) => {
    if (count <= 0) return;
    const pool = NOTES[habitId];
    let note = pool && r() < 0.08 ? pool[Math.floor(r() * pool.length)] : undefined;
    if (note && note === lastNote.get(habitId)) note = undefined;
    if (note) lastNote.set(habitId, note);
    checkIns.push({ habitId, day, count, updatedAt: createdAt, ...(note ? { note } : {}) });
  };

  const past = eachDay(start, addDays(today, -1));
  const recent = (day: DayKey, n: number) => day >= addDays(today, -n);
  for (const day of past) {
    const wd = weekdayOf(day);
    add('water', day, r() < 0.72 ? 8 + Math.floor(r() * 3) : 3 + Math.floor(r() * 5));
    add('walk', day, recent(day, 16) || r() < 0.8 ? 1 : 0);
    if (wd >= 1 && wd <= 5) add('meditate', day, recent(day, 9) || r() < 0.7 ? 1 : 0);
    add('read', day, r() < 0.65 ? 20 + Math.floor(r() * 15) : r() < 0.5 ? 5 + Math.floor(r() * 12) : 0);
    add('nosocial', day, day < addDays(today, -20) && r() < 0.5 ? 1 : 0);
  }
  // Per-week habits: pick days within each past week.
  for (let ws = startOfWeek(start, 1); ws < startOfWeek(today, 1); ws = addDays(ws, 7)) {
    const days = eachDay(ws, addDays(ws, 6)).filter((d) => d >= start);
    const n = r() < 0.85 ? 3 + (r() < 0.3 ? 1 : 0) : 2;
    for (const d of [...days].sort(() => r() - 0.5).slice(0, n)) add('workout', d, 1);
    if (r() < 0.9) add('call', days[Math.floor(r() * days.length)]!, 1);
  }
  // This week so far.
  const thisWeek = eachDay(startOfWeek(today, 1), addDays(today, -1));
  for (const d of thisWeek.slice(0, 2)) add('workout', d, 1);

  // Today: a partly finished day.
  checkIns.push(
    { habitId: 'walk', day: today, count: 1, updatedAt: now.toISOString(), note: 'Sunrise loop around the park' },
    { habitId: 'water', day: today, count: 5, updatedAt: now.toISOString() },
  );

  await db.transaction('rw', db.habits, db.checkIns, async () => {
    await db.habits.bulkPut(habits);
    await db.checkIns.bulkPut(checkIns);
  });
}
