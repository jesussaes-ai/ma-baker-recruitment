import { defineConfig, devices } from '@playwright/test';

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
      executablePath: '/opt/pw-browsers/chromium',
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
