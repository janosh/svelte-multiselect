import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe(`Nav dropdown`, () => {
  const hover_open = async (
    page: Page,
    dropdown: Locator,
    menu: Locator,
  ): Promise<void> => {
    const trigger = dropdown.locator(`:scope > div`).first()
    await expect(trigger).toBeVisible()
    await expect(async () => {
      await page.mouse.move(0, 0)
      await trigger.hover()
      await expect(menu).toHaveCSS(`display`, `flex`, { timeout: 500 })
    }).toPass({ timeout: 10_000 })
  }

  test(`opens on hover and closes on mouse leave`, async ({ page }) => {
    await page.goto(`/nav`, { waitUntil: `networkidle` })

    const dropdown = page.locator(`.dropdown`).first()
    const menu = dropdown.locator(`[data-submenu]`)

    await expect(menu).toHaveCSS(`display`, `none`)
    await hover_open(page, dropdown, menu)
    await expect(menu.locator(`a`).first()).toBeVisible()
    await page.mouse.move(0, 0)
    await expect(menu).toHaveCSS(`display`, `none`)
  })

  test(`click pins dropdown until outside, Escape, or toggle closes it`, async ({
    page,
  }) => {
    await page.goto(`/nav`, { waitUntil: `networkidle` })

    const dropdown = page.locator(`.dropdown`).first()
    const menu = dropdown.locator(`[data-submenu]`)
    const toggle = dropdown.locator(`[data-dropdown-toggle]`)

    await toggle.click()
    await expect(menu).toHaveCSS(`display`, `flex`)
    await page.mouse.move(0, 0)
    await expect(menu).toHaveCSS(`display`, `flex`)

    await page.locator(`body`).click({ position: { x: 10, y: 10 } })
    await expect(menu).toHaveCSS(`display`, `none`)

    await toggle.click()
    await page.keyboard.press(`Escape`)
    await expect(menu).toHaveCSS(`display`, `none`)

    await toggle.click()
    await toggle.click()
    await expect(menu).toHaveCSS(`display`, `none`)
  })
})
