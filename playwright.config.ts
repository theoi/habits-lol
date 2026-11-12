import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/habits-lol/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `pnpm exec vite build --outDir .e2e-dist --emptyOutDir && pnpm exec vite preview --outDir .e2e-dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/habits-lol/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_DEMO: '0' },
  },
});
