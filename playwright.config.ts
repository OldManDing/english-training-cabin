import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: externalBaseUrl || 'http://127.0.0.1:3310',
    trace: 'retain-on-failure',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'cmd /c "set PORT=3310&& set SAAS_SESSION_SECRET=playwright-saas-secret&& set SAAS_DATA_FILE=test-results\\saas-e2e-store.json&& set DISABLE_RATE_LIMITS=true&& npm.cmd start"',
        url: 'http://127.0.0.1:3310/api/health',
        reuseExistingServer: false,
        timeout: 20_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile-smoke\.spec\.ts/,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile-smoke\.spec\.ts/,
    },
  ],
});
