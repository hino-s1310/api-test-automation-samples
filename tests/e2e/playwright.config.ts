import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: 1,
  outputDir: './test-results',
  reporter: process.env.CI
    ? [
        ['github'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/results.xml' }],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list']
      ]
    : [['html'], ['json', { outputFile: 'test-results/results.json' }], ['junit', { outputFile: 'test-results/results.xml' }]],

  projects: [
    {
      name: 'api-tests',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:8000',
      },
    },
    {
      name: 'ui-tests',
      testMatch: /.*\.ui\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'integration-tests',
      testMatch: /.*\.integration\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        actionTimeout: process.env.CI ? 90000 : 30000,
        navigationTimeout: process.env.CI ? 180000 : 60000,
      },
    },
  ],

  webServer: [
    {
      name: 'api-server',
      command: 'cd ../../ && ENVIRONMENT=test uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000',
      url: 'http://localhost:8000/system/health',
      reuseExistingServer: false,
      timeout: process.env.CI ? 300 * 1000 : 120 * 1000,
      stdout: 'pipe',
      env: { ENVIRONMENT: 'test' },
    },
    {
      name: 'ui-server',
      command: 'cd ../../src/ui && node .next/standalone/server.js -p 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: process.env.CI ? 300 * 1000 : 120 * 1000,
      stdout: 'pipe',
      env: { NODE_ENV: 'production' },
    },
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on',
    actionTimeout: process.env.CI ? 60000 : 5000,
    navigationTimeout: process.env.CI ? 120000 : 10000,
  },

  timeout: process.env.CI ? 600000 : 30000,
  expect: {
    timeout: process.env.CI ? 90000 : 5000,
  },
});
