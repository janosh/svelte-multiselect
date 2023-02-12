import type { Page } from '@playwright/test'

export function wait_for_animation_end(page: Page, selector: string) {
  // https://github.com/microsoft/playwright/issues/15660
  const locator = page.locator(selector)
  return locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished))
  )
}
