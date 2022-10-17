import type { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  webServer: {
    command: `pnpm dev --port 3005`,
    port: 3005,
  },
}

export default config
