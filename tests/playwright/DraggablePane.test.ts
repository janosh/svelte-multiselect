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

// An iframe wins the hit test for anything over it, so a drag crossing one is where a page
// stops hearing about the pointer. Measured: Chromium keeps delivering to the pressed frame
// anyway, even for an out-of-process one, so this passes with setPointerCapture removed too.
// It pins the behaviour, not the mechanism — happy-dom hit-tests nothing and can't see it.
test(`a drag whose pointer crosses an iframe keeps following it`, async ({ page }) => {
  const { pane, handle } = await open_pane(page)
  const before = await box_of(pane)
  const grip = await center_of(handle)
  const target = { x: grip.x - 60, y: grip.y + 40 }

  // 127.0.0.1 is a different site than localhost, so this frame gets its own renderer
  // process — the case implicit capture does not cover. Clear of the grip, or the press
  // itself would land on the iframe and start nothing.
  const covers_target = await page.evaluate(({ x, y }) => {
    const frame = document.createElement(`iframe`)
    frame.src = `http://127.0.0.1:3005/`
    frame.style.cssText = `position: fixed; z-index: 9999; border: 0; width: 180px;
      height: 200px; left: ${x - 140}px; top: ${y - 20}px`
    document.body.append(frame)
    return document.elementFromPoint(x, y) === frame
  }, target)
  expect(covers_target).toBe(true)

  await page.mouse.move(grip.x, grip.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y)
  await page.mouse.up()

  const after = await box_of(pane)
  expect(Math.round(after.x - before.x)).toBe(-60)
  expect(Math.round(after.y - before.y)).toBe(40)
})

// The strips overlap in the corner and only paint order breaks the tie, so which axis a
// corner drag resizes is a browser fact — happy-dom paints nothing and cannot decide it.
// The grip drawn there is an affordance for "this pane resizes", not a two-axis handle.
test(`a corner drag resizes width only, the strip painted last`, async ({ page }) => {
  const { pane } = await open_pane(page)
  const before = await box_of(pane)
  const corner = { x: before.x + before.width - 3, y: before.y + before.height - 3 }

  await page.mouse.move(corner.x, corner.y)
  await page.mouse.down()
  await page.mouse.move(corner.x - 80, corner.y + 50)
  await page.mouse.up()

  const after = await box_of(pane)
  expect(Math.round(after.width - before.width)).toBe(-80)
  expect(after.height).toBeCloseTo(before.height, 0)
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

  // A pen would pan too and is fixed by the same touch-action, but CDP's injected pen
  // events skip the compositor gesture path, so only touch can show it here.
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
