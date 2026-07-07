// deno-lint-ignore-file no-await-in-loop
import { foods, languages, octicons } from '$site/options'
import { expect, test, type Locator, type Page } from '@playwright/test'

// Open the /portal demo modal and return its content locator
async function open_portal_modal(page: Page): Promise<Locator> {
  await page.goto(`/portal`, { waitUntil: `networkidle` })
  await page.getByRole(`button`, { name: `Open Modal` }).click()
  return page.locator(`div.modal-content.modal`)
}

// Locate the visible portalled dropdown containing an option with the given label
const portalled_options = (page: Page, label: string): Locator =>
  page.locator(`body > ul.options:not(.hidden):has(li:has-text("${label}"))`)

async function goto_persistent(page: Page): Promise<void> {
  await page.goto(`/persistent`)
  await expect(page.locator(`#languages input[autocomplete]`)).toBeVisible()
  const store_binding_input = page.locator(
    `#store-binding input[placeholder='Select colors...']`,
  )
  await expect(store_binding_input).toBeVisible()
  await page.waitForFunction(() => {
    const input_el = document.querySelector<HTMLInputElement>(
      `#store-binding input[placeholder='Select colors...']`,
    )
    return input_el && !String(input_el.focus).includes(`[native code]`)
  })
}

// Issue #309: Array cloning by reactive wrappers (stores, Superforms) caused infinite loops
// https://github.com/janosh/svelte-multiselect/issues/309
test(`array cloning infinite loop prevention (issue #309)`, async ({ page }) => {
  await goto_persistent(page)

  const input = page.locator(`#store-binding input[placeholder='Select colors...']`)
  await input.focus()
  await input.press(`ArrowDown`)
  await input.press(`Enter`)

  const status = page.locator(`#store-binding-status`)
  await expect(status.locator(`text=✅ Fixed`)).toBeVisible()
  await expect(status.locator(`text=⚠️ Regression`)).not.toBeVisible()

  const count_text = await status.textContent()
  const count = parseInt(count_text?.match(/\d+/u)?.[0] ?? `0`, 10)
  expect(count).toBeLessThan(10)
})

test.describe(`input`, () => {
  // https://github.com/janosh/svelte-multiselect/issues/289
  test(`programmatic focus opens dropdown`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    const dropdown = page.locator(`#foods div.multiselect > ul.options`)

    await expect(dropdown).toHaveClass(/hidden/u)
    await expect(dropdown).toBeHidden()

    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(`#foods input[autocomplete]`)
      input?.focus()
    })
    await expect(dropdown).not.toHaveClass(/hidden/u)
    await expect(dropdown).toBeVisible()

    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(`#foods input[autocomplete]`)
      input?.blur()
    })
    await expect(dropdown).toHaveClass(/hidden/u)
    await expect(dropdown).toBeHidden()
  })

  // https://github.com/janosh/svelte-multiselect/issues/423
  test(`retain-focus keeps input focused after mouse selection`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    const input = page.locator(`#retain-focus input[autocomplete]`)
    const dropdown = page.locator(`#retain-focus ul.options`)

    await input.click()
    await expect(input).toBeFocused()
    await expect(dropdown).toBeVisible()

    await dropdown.getByRole(`option`, { name: `Svelte`, exact: true }).click()

    await expect(dropdown).toBeHidden()
    await expect(input).toBeFocused()

    await page.keyboard.type(`r`)

    await expect(dropdown).toBeVisible()
    await expect(
      dropdown.getByRole(`option`, { name: `React`, exact: true }),
    ).toBeVisible()
  })
})

