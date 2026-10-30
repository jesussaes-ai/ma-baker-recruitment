import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

const CCR_CHROMIUM = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    headless: true,
    launchOptions: {
      executablePath: existsSync(CCR_CHROMIUM) ? CCR_CHROMIUM : undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        ...(process.env.HTTPS_PROXY ? [
          `--proxy-server=${process.env.HTTPS_PROXY}`,
          '--proxy-bypass-list=localhost,127.0.0.1,::1',
          '--ignore-certificate-errors',
        ] : []),
      ],
    },
    ...(process.env.HTTPS_PROXY ? {
      proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' },
      ignoreHTTPSErrors: true,
    } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npx next dev --port 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
