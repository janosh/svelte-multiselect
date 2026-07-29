import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Pointer events matter for touch: a touch drag never produces mousemove. happy-dom cannot
// show that, so this lives in a real browser.

type Point = { x: number; y: number }

const box_of = async (locator: Locator) => {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`no box for ${locator}`)
  return box
}

const center_of = async (locator: Locator): Promise<Point> => {
  const { x, y, width, height } = await box_of(locator)
  return { x: x + width / 2, y: y + height / 2 }
}

const open_pane = async (page: Page) => {
  await page.goto(`/draggable-pane`, { waitUntil: `networkidle` })
  await page.locator(`button.pane-toggle`).first().click()
  const pane = page.locator(`div.draggable-pane`).first()
  await expect(pane).toBeVisible()
  await pane.scrollIntoViewIfNeeded() // coords outside the viewport hit nothing
  return { pane, handle: pane.locator(`span.drag-handle`) }
}

test(`a mouse drag moves the pane`, async ({ page }) => {
  const { pane, handle } = await open_pane(page)
  const before = await box_of(pane)
  const grip = await center_of(handle)

  await page.mouse.move(grip.x, grip.y)
  await page.mouse.down()
  await page.mouse.move(grip.x - 60, grip.y + 40)
  await page.mouse.up()

  const after = await box_of(pane)
  expect(Math.round(after.x - before.x)).toBe(-60)
  expect(Math.round(after.y - before.y)).toBe(40)
})

test.describe(`touch`, () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 900, height: 800 } })

  // Playwright's touchscreen only taps; drag goes through CDP
  const touch_drag = async (page: Page, from: Point, to: Point) => {
    const cdp = await page.context().newCDPSession(page)
    for (const [type, point] of [
      [`touchStart`, from],
      [`touchMove`, to],
      [`touchEnd`, null],
    ] as const) {
      await cdp.send(`Input.dispatchTouchEvent`, {
        type,
        touchPoints: point ? [point] : [],
      })
    }
  }

  test(`a touch drag moves the pane`, async ({ page }) => {
    const { pane, handle } = await open_pane(page)
    const before = await box_of(pane)
    const grip = await center_of(handle)

    await touch_drag(page, grip, { x: grip.x - 50, y: grip.y + 30 })

    const after = await box_of(pane)
    expect(Math.round(after.x - before.x)).toBe(-50)
    expect(Math.round(after.y - before.y)).toBe(30)
  })

  // Edge strip cannot take touch-action:none without killing content scroll; cancel instead.
  test(`a touch drag on the bottom edge resizes the pane`, async ({ page }) => {
    const { pane } = await open_pane(page)
    const before = await box_of(pane)
    const scroll_before = await page.evaluate(() => globalThis.scrollY)
    const edge = { x: before.x + before.width / 2, y: before.y + before.height - 3 }

    await touch_drag(page, edge, { x: edge.x, y: edge.y + 60 })

    const after = await box_of(pane)
    expect(Math.round(after.height - before.height)).toBe(60)
    expect(after.width).toBeCloseTo(before.width, 0)
    expect(await page.evaluate(() => globalThis.scrollY)).toBe(scroll_before)
  })
})
