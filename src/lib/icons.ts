/**
 * Line icons for habits, drawn on a 24×24 grid with round strokes. A habit
 * stores the icon id. Emoji from older data map through LEGACY_EMOJI.
 */
export const HABIT_ICON_PATHS = {
  droplet: 'M12 3.5c3.5 4.2 6 7.6 6 10.5a6 6 0 01-12 0c0-2.9 2.5-6.3 6-10.5z',
  glass: 'M6 4h12l-1.5 16h-9zM6.5 9h11',
  coffee: 'M5 8h11v6a5 5 0 01-5 5h-1a5 5 0 01-5-5zM16 10h1.5a2.5 2.5 0 010 5H16M8 3v2M11 3v2M14 3v2',
  apple: 'M12 7.5c-1.6-1-5-1.4-6.4 1.6S5 16 7 18.5s3.5 2 5 1.3c1.5.7 3 1.2 5-1.3s2.8-6.4 1.4-9.4S13.6 6.5 12 7.5zM12 7.5c0-2 1-3.5 3-4.5',
  leaf: 'M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8',
  sprout: 'M12 20v-8M12 12C12 8 9.5 6 5 6c0 4 2.5 6 7 6zM12 10c0-3 2-5 6.5-5 0 3.5-2 5.5-6.5 5z',
  walk: 'M8 4c1.7 0 2.5 1.8 2.5 4S9.8 12 8 12 5.5 10.2 5.5 8 6.3 4 8 4zM6 15h4v1.5a2 2 0 01-4 0zM16 8c1.7 0 2.5 1.8 2.5 4s-.7 4-2.5 4-2.5-1.8-2.5-4S14.3 8 16 8zM14 19h4v.5a2 2 0 01-4 0z',
  run: 'M15 6a1.75 1.75 0 100-3.5A1.75 1.75 0 0015 6zM5.5 10.5L9 8h4.5l2 3.5 3 1M11 8l-2.5 5.5 4 3V21M8.5 13.5L6 20',
  bike: 'M5.5 18.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM18.5 18.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5.5 15L9 8.5h6.5l3 6.5M9 8.5l3.5 6.5h-7M14 5.5h2.5l-1 3',
  dumbbell: 'M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11',
  lotus: 'M12 18.5c-4.5 0-7.5-2.2-9-5.5 3.3 0 6.5 1.3 9 5.5 2.5-4.2 5.7-5.5 9-5.5-1.5 3.3-4.5 5.5-9 5.5zM12 18.5c-2.2-2.8-2.8-6.6 0-11 2.8 4.4 2.2 8.2 0 11z',
  heart: 'M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0112 7.5 4.5 4.5 0 0119.5 10c0 5.5-7.5 10-7.5 10z',
  pill: 'M10.5 4.5a4.95 4.95 0 017 7l-6 6a4.95 4.95 0 01-7-7zM7.5 7.5l9 9',
  tooth:
    'M8 3.5c-2.5 0-4 1.8-4 4.3 0 2.2 1 3.4 1.5 5.2.6 2.3.8 7.5 2.8 7.5 1.6 0 1.4-4.5 3.7-4.5s2.1 4.5 3.7 4.5c2 0 2.2-5.2 2.8-7.5.5-1.8 1.5-3 1.5-5.2 0-2.5-1.5-4.3-4-4.3-1.7 0-2.6 1-4 1s-2.3-1-4-1z',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  bed: 'M3 19V6M3 15h18v4M21 15v-3.5a3 3 0 00-3-3h-7V15M7 12.5a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  book: 'M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z',
  music: 'M9 18V5.5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16.5a3 3 0 11-6 0 3 3 0 016 0z',
  palette:
    'M12 3a9 9 0 100 18c1.1 0 1.5-.8 1.5-1.6 0-1.1-.9-1.4-.9-2.4 0-.9.7-1.5 1.6-1.5H17a4 4 0 004-4C21 6.8 17 3 12 3zM7.5 12h.01M9.5 7.5h.01M14.5 7.5h.01',
  laptop: 'M5 5.5h14v10H5zM3 19h18',
  phone: 'M5 4h3l1.5 4-2 1.2a11 11 0 006.3 6.3l1.2-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  sparkles: 'M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8zM18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2-2.2-.8 2.2-.8z',
  wallet: 'M4 8h15a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0119 20H5.5A1.5 1.5 0 014 18.5zM4 8l11-3.5V8M16.5 14h.01',
  ban: 'M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9.5V13l2.5 2M10 2.5h4',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7a5 5 0 100 10 5 5 0 000-10zM12 11.2a.8.8 0 100 1.6.8.8 0 000-1.6z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z',
  check: 'M12 3a9 9 0 100 18 9 9 0 000-18zM8 12.5l2.7 2.7L16 9.5',
} as const;

export type HabitIconId = keyof typeof HABIT_ICON_PATHS;

export const HABIT_ICON_IDS = Object.keys(HABIT_ICON_PATHS) as HabitIconId[];

/** Emoji used before line icons, mapped to their closest line icon. */
export const LEGACY_EMOJI: Readonly<Record<string, HabitIconId>> = {
  '💧': 'droplet',
  '🚶': 'walk',
  '📖': 'book',
  '🏋️': 'dumbbell',
  '🏋': 'dumbbell',
  '🧘': 'lotus',
  '📞': 'phone',
  '🥗': 'leaf',
  '😴': 'moon',
  '✍️': 'pencil',
  '✍': 'pencil',
  '🎸': 'music',
  '🧹': 'sparkles',
  '💊': 'pill',
  '🌱': 'sprout',
  '🏃': 'run',
  '🚴': 'bike',
  '🧠': 'bulb',
  '🎨': 'palette',
  '💻': 'laptop',
  '🦷': 'tooth',
  '☀️': 'sun',
  '☀': 'sun',
  '🍎': 'apple',
  '🚭': 'ban',
  '💰': 'wallet',
  '❤️': 'heart',
  '❤': 'heart',
};

export const DEFAULT_HABIT_ICON: HabitIconId = 'check';

/** Maps a stored icon value (an id, or an emoji from older data) to a line icon. */
export function normalizeHabitIcon(icon: string): HabitIconId {
  if (Object.hasOwn(HABIT_ICON_PATHS, icon)) return icon as HabitIconId;
  return LEGACY_EMOJI[icon] ?? LEGACY_EMOJI[icon.replace(/\uFE0F/g, '')] ?? DEFAULT_HABIT_ICON;
}
