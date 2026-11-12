import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'today'; day?: string }
  | { name: 'habits' }
  | { name: 'settings' }
  | { name: 'new' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'habits':
      return { name: 'habits' };
    case 'settings':
      return { name: 'settings' };
    case 'new':
      return { name: 'new' };
    case 'habit':
      if (parts[1]) return parts[2] === 'edit' ? { name: 'edit', id: parts[1] } : { name: 'detail', id: parts[1] };
      break;
  }
  return { name: 'today' };
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export const href = {
  today: '#/',
  habits: '#/habits',
  settings: '#/settings',
  newHabit: '#/new',
  detail: (id: string) => `#/habit/${encodeURIComponent(id)}`,
  edit: (id: string) => `#/habit/${encodeURIComponent(id)}/edit`,
};

export function navigate(to: string): void {
  window.location.hash = to;
}
