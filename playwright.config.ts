import type { PlaywrightTestConfig } from '@playwright/test'

export default {
  webServer: {
    command: `vite dev --port 3005`,
    port: 3005,
    reuseExistingServer: true,
  },
  testDir: `tests/playwright`,
  timeout: 5000,
} satisfies PlaywrightTestConfig
