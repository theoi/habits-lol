import { useEffect } from 'react';
import { ListIcon, SettingsIcon, TodayIcon } from './components/icons';
import { useReminders } from './reminders/useReminders';
import { HabitDetail } from './screens/HabitDetail';
import { HabitEditor } from './screens/HabitEditor';
import { HabitsScreen } from './screens/HabitsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';
import { useData } from './ui/data';
import { href, useRoute, type Route } from './ui/router';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayScreen />;
    case 'habits':
      return <HabitsScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'new':
      return <HabitEditor />;
    case 'edit':
      return <HabitEditor id={route.id} />;
    case 'detail':
      return <HabitDetail id={route.id} />;
  }
}

const TABS = [
  { name: 'today', label: 'Today', href: href.today, Icon: TodayIcon },
  { name: 'habits', label: 'Habits', href: href.habits, Icon: ListIcon },
  { name: 'settings', label: 'Settings', href: href.settings, Icon: SettingsIcon },
] as const;

export function App() {
  const route = useRoute();
  const { settings } = useData();
  useReminders();
  const key = route.name === 'detail' || route.name === 'edit' ? `${route.name}/${route.id}` : route.name;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const section = route.name === 'settings' ? 'settings' : route.name === 'habits' ? 'habits' : 'today';
  const focused = route.name === 'new' || route.name === 'edit';

  return (
    <div className={`app${focused ? ' is-focused' : ''}${settings.compact ? ' is-compact' : ''}`}>
      <nav className="nav" aria-label="Main">
        <a className="brand" href={href.today}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>Habits</span>
        </a>
        <ul className="tabs">
          {TABS.map(({ name, label, href: to, Icon }) => (
            <li key={name}>
              <a className={`tab${section === name ? ' is-active' : ''}`} href={to} aria-current={section === name ? 'page' : undefined}>
                <Icon size={22} />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="nav-foot muted small">Private by design. Your data never leaves this device.</p>
      </nav>
      <main className="main">
        <Screen key={key} route={route} />
      </main>
    </div>
  );
}
