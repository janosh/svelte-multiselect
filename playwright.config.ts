import type { PlaywrightTestConfig } from '@playwright/test'

export default {
  webServer: {
    command: `vite dev --port 3005`,
    port: 3005,
    reuseExistingServer: true,
  },
  testDir: `tests/playwright`,
  timeout: 15000, // 15s for CI environments
  expect: {
    timeout: 5000, // 5s for assertions
  },
} satisfies PlaywrightTestConfig
