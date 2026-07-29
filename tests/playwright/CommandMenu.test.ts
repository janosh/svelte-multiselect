import { expect, test } from '@playwright/test'

// close_if_outside reads composedPath() rather than event.target, which only matters once
// the menu sits in a shadow root: by the time the click reaches window its target is the
// host element, so containment against the dialog fails. happy-dom retargets nothing, so
// this contract is only observable in a real browser.
test(`a click inside the menu keeps it open from within a shadow root`, async ({
  page,
}) => {
  await page.goto(`/shadow-dom`, { waitUntil: `networkidle` })
  const menu = page.locator(`#shadow-host dialog`)
  await expect(menu).toBeVisible()

  // dispatched rather than clicked: the host is what hit-testing reports at those
  // coordinates, so a real click could never reach the input inside the shadow root
  const retargets = await page.evaluate(() => {
    const host = document.querySelector(`#shadow-host`)
    const input = host?.shadowRoot?.querySelector(`input[role="combobox"]`)
    if (!(host instanceof HTMLElement) || !input)
      throw new Error(`no menu in a shadow root`)
    return new Promise((resolve) => {
      globalThis.addEventListener(`click`, (event) => resolve(event.target === host), {
        once: true,
      })
      input.dispatchEvent(new MouseEvent(`click`, { bubbles: true, composed: true }))
    })
  })
  expect(retargets).toBe(true) // else the test proves nothing about composedPath
  await expect(menu).toBeVisible()

  await page.locator(`h2`).click({ force: true }) // the modal backdrop covers the heading
  await expect(menu).toBeHidden()
})
