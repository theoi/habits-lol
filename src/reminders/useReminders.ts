import { useEffect } from 'react';
import { claimReminder, getLastFired, releaseReminder } from '../db/repo';
import { toDayKey } from '../lib/dates';
import { remindersDue } from '../lib/reminders';
import { describeGoal } from '../ui/format';
import { useData } from '../ui/data';
import { notificationPermission, showNotification } from './notify';

const CHECK_EVERY_MS = 20_000;

/** Checks for due reminders while the app runs: on start, every 20 s, and when the page regains focus. */
export function useReminders(): void {
  const { habits, countsByHabit, settings, ready } = useData();

  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    const check = async () => {
      if (notificationPermission() !== 'granted') return;
      const now = new Date();
      const due = remindersDue({
        habits,
        countsByHabit,
        now,
        lastFired: await getLastFired(),
        weekStartsOn: settings.weekStartsOn,
      });
      const today = toDayKey(now);
      for (const habit of due) {
        if (stopped || !(await claimReminder(habit.id, today))) continue;
        const goal = describeGoal(habit.goal);
        try {
          await showNotification(habit.name, {
            icon: `${import.meta.env.BASE_URL}pwa-192.png`,
            body: goal ? `Still to do today: ${goal}` : 'Still to do today',
            tag: `habit-${habit.id}-${today}`,
            data: { url: `${import.meta.env.BASE_URL}#/habit/${encodeURIComponent(habit.id)}` },
          });
        } catch (error) {
          console.error('Reminder notification failed', error);
          await releaseReminder(habit.id, today);
        }
      }
    };
    void check();
    const id = window.setInterval(() => void check(), CHECK_EVERY_MS);
    const onWake = () => void check();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [ready, habits, countsByHabit, settings.weekStartsOn]);
}
