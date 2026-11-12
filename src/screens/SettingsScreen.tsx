import { useEffect, useRef, useState } from 'react';
import { DownloadIcon, UploadIcon } from '../components/icons';
import { exportAll, replaceAll, saveSettings } from '../db/repo';
import { backupFileName, makeBackup, parseBackup } from '../lib/backup';
import { useData } from '../ui/data';
import { notificationPermission, requestNotifications } from '../reminders/notify';
import { useToast } from '../ui/toast';

export function SettingsScreen() {
  const { settings, habits, checkIns } = useData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState(notificationPermission());
  const [persisted, setPersisted] = useState<boolean | null>(null);

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

  const doImport = async (file: File) => {
    const result = parseBackup(await file.text());
    if (!result.ok) {
      window.alert(`Could not import this file. ${result.error}`);
      return;
    }
    const { habits: h, checkIns: c } = result.data;
    const ok = window.confirm(
      `Replace all current data with this backup?\n\nBackup: ${h.length} habits, ${c.length} check-ins.\nCurrent: ${habits.length} habits, ${checkIns.length} check-ins.\n\nThis cannot be undone. Export first if you want to keep a copy.`,
    );
    if (!ok) return;
    await replaceAll(result.data);
    toast({ message: 'Backup imported' });
  };

  return (
    <div className="page settings">
      <header className="page-head">
        <h1 className="title">Settings</h1>
      </header>

      <section className="card">
        <h2 className="card-title">Week starts on</h2>
        <div className="segmented" role="radiogroup" aria-label="Week starts on">
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
              onClick={() => void saveSettings({ ...settings, weekStartsOn: v })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="muted small">Used for weekly goals, streaks, and calendars.</p>
      </section>

      <section className="card">
        <h2 className="card-title">Reminders</h2>
        {permission === 'unsupported' && <p className="muted">This browser does not support notifications.</p>}
        {permission === 'granted' && <p>Notifications are on.</p>}
        {permission === 'denied' && (
          <p className="muted">Notifications are blocked. Allow them for this site in your browser settings.</p>
        )}
        {permission === 'default' && (
          <button type="button" className="btn primary" onClick={() => void requestNotifications().then(setPermission)}>
            Allow notifications
          </button>
        )}
        <p className="muted small">
          Reminders fire while the app is open or running in the background. They cannot fire when the app is fully
          closed.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Backup</h2>
        <p className="muted small">Your data lives only on this device. Export a backup file to keep it safe or move it.</p>
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
              if (f) void doImport(f);
            }}
          />
        </div>
        <p className="muted small">Importing replaces everything currently in the app.</p>
      </section>

      <section className="card">
        <h2 className="card-title">Storage</h2>
        <p className="muted small">
          {persisted
            ? 'This browser will keep your data unless you clear it.'
            : 'The browser may clear stored data if the device runs low on space. Installing the app and exporting backups helps.'}
        </p>
      </section>
    </div>
  );
}
