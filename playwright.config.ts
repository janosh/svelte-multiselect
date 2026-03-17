import type { PlaywrightTestConfig } from '@playwright/test'

export default {
  webServer: {
    command: `vp dev --port 3005`,
    port: 3005,
    reuseExistingServer: true,
    timeout: 15_000,
  },
  workers: 16,
  testDir: `tests/playwright`,
} satisfies PlaywrightTestConfig
