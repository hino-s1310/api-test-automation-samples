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
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']  // コンソール出力も追加
  ] : [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  /* Configure projects for different test types */
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
        // CI環境でのタイムアウトを延長
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },
  ],

  // CI環境ではwebServerを使用しない（手動で起動するため）
  webServer: process.env.CI ? [] : [
    {
      name: 'api-server',
      command: 'cd ../../ && ENVIRONMENT=test uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000',
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
      timeout: 120 * 1000,
      stdout: 'pipe',
      env: {
        ENVIRONMENT: 'test'
      }
    },
    {
      name: 'ui-server',
      command: 'cd ../../src/ui && pnpm install && pnpm dev',
      url: 'http://localhost:3000',
      stdout: 'pipe',
      reuseExistingServer: true,
      timeout: 180 * 1000,
      env: {
        NODE_ENV: 'development'
      }
    }
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* CI環境ではタイムアウトを延長して安定性を向上 */
    actionTimeout: process.env.CI ? 30000 : 5000,
    navigationTimeout: process.env.CI ? 60000 : 10000,
  },

  /* CI環境ではグローバルタイムアウトを延長して安定性を向上 */
  timeout: process.env.CI ? 120000 : 30000,

  /* CI環境では期待値のタイムアウトも延長して安定性を向上 */
  expect: {
    timeout: process.env.CI ? 30000 : 5000,
  },
});