test.describe(`multiselect`, () => {
  // https://github.com/janosh/svelte-multiselect/issues/111
  test(`loops through dropdown list with arrow keys making each option active in turn`, async ({
    page,
  }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    const input = page.locator(`#foods input[autocomplete]`)
    await input.click()
    await expect(input).toBeFocused()
    await expect(page.locator(`#foods ul.options`)).toBeVisible()

    const active_option = page.locator(`#foods ul.options > li.active`)
    for (const expected_fruit of foods) {
      await input.press(`ArrowDown`)
      await expect(active_option).toHaveCount(1)
      await expect(active_option).toHaveText(expected_fruit)
    }

    await input.press(`ArrowDown`)
    await expect(active_option).toHaveText(foods[0])

    await input.press(`ArrowUp`)
    await expect(active_option).toHaveText(foods.at(-1) ?? ``)
  })

  // https://github.com/janosh/svelte-multiselect/issues/357
  test(`keyboard nav ignores scroll-triggered mouseover but re-enables on mouse movement`, async ({
    page,
  }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)

    for (let idx = 0; idx < 3; idx++) await page.keyboard.press(`ArrowDown`)
    const active_option = page.locator(`#foods ul.options > li.active`)
    await expect(active_option).toHaveText(foods[2])

    await page.evaluate(() => {
      const first_option = document.querySelector(`#foods ul.options > li`)
      first_option?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
    })

    const active_after_synthetic_hover = await active_option.textContent()
    expect(active_after_synthetic_hover?.trim()).toBe(foods[2])

    await page.evaluate(() => {
      const options = document.querySelector(`#foods ul.options`)
      const fifth_option = document.querySelectorAll(`#foods ul.options > li`)[4]
      options?.dispatchEvent(new MouseEvent(`mousemove`, { bubbles: true }))
      fifth_option?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
    })

    await expect(active_option).toHaveText(foods[4])
  })

  test(`retains its selected state on page reload when bound to localStorage`, async ({
    page,
  }) => {
    await goto_persistent(page)
    await page.evaluate(() => sessionStorage.clear())
    await page.reload()
    await expect(page.locator(`#languages input[autocomplete]`)).toBeVisible()

    const selected = page.locator(`#languages ul.selected`)
    await expect(selected).toContainText(`Python`)

    await page.click(`#languages input[autocomplete]`)
    await expect(page.locator(`#languages ul.options`)).toBeVisible()
    await page.locator(`#languages ul.options li:has-text("Ruby")`).first().click()

    await page.reload()

    await expect(selected).toContainText(`Ruby`)
    await expect(selected).toContainText(`Python`)
  })
})

// https://github.com/janosh/svelte-multiselect/issues/176
test(`browser drag reorders selected options`, async ({ page }) => {
  await goto_persistent(page)
  const selected = page.locator(`#languages ul.selected`)
  await expect(selected).toHaveText(`1  Python 2  TypeScript 3  C 4  Haskell`)

  const first_selected_option = page.locator(`#languages ul.selected li:nth-child(1)`)
  const second_selected_option = page.locator(`#languages ul.selected li:nth-child(2)`)
  await first_selected_option.dragTo(second_selected_option)

  await expect(selected).toHaveText(`1  TypeScript 2  Python 3  C 4  Haskell`)
})

