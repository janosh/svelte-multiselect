// E2e tests for the tooltip attachment's shrink-to-fit width fitting
// (resize_and_position_tooltip in src/lib/attachments.ts). The binary-search
// sizing needs real browser text layout, which happy-dom can't provide.
import { expect, test, type Locator, type Page } from '@playwright/test'

type TooltipMetrics = {
  content_width: number
  max_width: number
  line_count: number
  left: number
  top: number
  right: number
  bottom: number
  viewport_width: number
  viewport_height: number
}

// Measure final tooltip geometry. The tooltip div is content-box sized, so
// max-width constrains the content box: subtract padding+border from the rect
// the same way resize_and_position_tooltip's box_adjust does.
const measure_tooltip = (tooltip_el: Locator): Promise<TooltipMetrics> =>
  tooltip_el.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    // computed lengths are `<number>px` strings — strip the unit for Number()
    const css_px = (css_length: string) => Number(css_length.replace(/px$/, ``))
    const box_adjust =
      style.boxSizing === `border-box`
        ? 0
        : css_px(style.paddingLeft) +
          css_px(style.paddingRight) +
          css_px(style.borderLeftWidth) +
          css_px(style.borderRightWidth)
    const content_el = el.querySelector(`.tooltip-content`)
    return {
      content_width: rect.width - box_adjust,
      max_width: css_px(style.maxWidth),
      // the content span is inline, so it produces one client rect per rendered line
      line_count: content_el ? content_el.getClientRects().length : 0,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      viewport_width: globalThis.innerWidth,
      viewport_height: globalThis.innerHeight,
    }
  })

// Width the given text renders at in the tooltip's own font, for
// platform-independent shrink-to-fit assertions
const measure_text_width = (tooltip_el: Locator, text: string): Promise<number> =>
  tooltip_el.evaluate((el, text_content) => {
    const style = getComputedStyle(el)
    const probe = document.createElement(`span`)
    probe.style.cssText = `position: absolute; visibility: hidden; white-space: nowrap`
    for (const prop of [`font-family`, `font-size`, `font-weight`, `letter-spacing`]) {
      probe.style.setProperty(prop, style.getPropertyValue(prop))
    }
    probe.textContent = text_content
    document.body.append(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  }, text)

// Hover a button until its tooltip shows (pre-hydration mouseenter is a no-op)
// and wait for the rAF sizing/positioning pass to finish (it ends by fading
// opacity to 1, so geometry is final once fully opaque)
const hover_tooltip = async (
  page: Page,
  button_name: string,
  content_snippet: string,
): Promise<Locator> => {
  const tooltip_el = page.locator(`.custom-tooltip`)
  await expect(async () => {
    await page.mouse.move(0, 0) // move off the button so mouseenter re-fires
    await page.getByRole(`button`, { name: button_name, exact: true }).hover()
    await expect(tooltip_el).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  await expect(tooltip_el).toContainText(content_snippet)
  await expect(tooltip_el).toHaveCSS(`opacity`, `1`)
  return tooltip_el
}

const expect_within_viewport = (metrics: TooltipMetrics) => {
  expect(metrics.left).toBeGreaterThanOrEqual(0)
  expect(metrics.top).toBeGreaterThanOrEqual(0)
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewport_width)
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewport_height)
}

test.describe(`tooltip shrink-to-fit sizing`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/attachments`, { waitUntil: `networkidle` })
  })

  test(`short single-word tooltip renders one snug line below its max-width`, async ({
    page,
  }) => {
    const content = `antidisestablishmentarianism`
    const tooltip_el = await hover_tooltip(page, `Single long word`, content)
    const metrics = await measure_tooltip(tooltip_el)
    const text_width = await measure_text_width(tooltip_el, content)

    expect(metrics.max_width).toBe(280)
    expect(metrics.line_count).toBe(1)
    expect(metrics.content_width).toBeLessThan(metrics.max_width)
    // snug: width matches the rendered text, not the max-width cap
    expect(Math.abs(metrics.content_width - text_width)).toBeLessThanOrEqual(3)
    expect_within_viewport(metrics)
  })

  test(`unbreakable long word shrinks the wrapped tooltip to the word's width`, async ({
    page,
  }) => {
    const long_word = `Donaudampfschifffahrtsgesellschaftskapitän`
    const tooltip_el = await hover_tooltip(page, `Long German word`, long_word)
    const metrics = await measure_tooltip(tooltip_el)
    const word_width = await measure_text_width(tooltip_el, long_word)

    expect(metrics.max_width).toBe(280)
    expect(metrics.line_count).toBeGreaterThanOrEqual(2)
    // the binary search shrinks the box down to its widest line: the long word
    expect(metrics.content_width).toBeGreaterThanOrEqual(word_width - 3)
    expect(metrics.content_width).toBeLessThanOrEqual(word_width + 20)
    expect_within_viewport(metrics)
  })

  for (const { button_name, snippet, expected_max_width, min_lines } of [
    {
      button_name: `Balanced wrapping`,
      snippet: `balanced text wrapping`,
      expected_max_width: 200,
      min_lines: 2,
    },
    {
      button_name: `Long text shrink-to-fit`,
      snippet: `Lorem ipsum`,
      expected_max_width: 220,
      min_lines: 5,
    },
  ]) {
    test(`${button_name} tooltip wraps to ≥${min_lines} lines within its ${expected_max_width}px max-width`, async ({
      page,
    }) => {
      const tooltip_el = await hover_tooltip(page, button_name, snippet)
      const metrics = await measure_tooltip(tooltip_el)

      expect(metrics.max_width).toBe(expected_max_width)
      expect(metrics.line_count).toBeGreaterThanOrEqual(min_lines)
      expect(metrics.content_width).toBeLessThanOrEqual(expected_max_width + 3)
      expect_within_viewport(metrics)
    })
  }
})
