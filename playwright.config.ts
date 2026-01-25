import type { PlaywrightTestConfig } from '@playwright/test'

export default {
  webServer: {
    command: `vite dev --port 3005`,
    port: 3005,
    reuseExistingServer: true,
  },
  workers: 16,
  testDir: `tests/playwright`,
} satisfies PlaywrightTestConfig
