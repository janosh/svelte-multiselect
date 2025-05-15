import type { PlaywrightTestConfig } from '@playwright/test'

export default {
  webServer: {
    command: `npm run build && npm run preview -- --port 3005`,
    port: 3005,
    reuseExistingServer: true,
  },
  testDir: `tests`,
  testMatch: `tests/*.test.ts`,
} satisfies PlaywrightTestConfig
