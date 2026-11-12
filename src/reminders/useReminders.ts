import { useEffect } from 'react';
import { db } from '../db/db';
import { claimReminder, getLastFired, getSettings, releaseReminder } from '../db/repo';
import { toDayKey } from '../lib/dates';
import { remindersDue } from '../lib/reminders';
import { countsFor } from '../lib/schedule';
import { describeGoal } from '../ui/format';
import { notificationPermission, showNotification } from './notify';

const CHECK_EVERY_MS = 20_000;

/**
 * Fires due reminders. Reads habits and check-ins fresh from the database on
 * each run, so a check-in made a moment ago (in this tab or another) is seen.
 */
export async function checkReminders(now: Date = new Date()): Promise<string[]> {
  if (notificationPermission() !== 'granted') return [];
  const { habits, checkIns, settings, lastFired } = await db.transaction('r', db.habits, db.checkIns, db.meta, async () => {
    const habits = (await db.habits.toArray()).filter((h) => h.reminderTime && h.archivedAt === null);
    return {
      habits,
      checkIns: await db.checkIns.where('habitId').anyOf(habits.map((h) => h.id)).toArray(),
      settings: await getSettings(),
      lastFired: await getLastFired(),
    };
  });
  const due = remindersDue({
    habits,
    countsByHabit: new Map(habits.map((h) => [h.id, countsFor(h.id, checkIns)])),
    now,
    lastFired,
    weekStartsOn: settings.weekStartsOn,
  });
  const today = toDayKey(now);
  const fired: string[] = [];
  for (const habit of due) {
    if (!(await claimReminder(habit.id, today))) continue;
    const goal = describeGoal(habit.goal);
    try {
      await showNotification(habit.name, {
        icon: `${import.meta.env.BASE_URL}pwa-192.png`,
        body: goal ? `Still to do today: ${goal}` : 'Still to do today',
        tag: `habit-${habit.id}-${today}`,
        data: { url: `${import.meta.env.BASE_URL}#/habit/${encodeURIComponent(habit.id)}` },
      });
      fired.push(habit.id);
    } catch (error) {
      console.error('Reminder notification failed', error);
      await releaseReminder(habit.id, today);
    }
  }
  return fired;
}

/**
 * Checks for due reminders while the app runs: on start, every 20 s (browsers
 * slow this to about once a minute in background tabs), and when the page
 * becomes visible or focused. Runs never overlap; a request that arrives
 * mid-run triggers one more run afterwards.
 */
export function useReminders(): void {
  useEffect(() => {
    let running = false;
    let again = false;
    let stopped = false;
    const run = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          await checkReminders();
        } while (again && !stopped);
      } catch (error) {
        console.error('Reminder check failed', error);
      } finally {
        running = false;
      }
    };
    const trigger = () => void run();
    trigger();
    const id = window.setInterval(trigger, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', trigger);
    window.addEventListener('focus', trigger);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', trigger);
      window.removeEventListener('focus', trigger);
    };
  }, []);
}
