import type { PlaywrightTestConfig } from '@playwright/test'

// `process` types aren't in this config file's tsconfig scope, so read the CI flag
// off globalThis. On CI, serve a production build via preview instead of the dev
// server: the heavy mdsvex + live-examples pages compile on-demand under `vp dev`, and
// a cold first hit on a slow CI worker can leave a page un-hydrated long enough to fail
// focus/hover tests. A prebuilt preview has no on-demand compile, so hydration is fast
// and reliable. Locally we keep `vp dev` for HMR-fast iteration.
const on_ci = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.CI,
)

export default {
  webServer: {
    command: on_ci ? `vp build && vp preview --port 3005` : `vp dev --port 3005`,
    port: 3005,
    reuseExistingServer: true,
    timeout: on_ci ? 180_000 : 15_000,
  },
  workers: 16,
  testDir: `tests/playwright`,
} satisfies PlaywrightTestConfig
