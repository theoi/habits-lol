import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BellIcon, DownloadIcon, UploadIcon } from '../components/icons';
import { exportAll, replaceAll, saveSettings } from '../db/repo';
import { backupFileName, makeBackup, parseBackup, type BackupData } from '../lib/backup';
import type { Settings } from '../lib/types';
import { notificationPermission, requestNotifications } from '../reminders/notify';
import { useData } from '../ui/data';
import { useToast } from '../ui/toast';

type ImportState = { kind: 'confirm'; data: BackupData } | { kind: 'error'; message: string } | null;

export function SettingsScreen() {
  const { settings: saved, habits, checkIns } = useData();
  // Shown immediately on change instead of waiting for the database round trip.
  const [settings, setSettings] = useState<Settings>(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setSettings(saved);
  }
  const update = (next: Settings) => {
    setSettings(next);
    void saveSettings(next);
  };
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState(notificationPermission());
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [importing, setImporting] = useState<ImportState>(null);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(makeBackup(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ message: 'Backup saved' });
  };

  const readImport = async (file: File) => {
    const result = parseBackup(await file.text());
    setImporting(result.ok ? { kind: 'confirm', data: result.data } : { kind: 'error', message: result.error });
  };

  return (
    <div className="page settings">
      <header className="page-head">
        <h1 className="title">Settings</h1>
      </header>

      <section className="card settings-card" aria-labelledby="display-h">
        <h2 id="display-h" className="card-title">
          Display
        </h2>
        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-label" id="week-start-label">
              Week starts on
            </span>
            <span className="muted small">For weekly goals, streaks, and calendars.</span>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="week-start-label">
            {(
              [
                [1, 'Monday'],
                [0, 'Sunday'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={settings.weekStartsOn === v}
                className={settings.weekStartsOn === v ? 'is-selected' : ''}
                onClick={() => update({ ...settings, weekStartsOn: v })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="setting-row">
          <span className="setting-text">
            <span className="setting-label">Compact list</span>
            <span className="muted small">Smaller rows on Today and Habits, to see more at once.</span>
          </span>
          <span className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={settings.compact}
              onChange={(e) => update({ ...settings, compact: e.target.checked })}
            />
            <span className="switch-track" aria-hidden="true" />
          </span>
        </label>
      </section>

      <section className="card settings-card" aria-labelledby="reminders-h">
        <h2 id="reminders-h" className="card-title">
          Reminders
        </h2>
        <div className="setting-row">
          <div className="setting-text">
            <span className="setting-label">
              <BellIcon size={16} /> Notifications
            </span>
            <span className="muted small">
              {permission === 'granted' && 'On. Reminders show at the time set on each habit.'}
              {permission === 'default' && 'Allow notifications to get reminders.'}
              {permission === 'denied' && 'Blocked. Allow notifications for this site in your browser settings.'}
              {permission === 'unsupported' && 'This browser does not support notifications.'}
            </span>
          </div>
          {permission === 'default' && (
            <button type="button" className="btn primary small" onClick={() => void requestNotifications().then(setPermission)}>
              Allow
            </button>
          )}
          {permission === 'granted' && <span className="status-pill">On</span>}
        </div>
        <p className="muted small">
          Reminders fire while the app is open or running in the background, up to an hour after the set time if the
          habit is still due. They can’t fire when the app is fully closed.
        </p>
      </section>

      <section className="card settings-card" aria-labelledby="backup-h">
        <h2 id="backup-h" className="card-title">
          Backup
        </h2>
        <p className="muted small">
          Your data lives only on this device. Export a backup file to keep it safe or move it to another device.
        </p>
        <div className="row gap wrap">
          <button type="button" className="btn" onClick={() => void doExport()}>
            <DownloadIcon size={18} /> Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <UploadIcon size={18} /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void readImport(f);
            }}
          />
        </div>
        <p className="muted small">
          {habits.length} habits and {checkIns.length} check-ins on this device. Importing replaces all of them.
        </p>
      </section>

      <section className="card settings-card" aria-labelledby="about-h">
        <h2 id="about-h" className="card-title">
          About
        </h2>
        <p className="muted small">
          {persisted
            ? 'This browser keeps your data unless you clear site data.'
            : 'The browser may clear stored data when the device runs low on space. Installing the app and exporting backups helps.'}
        </p>
        <p className="muted small">
          Habits makes no network requests with your data and has no accounts or server.{' '}
          <a className="link" href="https://github.com/theoi/habits-lol" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </p>
      </section>

      {importing?.kind === 'confirm' && (
        <ConfirmDialog
          title="Replace all data?"
          confirmLabel="Replace"
          danger
          onConfirm={async () => {
            await replaceAll(importing.data);
            toast({ message: 'Backup imported' });
          }}
          onClose={() => setImporting(null)}
        >
          <dl className="compare">
            <div>
              <dt>Backup</dt>
              <dd>
                {importing.data.habits.length} habits, {importing.data.checkIns.length} check-ins
              </dd>
            </div>
            <div>
              <dt>On this device</dt>
              <dd>
                {habits.length} habits, {checkIns.length} check-ins
              </dd>
            </div>
          </dl>
          <p className="muted small">This cannot be undone. Export first if you want to keep a copy.</p>
        </ConfirmDialog>
      )}
      {importing?.kind === 'error' && (
        <ConfirmDialog title="Couldn’t import this file" onClose={() => setImporting(null)}>
          <p>{importing.message}</p>
          <p className="muted small">Nothing was changed.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
