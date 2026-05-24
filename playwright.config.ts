import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'cmd /c "set PORT=3100&& npm.cmd start"',
    url: 'http://127.0.0.1:3100/api/health',
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
