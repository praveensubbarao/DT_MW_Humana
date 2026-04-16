import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

function envURL(stack: string | undefined) {
  switch (stack) {
    case 'dev':
      return ''; // TODO: add dev URL when available
    case 'stg':
      return ''; // TODO: add stg URL when available
    case 'prod':
    default:
      return 'https://provider.humana.com';
  }
}

export default defineConfig({
  testDir: 'src/tests',
  timeout: 360_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.WORKER_COUNT ? Number(process.env.WORKER_COUNT) : 2,
  use: {
    baseURL: envURL(process.env.STACK),
    headless: false,
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
    screenshot: 'on',
    trace: 'retain-on-failure-and-retries',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-results/junit-report.xml' }],
    ['./src/utils/selfHeal/selfHealReporter.ts'],
  ],
});
