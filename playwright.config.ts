/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  webServer: {
    command: `yarn serve`,
    port: 3000,
  },
}

export default config
