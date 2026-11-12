export type Permission = NotificationPermission | 'unsupported';

export function notificationPermission(): Permission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function requestNotifications(): Promise<Permission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

/**
 * Shows a notification through the service worker, which mobile browsers
 * require, falling back to a page notification when no worker is active.
 */
export async function showNotification(title: string, options: NotificationOptions & { data?: unknown }): Promise<void> {
  const reg = navigator.serviceWorker
    ? await Promise.race([navigator.serviceWorker.ready, new Promise<undefined>((r) => setTimeout(r, 3000))])
    : undefined;
  if (reg) {
    await reg.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}
