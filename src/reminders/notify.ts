export type Permission = NotificationPermission | 'unsupported';

export function notificationPermission(): Permission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function requestNotifications(): Promise<Permission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

/**
 * Shows a notification through the active service worker, which mobile
 * browsers require, or as a page notification when no worker is active yet.
 * Never waits on a timer, so it behaves the same when timers are throttled.
 */
export async function showNotification(title: string, options: NotificationOptions & { data?: unknown }): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg?.active) {
    await reg.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}
