import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* CI環境では並列実行を無効化してテストの安定性を向上 */
  fullyParallel: process.env.CI ? false : true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* CI環境ではリトライ回数を増やして安定性を向上 */
  retries: process.env.CI ? 3 : 0,
  /* CI環境ではワーカー数を1に制限して競合状態を回避 */
  workers: process.env.CI ? 1 : undefined,
  /* Output directory for test results */
  outputDir: './test-results',
  /* Reporter configuration optimized for CI */
  reporter: process.env.CI ? [
    ['github'],  // GitHub Actions integration
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ] : [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* CI環境ではタイムアウトを延長して安定性を向上 */
    actionTimeout: process.env.CI ? 15000 : 5000,
    navigationTimeout: process.env.CI ? 45000 : 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: process.env.CI 
      ? 'cd ../../ && ENVIRONMENT=test uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000'
      : 'cd ../../ && ENVIRONMENT=test uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000',
    url: 'http://localhost:8000/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ENVIRONMENT: 'test'
    }
  },

  /* CI環境ではグローバルタイムアウトを延長して安定性を向上 */
  timeout: process.env.CI ? 60000 : 30000,

  /* CI環境では期待値のタイムアウトも延長して安定性を向上 */
  expect: {
    timeout: process.env.CI ? 15000 : 5000,
  },
});
