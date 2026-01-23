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

  test(`click pins dropdown: stays open on mouse leave, closes on click outside/Escape/toggle`, async ({ page }) => {
    await page.goto(`/nav`, { waitUntil: `networkidle` })

    const dropdown = page.locator(`.dropdown`).first()
    const menu = dropdown.locator(`div[role="menu"]`)
    const toggle = dropdown.locator(`[data-dropdown-toggle]`)

    // Click pins open, mouse leave doesn't close
    await toggle.click()
    await expect(menu).toHaveCSS(`display`, `flex`)
    await page.mouse.move(0, 0)
    await expect(menu).toHaveCSS(`display`, `flex`)

    // Click outside closes
    await page.locator(`body`).click({ position: { x: 10, y: 10 } })
    await expect(menu).toHaveCSS(`display`, `none`)

    // Escape closes
    await toggle.click()
    await page.keyboard.press(`Escape`)
    await expect(menu).toHaveCSS(`display`, `none`)

    // Toggle click closes
    await toggle.click()
    await toggle.click()
    await expect(menu).toHaveCSS(`display`, `none`)
  })
})
