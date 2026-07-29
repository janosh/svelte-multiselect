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

  // force: the host is what hit-testing reports at these coordinates, so Playwright refuses
  // the click as intercepted — the browser still targets the input and retargets to the host
  await menu.getByRole(`combobox`).click({ force: true })
  await expect(menu).toBeVisible()

  // dispatched, not clicked: the modal backdrop covers the heading, so a real click there
  // closes through backdrop_dismiss and would pass with close_if_outside gone
  await page.locator(`h2`).dispatchEvent(`click`)
  await expect(menu).toBeHidden()
})
