/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  browser: `chromium`,
  webServer: {
    command: `yarn dev --port 3000`,
    port: 3000,
  },
}

export default config
