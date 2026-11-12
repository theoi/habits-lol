import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { db } from './db/db';
import { seedSampleData } from './db/seed';
import { DataProvider } from './ui/data';
import { ToastProvider } from './ui/toast';
import './styles.css';

registerSW({ immediate: true });
void navigator.storage?.persist?.();

async function maybeSeedDemo() {
  if (import.meta.env.VITE_DEMO !== '1') return;
  const seeded = await db.meta.get('demoSeeded');
  if (seeded || (await db.habits.count()) > 0) return;
  await seedSampleData(new Date());
  await db.meta.put({ key: 'demoSeeded', value: true });
}

void maybeSeedDemo().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DataProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </DataProvider>
    </StrictMode>,
  );
});
