import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const BACKEND_PORT = process.env.PORT || '5008';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'backend',
      testDir: './tests/backend',
      use: {
        baseURL: BACKEND_URL
      }
    },
    {
      name: 'frontend',
      testDir: './tests/frontend',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: FRONTEND_URL
      }
    }
  ],
  webServer: [
    {
      command: 'NODE_ENV=test npm start',
      url: `${BACKEND_URL}/api/v1/health`,
      reuseExistingServer: true,
      timeout: 15000
    },
    {
      command: 'npm run dev --prefix frontend',
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 15000
    }
  ]
});
