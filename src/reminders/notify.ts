export type Permission = NotificationPermission | 'unsupported';

export function notificationPermission(): Permission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function requestNotifications(): Promise<Permission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

/** Shows a notification through the service worker when available, which mobile browsers require. */
export async function showNotification(title: string, options: NotificationOptions & { data?: unknown }): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) {
    await reg.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}
