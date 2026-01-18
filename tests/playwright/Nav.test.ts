import { expect, test } from '@playwright/test'

test.describe(`Nav dropdown`, () => {
  test(`opens on hover and closes on mouse leave`, async ({ page }) => {
    await page.goto(`/nav`, { waitUntil: `networkidle` })

    const dropdown = page.locator(`.dropdown`).first()
    const menu = dropdown.locator(`div[role="menu"]`)

    await expect(menu).toHaveCSS(`display`, `none`)
    await dropdown.hover()
    await expect(menu).toHaveCSS(`display`, `flex`)
    await page.mouse.move(0, 0)
    await expect(menu).toHaveCSS(`display`, `none`)
  })

  test(`child links visible when open`, async ({ page }) => {
    await page.goto(`/nav`, { waitUntil: `networkidle` })

    const dropdown = page.locator(`.dropdown`).first()
    await dropdown.hover()
    await expect(dropdown.locator(`div[role="menu"] a`).first()).toBeVisible()
  })
})