test.describe(`portal feature`, () => {
  test(`dropdown renders within component when portal is inactive`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)

    await expect(
      page.locator(`#foods > div.multiselect > ul.options:not(.hidden)`),
    ).toBeVisible()
    await expect(page.locator(`body > ul.options:not(.hidden)`)).toHaveCount(0)
  })

  test(`mobile touch selection works with portal enabled`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const modal_content = await open_portal_modal(page)
    const languages_input = modal_content.locator(
      `div.multiselect input[placeholder='Choose languages...']`,
    )

    await languages_input.click()

    const portalled_languages_options = portalled_options(page, languages[0])
    await expect(portalled_languages_options).toBeVisible()

    const dropdown_stays_open = await page.evaluate(() => {
      const outer_div = document.querySelector(`div.multiselect`)
      const portalled_option = document.querySelector(
        `body > ul.options li[role="option"]`,
      )
      const dropdown = document.querySelector(`body > ul.options`)

      if (!outer_div || !portalled_option || !dropdown) return false

      const click_event = new MouseEvent(`click`, { bubbles: true })
      Object.defineProperty(click_event, `target`, { value: portalled_option })
      globalThis.dispatchEvent(click_event)

      return !dropdown.classList.contains(`hidden`)
    })

    expect(dropdown_stays_open).toBe(true)

    await portalled_languages_options
      .getByRole(`option`, { name: languages[0], exact: true })
      .click()
    await expect(
      modal_content.getByRole(`button`, { name: `Remove ${languages[0]}` }),
    ).toBeVisible()
  })

  test(`dropdowns in modal render in body when portal is active`, async ({ page }) => {
    const modal_content = await open_portal_modal(page)
    const languages_input = modal_content.locator(
      `div.multiselect input[placeholder='Choose languages...']`,
    )
    await languages_input.click()

    const portalled_languages_options = portalled_options(page, languages[0])
    await expect(portalled_languages_options).toBeVisible()
    await expect(
      modal_content
        .locator(`div.multiselect:has(input[placeholder='Choose languages...'])`)
        .locator(`> ul.options`),
    ).not.toBeAttached()

    await portalled_languages_options
      .getByRole(`option`, { name: languages[0], exact: true })
      .click()
    await expect(portalled_languages_options).toBeVisible()
    await expect(
      modal_content.getByRole(`button`, { name: `Remove ${languages[0]}` }),
    ).toBeVisible()

    await page.keyboard.press(`Escape`)
    await expect(portalled_languages_options).toBeHidden()

    const octicons_input = modal_content.locator(
      `div.multiselect input[placeholder='Choose octicons...']`,
    )
    await octicons_input.click()

    const portalled_octicons_options = portalled_options(page, octicons[0])
    await expect(portalled_octicons_options).toBeVisible()
    await expect(
      modal_content
        .locator(`div.multiselect:has(input[placeholder='Choose octicons...'])`)
        .locator(`> ul.options`),
    ).not.toBeAttached()

    await portalled_octicons_options
      .getByRole(`option`, { name: octicons[0], exact: true })
      .click()
    await expect(portalled_octicons_options).toBeHidden()
    await expect(
      modal_content.getByRole(`button`, { name: `Remove ${octicons[0]}` }),
    ).toBeVisible()

    await page.keyboard.press(`Escape`)
    await page.getByRole(`button`, { name: `Close Modal` }).click()
    await expect(modal_content).toBeHidden()
  })

  test(`portalled dropdown tracks trigger after nested scroll and resize`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 700 })
    const modal_content = await open_portal_modal(page)
    const languages_input_selector = `div.multiselect input[placeholder='Choose languages...']`
    const languages_input = modal_content.locator(languages_input_selector)

    await page.evaluate(() => {
      const modal = document.querySelector<HTMLElement>(`div.modal-content.modal`)
      const first_multiselect = modal?.querySelector(`div.multiselect`)
      if (!modal || !first_multiselect) throw new Error(`portal modal setup missing`)

      modal.style.maxHeight = `220px`
      modal.style.overflowY = `auto`
      const spacer = document.createElement(`div`)
      spacer.style.height = `120px`
      spacer.textContent = `scroll spacer`
      first_multiselect.before(spacer)
    })

    await languages_input.click()
    const portalled_languages_options = portalled_options(page, languages[0])
    await expect(portalled_languages_options).toBeVisible()

    const assert_aligned = async () => {
      const metrics_handle = await page.waitForFunction((input_selector) => {
        const input = document.querySelector<HTMLInputElement>(
          `div.modal-content.modal ${input_selector}`,
        )
        const wrapper = input?.closest<HTMLElement>(`div.multiselect`)
        const dropdown = document.querySelector<HTMLElement>(
          `body > ul.options:not(.hidden)`,
        )
        if (!wrapper || !dropdown) return false

        const wrapper_rect = wrapper.getBoundingClientRect()
        const dropdown_rect = dropdown.getBoundingClientRect()
        const left_delta = Math.abs(dropdown_rect.left - wrapper_rect.left)
        const top_delta = Math.abs(dropdown_rect.top - wrapper_rect.bottom)
        const width_delta = Math.abs(dropdown_rect.width - wrapper_rect.width)
        const aligned =
          left_delta <= 2 &&
          top_delta <= 10 &&
          width_delta <= 2 &&
          dropdown_rect.top >= 0 &&
          dropdown_rect.right <= globalThis.innerWidth + 1
        return aligned ? [left_delta, top_delta, width_delta] : false
      }, languages_input_selector)
      const metrics = await metrics_handle.jsonValue()
      if (metrics === false) throw new Error(`portal dropdown alignment timed out`)
      const [left_delta, top_delta, width_delta] = metrics

      expect(left_delta).toBeLessThanOrEqual(2)
      expect(top_delta).toBeLessThanOrEqual(10)
      expect(width_delta).toBeLessThanOrEqual(2)
    }

    await assert_aligned()

    await page.evaluate(() => {
      const modal = document.querySelector<HTMLElement>(`div.modal-content.modal`)
      if (!modal) throw new Error(`portal modal missing`)
      modal.scrollTop = 80
      modal.dispatchEvent(new Event(`scroll`, { bubbles: true }))
    })
    await assert_aligned()

    await page.setViewportSize({ width: 760, height: 620 })
    await assert_aligned()
  })
})

