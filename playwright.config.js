import { defineConfig, devices } from '@playwright/test';

const configuredPort = Number.parseInt(process.env.PLAYWRIGHT_PORT || '4173', 10);
const e2ePort = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
  ? configuredPort
  : 4173;
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: e2eBaseUrl,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      CI: '1',
      VITE_PORT: String(e2ePort),
      VITE_API_URL: process.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
      VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID || 'rifkando-e2e.apps.googleusercontent.com',
    },
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