test(`input width minimizes when options are selected`, async ({ page }) => {
  await page.goto(`/ui`, { waitUntil: `networkidle` })
  const input = page.locator(`#foods input[autocomplete]`)

  const init_input_width = await input.evaluate(
    (element) => getComputedStyle(element).minWidth,
  )
  expect(init_input_width).toBe(`32px`)

  await input.click()
  await page.click(`text=🍌 Banana`)

  const input_width_w_selected = await input.evaluate(
    (element) => getComputedStyle(element).minWidth,
  )
  expect(input_width_w_selected).toBe(`1px`)

  await page.click(`button[title='Remove 🍌 Banana']`)
  const input_width_w_no_selected = await input.evaluate(
    (element) => getComputedStyle(element).minWidth,
  )
  expect(input_width_w_no_selected).toBe(init_input_width)
})

// Issue #380: CSS class specificity - user classes should override component defaults
// https://github.com/janosh/svelte-multiselect/issues/380
test(`component buttons are styled correctly with border: none`, async ({ page }) => {
  await page.goto(`/css-classes`, { waitUntil: `networkidle` })

  const button = page.locator(`ul.selected > li button`).first()
  await expect(button).toBeVisible()

  const border_style = await button.evaluate(
    (element) => getComputedStyle(element).borderStyle,
  )
  expect(border_style).toBe(`none`)
})

// Runtime regression tests for the schemeless-dark-page readability fix: the component
// pairs a light-dark() text-color default with its light-dark() backgrounds so text can't
// inherit a near-white page color on pages that never declare `color-scheme` (there
// light-dark() resolves to its light branch). happy-dom strips light-dark()/var() from
// computed styles, so this can only be verified in a real browser.
// light-dark(#222, #eee) → #222 = rgb(34, 34, 34) under the schemeless (light) scheme.
test.describe(`schemeless-dark-page text-color readability`, () => {
  test.use({ colorScheme: `light` }) // schemeless subtree resolves light-dark() to its light branch
  const readable = `rgb(34, 34, 34)`
  const computed_color = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).color)

  // in-place: the div.multiselect root default cascades to the input the user types in
  test(`in-place widget text uses the light-dark() default, not the inherited page color`, async ({
    page,
  }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    // simulate a dark page that never declares color-scheme: force the schemeless (normal)
    // scheme on the widget's subtree and give its parent a distinctive inherited color.
    await page.evaluate(() => {
      const parent =
        document.querySelector<HTMLElement>(`#foods div.multiselect`)?.parentElement
      if (!parent) throw new Error(`#foods div.multiselect parent not found`)
      parent.style.colorScheme = `normal`
      parent.style.color = `rgb(255, 0, 0)`
    })

    expect(await computed_color(page, `#foods div.multiselect`), `root`).toBe(readable)
    expect(await computed_color(page, `#foods input[autocomplete]`), `input`).toBe(
      readable,
    )
  })

  // portalled: ul.options is moved to document.body and no longer inherits div.multiselect's
  // color, so it needs its own default — this is the surface an in-place test can't verify.
  test(`portalled dropdown text uses the light-dark() default, not the inherited page color`, async ({
    page,
  }) => {
    const modal_content = await open_portal_modal(page)
    await modal_content.locator(`input[placeholder='Choose languages...']`).click()

    const dropdown = page.locator(`body > ul.options:not(.hidden)`)
    await expect(dropdown).toBeVisible()

    // schemeless dark page: the portalled dropdown inherits color-scheme + color from body
    await page.evaluate(() => {
      document.body.style.colorScheme = `normal`
      document.body.style.color = `rgb(255, 0, 0)`
    })

    expect(await computed_color(page, `body > ul.options:not(.hidden)`), `dropdown`).toBe(
      readable,
    )
    expect(
      await computed_color(page, `body > ul.options:not(.hidden) > li`),
      `option`,
    ).toBe(readable)
  })
})
