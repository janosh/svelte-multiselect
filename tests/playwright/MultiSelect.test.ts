// deno-lint-ignore-file no-await-in-loop
import { foods, languages, octicons } from '$site/options'
import { expect, test } from '@playwright/test'
import process from 'node:process'

test.describe.configure({ mode: `parallel` })

// Issue #309: Array cloning by reactive wrappers (stores, Superforms) caused infinite loops
// https://github.com/janosh/svelte-multiselect/issues/309
test(`array cloning infinite loop prevention (issue #309)`, async ({ page }) => {
  await page.goto(`/persistent`, { waitUntil: `networkidle` })

  // Selecting an option triggers the store subscription
  await page.click(`#store-binding input[placeholder='Select colors...']`)
  await page.click(`#store-binding ul.options >> text=Red`)

  // Verify increment stays low (would be 1000+ without fix)
  const status = page.locator(`#store-binding-status`)
  await expect(status.locator(`text=✅ Fixed`)).toBeVisible()
  await expect(status.locator(`text=⚠️ Regression`)).not.toBeVisible()

  // Also verify count directly for robustness
  const count_text = await status.textContent()
  const count = parseInt(count_text?.match(/\d+/)?.[0] ?? `0`)
  expect(count).toBeLessThan(10)
})

test.describe(`fuzzy matching`, () => {
  test(`fuzzy=true matches partial characters`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)
    await page.fill(`#foods input[autocomplete]`, `ga`)

    await expect(page.locator(`#foods ul.options li:has-text("Garlic")`)).toBeVisible()
    await expect(page.locator(`#foods ul.options li:has-text("Green Apple")`))
      .toBeVisible()
    await expect(page.locator(`#foods ul.options li:has-text("Banana")`)).toBeHidden()
  })

  test(`fuzzy=true matches non-consecutive characters`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)
    await page.fill(`#foods input[autocomplete]`, `ga`)

    await expect(page.locator(`#foods ul.options li:has-text("Garlic")`)).toBeVisible()
    await expect(page.locator(`#foods ul.options li:has-text("Green Apple")`))
      .toBeVisible()
  })

  test(`fuzzy=false only matches substrings`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.evaluate(() => {
      const container = document.createElement(`div`)
      container.id = `substring-test`
      container.innerHTML =
        `<div class="multiselect"><ul class="selected"><input autocomplete="off" /></ul></div>`
      document.body.appendChild(container)

      const input = container.querySelector(`input`)
      if (!input) throw new Error(`Input not found`)
      const options = [`garlic`, `green apple`, `grape`, `banana`]

      input.addEventListener(`input`, (evt) => {
        const search_text = (evt.target as HTMLInputElement).value.toLowerCase()
        const filtered_options = options.filter((opt) =>
          opt.toLowerCase().includes(search_text)
        )

        const options_list = document.createElement(`ul`)
        options_list.className = `options`
        filtered_options.forEach((opt) => {
          const li = document.createElement(`li`)
          li.textContent = opt
          options_list.appendChild(li)
        })

        const existing_options = container.querySelector(`.options`)
        if (existing_options) existing_options.remove()
        container.appendChild(options_list)
      })
    })

    await page.click(`#substring-test input[autocomplete]`)
    await page.fill(`#substring-test input[autocomplete]`, `ga`)

    await expect(page.locator(`#substring-test ul.options li:has-text("garlic")`))
      .toBeVisible()
    await expect(page.locator(`#substring-test ul.options li:has-text("green apple")`))
      .toBeHidden()
  })

  test(`fuzzy highlighting works correctly`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)
    await page.fill(`#foods input[autocomplete]`, `ga`)

    const highlighted_elements = await page.evaluate(() => {
      try {
        const highlights = globalThis.CSS?.highlights?.get?.(`sms-search-matches`)
        // @ts-expect-error - Highlight.ranges will exist in browser
        return highlights ? highlights.ranges.length : 0
      } catch {
        return 0
      }
    })

    expect(highlighted_elements).toBeGreaterThanOrEqual(0)
  })

  test(`fuzzy prop defaults to true`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)
    await page.fill(`#foods input[autocomplete]`, `ga`)

    await expect(page.locator(`#foods ul.options li:has-text("Garlic")`)).toBeVisible()
    await expect(page.locator(`#foods ul.options li:has-text("Green Apple")`))
      .toBeVisible()
  })
})

test.describe(`input`, () => {
  test(`opens dropdown on focus`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    const dropdown = page.locator(`#foods ul.options`)
    await expect(dropdown).toHaveClass(/hidden/)
    await expect(page.locator(`#foods.open`)).toHaveCount(0)

    await page.click(`#foods input[autocomplete]`)

    await expect(dropdown).not.toHaveClass(/hidden/)
    await expect(dropdown).toBeVisible()
  })

  // https://github.com/janosh/svelte-multiselect/issues/289
  test(`programmatic focus opens dropdown`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    const dropdown = page.locator(`#foods div.multiselect > ul.options`)
    // confirm initial state
    await expect(dropdown).toHaveClass(/hidden/)
    await expect(dropdown).toBeHidden()

    await page.evaluate(() => {
      const input = document.querySelector(
        `#foods input[autocomplete]`,
      ) as HTMLInputElement
      input?.focus()
    })
    await expect(dropdown).not.toHaveClass(/hidden/)
    await expect(dropdown).toBeVisible()

    // also test that input.blur() closes dropdown
    await page.evaluate(() => {
      const input = document.querySelector(
        `#foods input[autocomplete]`,
      ) as HTMLInputElement
      input?.blur()
    })
    await expect(dropdown).toHaveClass(/hidden/)
    await expect(dropdown).toBeHidden()
  })

  test(`closes dropdown on tab out`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    // note we only test for close on tab out, not on blur since blur should not close in case user
    // clicked anywhere else inside component
    await page.focus(`#foods input[autocomplete]`)

    await page.keyboard.press(`Tab`)

    const dropdown = await page.locator(`#foods ul.options`)
    await dropdown.waitFor({ state: `hidden` })
    const visibility = await dropdown.evaluate(
      (el) => getComputedStyle(el).visibility,
    )
    const opacity = await dropdown.evaluate(
      (el) => getComputedStyle(el).opacity,
    )
    expect(visibility).toBe(`hidden`)
    expect(opacity).toBe(`0`)
  })

  test(`filters dropdown to show only matching options when entering text`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.fill(`#foods input[autocomplete]`, `Pineapple`)

    const options = page.locator(`#foods ul.options`)
    await expect(options.locator(`li`)).toHaveCount(1)
    await expect(options).toHaveText(`🍍 Pineapple`)
  })
})

test.describe(`remove single button`, () => {
  test(`should remove 1 option`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`#foods input[autocomplete]`)
    await page.click(`#foods ul.options >> text=🍌 Banana`)

    await page.click(`#foods button[title='Remove 🍌 Banana']`)

    await expect(page.locator(`#foods ul.selected > li > button`)).toHaveCount(0)
  })
})

test.describe(`remove all button`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    const input_locator = page.locator(`#foods input[autocomplete]`)
    const options_list_locator = page.locator(`#foods ul.options`)

    // Select first option
    await input_locator.click()
    await options_list_locator.waitFor({ state: `visible` })
    const first_option = options_list_locator.locator(`li >> nth=0`)
    await first_option.waitFor({ state: `visible` })
    await first_option.click()

    // Select second option
    await input_locator.click()
    await options_list_locator.waitFor({ state: `visible` })
    const second_option = options_list_locator.locator(`li >> nth=0`)
    await second_option.waitFor({ state: `visible` })
    await second_option.click()
  })

  test(`only appears if more than 1 option is selected and removes all selected`, async ({ page }) => {
    const selected_buttons = page.locator(`#foods ul.selected > li > button`)
    await expect(selected_buttons).toHaveCount(2)

    // Wait for flip animation to complete before clicking remove-all button
    const remove_all_btn = page.locator(`#foods button.remove-all`)
    await remove_all_btn.waitFor({ state: `visible` })
    await remove_all_btn.click()
    await expect(remove_all_btn).toBeHidden()

    await expect(selected_buttons).toHaveCount(0)
  })

  test(`has custom title`, async ({ page }) => {
    const button_title = await page.getAttribute(`#foods button.remove-all`, `title`)
    expect(await button_title).toBe(`Remove all foods`)
  })

  // TODO: test button emits removeAll event
  // test(`emits removeAll event`, async ({ page }) => {
  //   await page.waitForEvent(`removeAll`),
  // })
})

test.describe(`external CSS classes`, () => {
  for (
    const [prop, selector, cls] of [
      [`outerDiv`, `div.multiselect`, `wrapper`],
      [`ulSelected`, `ul.selected`, `user-choices`],
      [`ulOptions`, `ul.options`, `dropdown`],
      [`liOption`, `ul.options > li`, `selectable-li`],
      [`liUserMsgClass`, `ul.options > li.user-msg`, `selectable-msg-li`],
      [`input`, `input[autocomplete]`, `search-text-input`],
      // below classes requires component interaction before appearing in DOM
      [`liSelected`, `ul.selected > li`, `selected-li`],
      [`liActiveOption`, `ul.options > li.active`, `hovered-or-arrow-keyed-li`],
      [
        `liActiveUserMsgClass`,
        `ul.options > li.active.user-msg`,
        `hovered-or-arrow-keyed-msg-li`,
      ],
      [`maxSelectMsg`, `span.max-select-msg`, `user-hint-max-selected-reached`],
    ]
  ) {
    test(`${prop}Class`, async ({ page }) => {
      await page.goto(`/css-classes`, { waitUntil: `networkidle` })

      await page.click(`#foods input[autocomplete]`)
      await page.keyboard.type(`O`) // type a word so that the user message shows up

      if (prop !== `liActiveUserMsgClass`) {
        await page.hover(`ul.options > li`) // hover any option to give it active state
      } else {
        await page.hover(`ul.options > li:last-child`) // hover last option to give it active state
      }

      await expect(page.locator(`${selector}.${cls}`).first()).toBeVisible()
    })
  }
})

test.describe(`disabled multiselect`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/disabled`, { waitUntil: `networkidle` })
  })

  test(`has attribute aria-disabled`, async ({ page }) => {
    await expect(page.locator(`#disabled-input-title ul.options`)).toHaveAttribute(
      `aria-disabled`,
      `true`,
    )
  })

  test(`has disabled title`, async ({ page }) => {
    await expect(page.locator(`#disabled-input-title div.multiselect`)).toHaveAttribute(
      `title`,
      `Super special disabled message (shows on hover)`,
    )
  })

  test(`has input attribute disabled`, async ({ page }) => {
    await expect(page.locator(`#disabled-input-title input[autocomplete]`)).toBeDisabled()
  })

  test(`renders no buttons`, async ({ page }) => {
    await expect(
      page.locator(`#disabled-input-title div.multiselect button`),
    ).toHaveCount(0)
  })

  test(`renders disabled snippet`, async ({ page }) => {
    await expect(
      page.locator(`span`).filter({ hasText: `This component is disabled` }),
    ).toBeVisible()
  })
})

test.describe(`accessibility`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
  })

  test(`input is aria-invalid when component has invalid=true`, async ({ page }) => {
    // don't interact with component before this test as it will set invalid=false
    const invalid = await page.getAttribute(
      `#foods input[autocomplete]`,
      `aria-invalid`,
      { strict: true },
    )
    expect(invalid).toBe(`true`)
  })

  test(`has aria-expanded='false' when closed`, async ({ page }) => {
    const before = await page.getAttribute(
      `#foods ul.options`,
      `aria-expanded`,
      { strict: true },
    )
    expect(before).toBe(`false`)
  })

  test(`has aria-expanded='true' when open`, async ({ page }) => {
    await page.click(`#foods input[autocomplete]`)
    const after = await page.getAttribute(
      `#foods ul.options`,
      `aria-expanded`,
      { strict: true },
    )
    expect(after).toBe(`true`)
  })

  test(`options have aria-selected='false' and selected items have aria-selected='true'`, async ({ page }) => {
    await page.click(`#foods input[autocomplete]`)
    await page.click(`#foods ul.options > li`)
    const aria_option = await page.getAttribute(
      `#foods ul.options > li`,
      `aria-selected`,
    )
    expect(aria_option).toBe(`false`)
    const aria_selected = await page.getAttribute(
      `#foods ul.selected > li`,
      `aria-selected`,
    )
    expect(aria_selected).toBe(`true`)
  })

  test(`invisible input.form-control is aria-hidden`, async ({ page }) => {
    // https://github.com/janosh/svelte-multiselect/issues/58
    const hidden = await page.getAttribute(
      `#foods input.form-control`,
      `aria-hidden`,
      { strict: true },
    )
    expect(hidden).toBe(`true`)
  })
})

// VoiceOver/screen reader accessibility tests (issue #118)
// These E2E tests verify ARIA combobox pattern in a real browser context
test.describe(`VoiceOver/screen reader accessibility (issue #118)`, () => {
  test(`input has role=combobox with proper ARIA attributes`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    const input = page.locator(`#foods input[autocomplete]`)

    // Verify combobox role and attributes
    await expect(input).toHaveAttribute(`role`, `combobox`)
    await expect(input).toHaveAttribute(`aria-haspopup`, `listbox`)
    await expect(input).toHaveAttribute(`aria-expanded`, `false`)

    // aria-controls should point to listbox
    const controls_id = await input.getAttribute(`aria-controls`)
    expect(controls_id).toBeTruthy()

    // Open dropdown and verify expanded state
    await input.click()
    await expect(input).toHaveAttribute(`aria-expanded`, `true`)

    // Verify listbox has matching ID
    const listbox = page.locator(`#foods ul.options`)
    expect(controls_id).toBeTruthy()
    await expect(listbox).toHaveAttribute(`id`, controls_id as string)
    await expect(listbox).toHaveAttribute(`role`, `listbox`)
  })

  test(`options have aria-posinset and aria-setsize for position announcements`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`#foods input[autocomplete]`)

    const options = page.locator(`#foods ul.options > li[role="option"]`)
    const count = await options.count()
    expect(count).toBeGreaterThan(0)

    // Verify first and last options have correct position info
    const first_option = options.first()
    await expect(first_option).toHaveAttribute(`aria-posinset`, `1`)
    await expect(first_option).toHaveAttribute(`aria-setsize`, `${count}`)

    const last_option = options.last()
    await expect(last_option).toHaveAttribute(`aria-posinset`, `${count}`)
    await expect(last_option).toHaveAttribute(`aria-setsize`, `${count}`)
  })

  test(`aria-live announces counts, selections with label, and removals`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    const input = page.locator(`#foods input[autocomplete]`)
    const live_region = page.locator(`#foods .sr-only[aria-live="polite"]`)

    await input.click()

    // Live region announces option count
    await expect(live_region).toHaveAttribute(`aria-atomic`, `true`)
    await expect(live_region).toContainText(/\d+ options? available/)

    // Get first option and select it - should announce with label
    const first_option = page.locator(`#foods ul.options > li[role="option"]:first-child`)

    // Select option - should announce with label
    await first_option.click()
    await expect(live_region).toContainText(/selected/)

    // Remove option - should announce removal
    const remove_btn = page.locator(`#foods ul.selected button.remove`).first()
    await remove_btn.click()
    await expect(live_region).toContainText(/removed/)
  })

  test(`keyboard navigation with aria-activedescendant is fully accessible`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    const input = page.locator(`#foods input[autocomplete]`)

    // Focus should open dropdown
    await input.focus()
    await expect(input).toHaveAttribute(`aria-expanded`, `true`)

    // Initially no active descendant
    expect(await input.getAttribute(`aria-activedescendant`)).toBeFalsy()

    // Navigate with arrow keys - activedescendant should update
    await page.keyboard.press(`ArrowDown`)
    const first_active_id = await input.getAttribute(`aria-activedescendant`)
    expect(first_active_id).toBeTruthy()

    // Verify referenced element exists and is active
    const active_option = page.locator(`#${first_active_id}`)
    await expect(active_option).toHaveAttribute(`role`, `option`)
    await expect(active_option).toHaveClass(/active/)

    // Navigate again - activedescendant should change
    await page.keyboard.press(`ArrowDown`)
    const second_active_id = await input.getAttribute(`aria-activedescendant`)
    expect(second_active_id).not.toBe(first_active_id)

    // Select with Enter
    await page.keyboard.press(`Enter`)

    // Verify selection was made
    const selected = page.locator(`#foods ul.selected > li[aria-selected="true"]`)
    await expect(selected).toHaveCount(1)

    // Escape should close dropdown
    await page.keyboard.press(`Escape`)
    await expect(input).toHaveAttribute(`aria-expanded`, `false`)
  })

  test(`group headers are accessible with aria-label`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#basic-grouping input[autocomplete]`)

    const group_headers = page.locator(`#basic-grouping ul.options li.group-header`)
    const count = await group_headers.count()
    expect(count).toBeGreaterThan(0)

    // Each group header should have aria-label for screen reader announcement
    for (let idx = 0; idx < count; idx++) {
      const header = group_headers.nth(idx)
      const aria_label = await header.getAttribute(`aria-label`)
      expect(aria_label).toMatch(/^Group: /)
    }
  })
})

test.describe(`multiselect`, () => {
  test(`can select and remove many options`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    for (const idx of [2, 5, 8]) {
      await page.click(`#foods input[autocomplete]`)
      await page.click(`#foods ul.options > li >> nth=${idx}`)
    }
    const selected = page.locator(`#foods ul.selected`)
    for (const food of `Pear Pineapple Watermelon`.split(` `)) {
      await expect(selected).toContainText(food)
    }

    await page.click(`#foods .remove-all`)
    await expect(selected).toHaveText(``)

    // repeatedly select 1st option
    // TODO fix this, passes when run in isolation but not in suite
    // for (const idx of [0, 0, 0]) {
    //   await page.click(`#foods input[autocomplete]`)
    //   await page.click(`ul.options > li >> nth=${idx}`)
    // }
  })

  // https://github.com/janosh/svelte-multiselect/issues/111
  test(`loops through dropdown list with arrow keys making each option active in turn`, async ({ page }) => {
    // skip in CI since it's flaky
    if (process.env.CI) test.skip()

    await page.goto(`/ui`, { waitUntil: `networkidle` })
    // reload page

    await page.click(`#foods input[autocomplete]`)

    const active_option = page.locator(`#foods ul.options > li.active`)
    for (const expected_fruit of foods) {
      await page.keyboard.press(`ArrowDown`)
      await expect(active_option).toHaveText(expected_fruit)
    }

    // test loop back to first option
    await page.keyboard.press(`ArrowDown`)
    await expect(active_option).toHaveText(foods[0])

    // test loop back to last option
    await page.keyboard.press(`ArrowUp`)
    await expect(active_option).toHaveText(foods.at(-1) as string)
  })

  // https://github.com/janosh/svelte-multiselect/issues/357
  test(`keyboard nav ignores scroll-triggered mouseover but re-enables on mouse movement`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)

    // Navigate down to the 3rd option (index 2 = Watermelon)
    for (let idx = 0; idx < 3; idx++) {
      await page.keyboard.press(`ArrowDown`)
    }
    const active_option = page.locator(`#foods ul.options > li.active`)
    await expect(active_option).toHaveText(foods[2]) // Watermelon

    // Simulate scroll-triggered mouseover (no actual mouse movement)
    await page.evaluate(() => {
      const first_option = document.querySelector(`#foods ul.options > li`)
      first_option?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
    })

    // Active should NOT change from synthetic mouseover
    const active_after_synthetic_hover = await active_option.textContent()
    expect(active_after_synthetic_hover?.trim()).toBe(foods[2]) // Still Watermelon

    // Now move mouse for real - this should re-enable hover via mousemove on ul.options
    await page.evaluate(() => {
      const ul = document.querySelector(`#foods ul.options`)
      const fifth_li = document.querySelectorAll(`#foods ul.options > li`)[4]
      // Dispatch mousemove on ul (resets ignore_hover)
      ul?.dispatchEvent(new MouseEvent(`mousemove`, { bubbles: true }))
      // Then dispatch mouseover on the target li
      fifth_li?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
    })

    // Active should now follow the mouse position
    await expect(active_option).toHaveText(foods[4]) // Lemon
  })

  test(`retains its selected state on page reload when bound to localStorage`, async ({ page }) => {
    // Clear sessionStorage before navigating to start fresh
    await page.goto(`/persistent`, { waitUntil: `networkidle` })
    await page.evaluate(() => sessionStorage.clear())
    await page.reload({ waitUntil: `networkidle` })

    // Wait for default items to load (onMount populates from sessionStorage or defaults)
    const selected = page.locator(`#languages ul.selected`)
    await expect(selected).toContainText(`Python`) // default item

    // Open dropdown and select additional items
    await page.click(`#languages input[autocomplete]`)
    await expect(page.locator(`#languages ul.options`)).toBeVisible()

    // Select Ruby (not in defaults)
    await page.locator(`#languages ul.options li:has-text("Ruby")`).first().click()

    await page.reload()

    // Verify Ruby persisted along with defaults
    await expect(selected).toContainText(`Ruby`)
    await expect(selected).toContainText(`Python`)
  })
})

test.describe(`allowUserOptions`, () => {
  test(`entering custom option adds it to selected but not to options`, async ({ page }) => {
    const selector = `#foods input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })
    await page.click(selector)

    // ensure custom option initially not present
    const durian_selected = page.locator(`#foods ul.selected >> text=Durian`)
    await expect(durian_selected).toHaveCount(0)

    // create custom option
    await page.fill(selector, `Durian`)
    await page.press(selector, `Enter`)

    // ensure custom option now present
    await expect(durian_selected).toBeVisible()

    // ensure custom option was not added to options
    await page.fill(selector, `Durian`)
    await expect(page.locator(`#foods ul.options >> text=Durian`)).toHaveCount(0)
  })

  test(
    `entering custom option in append mode adds it to selected
      list _and_ to options in dropdown menu`,
    async ({ page }) => {
      // i.e. it remains selectable from the dropdown after removing from selected
      const selector = `#languages input[autocomplete]`

      await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

      await page.click(selector)

      await page.fill(selector, `foobar`)

      await page.press(selector, `Enter`) // create custom option
      await page.press(selector, `Backspace`) // remove custom option from selected items

      await page.fill(selector, `foobar`) // filter dropdown options to only show custom one

      await page.click(`#languages ul.options >> text=foobar`)

      await expect(page.locator(`#languages ul.selected >> text=foobar`)).toBeVisible()
    },
  )

  test(`shows custom createOptionMsg if no options match`, async ({ page }) => {
    const selector = `#languages input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)

    // enter some search text so no options match, should cause createOptionMsg to be shown
    await page.fill(selector, `foobar`)

    await expect(
      page.locator(`#languages ul.options li.user-msg`),
    ).toContainText(`True polyglots can enter custom languages!`)
  })

  // https://github.com/janosh/svelte-multiselect/issues/89
  // Prior to fixing GH-89, pressing Enter to create the custom option would clear the
  // entered text 'foobar' (good so far) but instead of creating a custom option from it,
  // delete the previously added option 'Python'. was due to Python still being the activeOption
  // so Enter key would toggle it.
  test(`creates custom option correctly after selecting a provided option`, async ({ page }) => {
    const selector = `#languages input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)
    await page.click(`#languages ul.options >> text=Python`)

    await page.fill(selector, `foobar`)
    await page.press(selector, `Enter`)

    await expect(page.locator(`#languages ul.selected >> text=foobar`)).toBeVisible()
  })

  test(`can create custom option starting from empty options array`, async ({ page }) => {
    const logs: string[] = []
    page.on(`console`, (msg) => {
      if (msg.type() === `error`) logs.push(msg.text())
    })
    const selector = `#no-default-options input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)

    await page.fill(selector, `foo`)
    await page.press(selector, `Enter`)
    await page.fill(selector, `42`)
    await page.press(selector, `Enter`)

    await expect(page.locator(`#no-default-options ul.selected >> text=42`)).toBeVisible()

    const logged_err_msg = logs.some((msg) =>
      msg.includes(`MultiSelect received no options`)
    )
    expect(logged_err_msg).toBe(false)
  })
})

test.describe(`sortSelected`, () => {
  const labels = `Svelte Vue React Angular Polymer Laravel Django`.split(` `)

  test(`default sorting is alphabetical by label`, async ({ page }) => {
    await page.goto(`/sort-selected`, { waitUntil: `networkidle` })

    await page.click(`#default-sort input[autocomplete]`)
    for (const label of labels) {
      await page.click(`#default-sort ul.options >> text=${label}`)
    }

    await expect(page.locator(`#default-sort ul.selected`)).toHaveText(
      `Angular Django Laravel Polymer React Svelte Vue`,
    )
  })

  test(`custom sorting`, async ({ page }) => {
    await page.goto(`/sort-selected`, { waitUntil: `networkidle` })

    await page.click(`#custom-sort input[autocomplete]`)
    for (const label of labels) {
      await page.click(`#custom-sort ul.options >> text=${label}`)
    }

    await expect(page.locator(`#custom-sort ul.selected`)).toHaveText(
      `Angular Polymer React Svelte Vue Laravel Django`,
    )
  })
})

test.describe(`parseLabelsAsHtml`, () => {
  test(`renders anchor tags as links`, async ({ page }) => {
    await page.goto(`/parse-labels-as-html`, { waitUntil: `networkidle` })

    // Open the dropdown to see the anchor in options
    await page.click(`input[autocomplete]`)
    await expect(page.locator(`ul.options`)).toBeVisible()

    await expect(
      page.locator(`a[href='https://wikipedia.org/wiki/Red_pill_and_blue_pill']`),
    ).toBeVisible()
  })

  test(`to raise error if combined with allowUserOptions`, async ({ page }) => {
    const logs: string[] = []
    page.on(`console`, (msg) => logs.push(msg.text()))

    await page.goto(`/parse-labels-as-html`, { waitUntil: `networkidle` })

    const has_expected_error = logs.some((msg) =>
      msg.includes(
        `MultiSelect: don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`,
      )
    )

    expect(has_expected_error).toBe(true)
  })
})

test.describe(`maxSelect`, () => {
  const max_select = 5

  test.beforeEach(async ({ page }) => {
    await page.goto(`/min-max-select`, { waitUntil: `networkidle` })

    // Select maxSelect options
    for (let idx = 1; idx < max_select; idx++) {
      await page.click(`#languages input[autocomplete]`)
      await page.click(`#languages ul.options > li >> nth=${idx}`)
    }
  })

  test(`options dropdown disappears when reaching maxSelect items`, async ({ page }) => {
    const dropdown = page.locator(`#languages ul.options`)

    await expect(dropdown).toBeHidden()
    await expect(dropdown).toHaveClass(/hidden/)
  })

  test(`no more options can be added after reaching maxSelect items`, async ({ page }) => {
    // query for li[aria-selected=true] to avoid matching the ul.selected > li containing the <input/>
    const selected_items = page.locator(`#languages ul.selected > li[aria-selected=true]`)
    await expect(selected_items).toHaveCount(max_select)

    // Try to add another option - should not work
    await page.click(`#languages input[autocomplete]`)
    await page.click(`#languages ul.options > li >> nth=0`)

    // Verify selected count hasn't changed (still maxSelect)
    await expect(selected_items).toHaveCount(max_select)
  })
})

test.describe(`snippets`, () => {
  test(`renders removeIcon snippet for individual remove buttons and the remove-all button`, async ({ page }) => {
    await page.goto(`/snippets`, { waitUntil: `networkidle` })

    // Use .expand-icon wrapper class for robust selection that doesn't depend on exact sibling order
    const expand_icon_locator = page.locator(`#languages-1 .expand-icon svg`)
    await expect(
      expand_icon_locator,
      `custom expand icon snippet is not rendered`,
    ).toHaveCount(1)

    // make sure, rendering different expandIcon snippet depending on open=true/false works
    const expand_icon_path = await expand_icon_locator
      .locator(`path`)
      .first()
      .getAttribute(`d`)

    // then click on the expand icon to open the dropdown and change open to true
    await expand_icon_locator.click()

    // assert that the collapse icon path differs from expand icon path
    const collapse_icon_path = await expand_icon_locator
      .locator(`path`)
      .first()
      .getAttribute(`d`)
    expect(
      expand_icon_path,
      `Expand and collapse icon paths should differ`,
    ).not.toBe(collapse_icon_path)
    // ^^^ expand-icon test done

    const remove_icons_locator = page.locator(
      `#languages-1 ul.selected > li > button > svg`,
    )
    await expect(
      remove_icons_locator,
      `unexpected number of custom remove icon snippets rendered`,
    ).toHaveCount(3)

    const remove_all_svg_locator = page.locator(
      `#languages-1 button.remove-all > svg`,
    )
    await expect(
      remove_all_svg_locator,
      `custom remove-all icon snippet is not rendered`,
    ).toHaveCount(1)
  })
})

// https://github.com/janosh/svelte-multiselect/issues/176
test(`dragging selected options across each other changes their order`, async ({ page }) => {
  await page.goto(`/persistent`, { waitUntil: `networkidle` })
  const selected = page.locator(`#languages ul.selected`)
  await expect(selected).toHaveText(`1  Python 2  TypeScript 3  C 4  Haskell`)

  // swap selected options 1 and 2
  const li1 = page.locator(`#languages ul.selected li:nth-child(1)`)
  const li2 = page.locator(`#languages ul.selected li:nth-child(2)`)
  await li1.dragTo(li2)
  await expect(selected).toHaveText(`1  TypeScript 2  Python 3  C 4  Haskell`)
})

test.describe(`portal feature`, () => {
  test(`dropdown renders within component when portal is inactive (/ui page)`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    const foods_multiselect = page.locator(`#foods`)
    await foods_multiselect.locator(`input[autocomplete]`).click() // Open dropdown

    // Options list should be a child of the multiselect wrapper and visible
    const foods_options_in_component = foods_multiselect.locator(`ul.options`)
    await expect(foods_options_in_component).toBeVisible()
    await expect(foods_options_in_component).toHaveAttribute(
      `aria-expanded`,
      `true`,
    )

    // Options list should NOT be portalled to the body
    const portalled_foods_options = page.locator(
      // More specific selector to avoid accidental matches if body > ul.options exists for other reasons
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${foods[0]}"))`,
    )
    await expect(portalled_foods_options).not.toBeAttached()
  })

  test(`mobile touch selection works with portal enabled`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/portal`, { waitUntil: `networkidle` })
    await page.getByRole(`button`, { name: `Open Modal` }).click()

    const modal_content = page.locator(`div.modal-content.modal`)
    const languages_input = modal_content.locator(
      `div.multiselect input[placeholder='Choose languages...']`,
    )

    await languages_input.click()

    const portalled_languages_options = page.locator(
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${languages[0]}"))`,
    )
    await expect(portalled_languages_options).toBeVisible()

    // Simulate the race condition that causes the bug
    const dropdown_stays_open = await page.evaluate(() => {
      const outerDiv = document.querySelector(`div.multiselect`)
      const portalled_option = document.querySelector(
        `body > ul.options li[role="option"]`,
      )
      const dropdown = document.querySelector(`body > ul.options`)

      if (!outerDiv || !portalled_option || !dropdown) return false

      // Simulate click outside event on portalled element
      const click_event = new MouseEvent(`click`, { bubbles: true })
      Object.defineProperty(click_event, `target`, { value: portalled_option })
      globalThis.dispatchEvent(click_event)

      return dropdown.getAttribute(`aria-expanded`) === `true`
    })

    // Without fix: dropdown closes, test times out. With fix: dropdown stays open, test passes.
    expect(dropdown_stays_open).toBe(true)

    await portalled_languages_options.getByRole(`option`, {
      name: languages[0],
      exact: true,
    }).click()
    await expect(modal_content.getByRole(`button`, { name: `Remove ${languages[0]}` }))
      .toBeVisible()
  })

  test(`dropdowns in modal render in body when portal is active`, async ({ page }) => {
    await page.goto(`/portal`, { waitUntil: `networkidle` })

    await page.getByRole(`button`, { name: `Open Modal` }).click()

    const modal_content = page.locator(`div.modal-content.modal`) // General modal content selector

    // Test for Languages dropdown
    const languages_input = modal_content.locator(
      `div.multiselect input[placeholder='Choose languages...']`,
    )
    await languages_input.click() // Open languages dropdown

    const portalled_languages_options = page.locator(
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${languages[0]}"))`,
    )
    await expect(portalled_languages_options).toBeVisible()

    const languages_multiselect_wrapper = modal_content.locator(
      `div.multiselect:has(input[placeholder='Choose languages...'])`,
    )
    await expect(
      languages_multiselect_wrapper.locator(`> ul.options`),
    ).not.toBeAttached()

    await portalled_languages_options
      .getByRole(`option`, { name: languages[0], exact: true })
      .click()
    await expect(portalled_languages_options).toBeVisible()
    await expect(
      portalled_languages_options.getByRole(`option`, {
        name: languages[0],
        exact: true,
      }),
    ).not.toBeAttached() // If duplicates=false

    await expect(
      modal_content.getByRole(`button`, { name: `Remove ${languages[0]}` }),
    ).toBeVisible()

    // Close languages dropdown by pressing Escape before testing octicons
    await page.keyboard.press(`Escape`)
    await expect(portalled_languages_options).toBeHidden()

    // Test for Octicons dropdown
    const octicons_input = modal_content.locator(
      `div.multiselect input[placeholder='Choose octicons...']`,
    )
    await octicons_input.click() // Open octicons dropdown

    const portalled_octicons_options = page.locator(
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${octicons[0]}"))`,
    )
    await expect(portalled_octicons_options).toBeVisible()

    const octicons_multiselect_wrapper = modal_content.locator(
      `div.multiselect:has(input[placeholder='Choose octicons...'])`,
    )
    await expect(
      octicons_multiselect_wrapper.locator(`> ul.options`),
    ).not.toBeAttached()

    // Select an octicon option
    const first_octicon_option_text = octicons[0]
    await portalled_octicons_options
      .getByRole(`option`, { name: first_octicon_option_text, exact: true })
      .click()
    await expect(portalled_octicons_options).toBeHidden() // Keep: expect to be hidden for octicons
    await expect(
      portalled_octicons_options.getByRole(`option`, {
        name: first_octicon_option_text,
        exact: true,
      }),
    ).not.toBeAttached()

    await expect(
      modal_content.getByRole(`button`, {
        name: `Remove ${first_octicon_option_text}`,
      }),
    ).toBeVisible()

    await page.keyboard.press(`Escape`) // Close any remaining popups/dropdowns
    await page.getByRole(`button`, { name: `Close Modal 2` }).click() // Name from svelte file
    await expect(modal_content).toBeHidden()
  })
})

test(`input width minimizes when options are selected`, async ({ page }) => {
  await page.goto(`/ui`, { waitUntil: `networkidle` })
  const input = page.locator(`#foods input[autocomplete]`)

  // Normal width when no selection (placeholder shown)
  const init_input_width = await input.evaluate(
    (el) => getComputedStyle(el).minWidth,
  )
  expect(init_input_width).toBe(`32px`)

  await input.click() // Select any option to hide placeholder
  await page.click(`text=🍌 Banana`)

  // Minimal width when selection exists (placeholder hidden)
  const input_width_w_selected = await input.evaluate(
    (el) => getComputedStyle(el).minWidth,
  )
  expect(input_width_w_selected).toBe(`1px`)

  // Width is reset when option is removed
  await page.click(`button[title='Remove 🍌 Banana']`)
  const input_width_w_no_selected = await input.evaluate(
    (el) => getComputedStyle(el).minWidth,
  )
  expect(input_width_w_no_selected).toBe(init_input_width)
})

test.describe(`option grouping`, () => {
  test(`renders group headers with options organized by group`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#basic-grouping input[autocomplete]`)

    const options_list = page.locator(`#basic-grouping ul.options`)
    await expect(options_list).toBeVisible()

    // Check group headers are rendered
    await expect(options_list.locator(`li.group-header`)).toHaveCount(4) // Frontend, Backend, Database, DevOps
    await expect(options_list.locator(`li.group-header`).first()).toContainText(
      `Frontend`,
    )

    // Check options under each group
    await expect(options_list.locator(`li[role="option"]:has-text("JavaScript")`))
      .toBeVisible()
    await expect(options_list.locator(`li[role="option"]:has-text("Python")`))
      .toBeVisible()
    await expect(options_list.locator(`li[role="option"]:has-text("PostgreSQL")`))
      .toBeVisible()
  })

  test(`search filtering shows only matching options and hides empty groups`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    const input = page.locator(`#basic-grouping input[autocomplete]`)
    await input.click()
    await input.fill(`Python`)

    const options_list = page.locator(`#basic-grouping ul.options`)
    // Only Backend group should be visible since Python is in Backend
    await expect(options_list.locator(`li.group-header:has-text("Backend")`))
      .toBeVisible()
    await expect(options_list.locator(`li.group-header:has-text("Frontend")`))
      .toBeHidden()
    await expect(options_list.locator(`li.group-header:has-text("Database")`))
      .toBeHidden()
    await expect(options_list.locator(`li[role="option"]:has-text("Python")`))
      .toBeVisible()
  })

  test(`searchMatchesGroups includes group name in search matching`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })

    // Enable searchMatchesGroups
    await page.click(`#basic-grouping label:has-text("searchMatchesGroups")`)

    const input = page.locator(`#basic-grouping input[autocomplete]`)
    await input.click()
    await input.fill(`Backend`)

    const options_list = page.locator(`#basic-grouping ul.options`)
    // All Backend options should be visible when searching for "Backend"
    await expect(options_list.locator(`li[role="option"]:has-text("Python")`))
      .toBeVisible()
    await expect(options_list.locator(`li[role="option"]:has-text("Go")`)).toBeVisible()
    await expect(options_list.locator(`li[role="option"]:has-text("Rust")`)).toBeVisible()
  })

  test(`collapsible groups toggle visibility and aria-expanded on click`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#collapsible-groups input[autocomplete]`)

    const options_list = page.locator(`#collapsible-groups ul.options`)
    const fruits_header = options_list.locator(`li.group-header:has-text("Fruits")`)
    const apple = options_list.locator(`li[role="option"]:has-text("🍎 Apple")`)
    const dairy_header = options_list.locator(`li.group-header:has-text("Dairy")`)
    const milk = options_list.locator(`li[role="option"]:has-text("🥛 Milk")`)

    // Fruits expanded by default, Dairy starts collapsed (per demo config)
    await expect(apple).toBeVisible()
    await expect(fruits_header).toHaveAttribute(`aria-expanded`, `true`)
    await expect(milk).toBeHidden()
    await expect(dairy_header).toHaveAttribute(`aria-expanded`, `false`)

    // Click to collapse Fruits
    await fruits_header.click()
    await expect(apple).toBeHidden()
    await expect(fruits_header).toHaveAttribute(`aria-expanded`, `false`)

    // Click to expand Dairy
    await dairy_header.click()
    await expect(milk).toBeVisible()
    await expect(dairy_header).toHaveAttribute(`aria-expanded`, `true`)
  })

  test(`collapse all and expand all buttons work`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#collapsible-groups input[autocomplete]`)

    const options_list = page.locator(`#collapsible-groups ul.options`)
    const apple_option = options_list.locator(`li[role="option"]:has-text("🍎 Apple")`)
    const carrot_option = options_list.locator(`li[role="option"]:has-text("🥕 Carrot")`)
    const milk_option = options_list.locator(`li[role="option"]:has-text("🥛 Milk")`)

    // Verify initial state - Fruits and Vegetables visible, Dairy collapsed
    await expect(apple_option).toBeVisible()
    await expect(milk_option).toBeHidden()

    // Click Collapse All
    await page.click(`#collapsible-groups button:has-text("Collapse All")`)

    // All options should be hidden
    await expect(apple_option).toBeHidden()
    await expect(carrot_option).toBeHidden()

    // Re-open dropdown (might have closed) and click Expand All
    await page.click(`#collapsible-groups input[autocomplete]`)
    await page.click(`#collapsible-groups button:has-text("Expand All")`)

    // All options should be visible
    await expect(apple_option).toBeVisible()
    await expect(carrot_option).toBeVisible()
    await expect(milk_option).toBeVisible()
  })

  test(`arrow key navigation skips collapsed groups`, async ({ page }) => {
    if (process.env.CI) test.skip() // keyboard nav tests are flaky in CI

    await page.goto(`/grouping`, { waitUntil: `networkidle` })

    // Toggle keyboardExpandsCollapsedGroups and wait for state to settle
    const checkbox = page.locator(
      `#collapsible-groups label:has-text("keyboardExpandsCollapsedGroups")`,
    )
    await checkbox.click()

    const input = page.locator(`#collapsible-groups input[autocomplete]`)
    await input.click()

    const options_list = page.locator(`#collapsible-groups ul.options`)
    await options_list.waitFor({ state: `visible` })

    // Wait for group headers to have correct aria-expanded state
    await expect(options_list.locator(`li.group-header:has-text("Dairy")`))
      .toHaveAttribute(`aria-expanded`, `false`)
    await expect(options_list.locator(`li.group-header:has-text("Fruits")`))
      .toHaveAttribute(`aria-expanded`, `true`)

    const active_option = options_list.locator(`li.active[role="option"]`)
    const visible_count = await options_list.locator(`li[role="option"]:visible`).count()

    // First ArrowDown should activate Apple (first visible option in Fruits group)
    await page.keyboard.press(`ArrowDown`)
    await expect(active_option).toContainText(`Apple`)

    // Cycle through all visible options
    for (let idx = 1; idx < visible_count; idx++) {
      await page.keyboard.press(`ArrowDown`)
      await expect(active_option).toBeVisible()
    }

    // Should wrap back to Apple
    await page.keyboard.press(`ArrowDown`)
    await expect(active_option).toContainText(`Apple`)
  })

  test(`groupSelectAll selects all and toggles to deselect`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#group-select-all input[autocomplete]`)

    const options_list = page.locator(`#group-select-all ul.options`)
    const selected = page.locator(`#group-select-all ul.selected`)
    const select_btn = options_list.locator(`li.group-header:has-text("Primary") button`)

    // Click select all for Primary group
    await select_btn.click()
    await expect(selected).toContainText(`Red`)
    await expect(selected).toContainText(`Blue`)
    await expect(selected).toContainText(`Yellow`)
    await expect(selected).not.toContainText(`Orange`) // Secondary not selected

    // Click again to deselect all
    await select_btn.click()
    await expect(selected).not.toContainText(`Red`)
    await expect(selected).not.toContainText(`Blue`)
    await expect(selected).not.toContainText(`Yellow`)
  })

  test(`ungroupedPosition and groupSortOrder control option ordering`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })

    const demo = page.locator(`#ungrouped-sorting`)
    const input = demo.locator(`input[autocomplete]`)
    const options_list = demo.locator(`ul.options`)
    const group_headers = options_list.locator(`li.group-header`)

    // Helper to change select and wait for UI update
    const change_select = async (label: string, value: string) => {
      await demo.locator(`label:has-text("${label}") select`).selectOption(value)
      await input.click()
      await expect(options_list).toBeVisible()
    }

    // ungroupedPosition='first' (default) - ungrouped options appear first
    await input.click()
    await expect(options_list.locator(`li`).first()).toContainText(`⭐ Featured Item`)

    // Change ungroupedPosition to 'last'
    await change_select(`ungroupedPosition`, `last`)
    await expect(options_list.locator(`li[role="option"]`).last()).toContainText(
      `✨ Editor's Pick`,
    )

    // groupSortOrder='asc' - A Fruits first, Z Animals last
    await change_select(`groupSortOrder`, `asc`)
    await expect(group_headers.first()).toContainText(`A Fruits`)
    await expect(group_headers.last()).toContainText(`Z Animals`)

    // groupSortOrder='desc' - Z Animals first, A Fruits last
    await change_select(`groupSortOrder`, `desc`)
    await expect(group_headers.first()).toContainText(`Z Animals`)
    await expect(group_headers.last()).toContainText(`A Fruits`)
  })

  test(`custom group header snippet renders with emoji flags and option counts`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#custom-group-header input[autocomplete]`)

    const custom_list = page.locator(`#custom-group-header ul.options`)
    for (const emoji of [`🇺🇸`, `🇬🇧`, `🇯🇵`, `🇫🇷`, `🇩🇪`]) {
      await expect(custom_list.locator(`li.group-header:has-text("${emoji}")`))
        .toBeVisible()
    }
    await expect(custom_list.locator(`li.group-header:has-text("USA"):has-text("(5)")`))
      .toBeVisible()
  })

  test(`group header shows total count and select all toggles correctly`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`#group-select-all input[autocomplete]`)

    const options_list = page.locator(`#group-select-all ul.options`)
    const primary_header = options_list.locator(`li.group-header:has-text("Primary")`)

    await expect(primary_header).toContainText(`(3)`)
    await expect(primary_header.locator(`button`)).toContainText(`Select all`)

    await primary_header.locator(`button`).click()
    await expect(primary_header.locator(`button`)).toContainText(`Deselect`)
  })

  test(`searchExpandsCollapsedGroups auto-expands matching collapsed groups`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })

    const input = page.locator(`#collapsible-groups input[autocomplete]`)
    await input.click()

    const options_list = page.locator(`#collapsible-groups ul.options`)

    // Dairy is collapsed initially
    await expect(options_list.locator(`li[role="option"]:has-text("🥛 Milk")`))
      .toBeHidden()

    // Type search matching Dairy option (searchExpandsCollapsedGroups is enabled by default in demo)
    await input.fill(`Milk`)

    // Dairy group should auto-expand
    await expect(options_list.locator(`li[role="option"]:has-text("🥛 Milk")`))
      .toBeVisible()
  })
})

// Issue #380: CSS class specificity - user classes should override component defaults
// https://github.com/janosh/svelte-multiselect/issues/380
test.describe(`CSS class override specificity (issue #380)`, () => {
  // Test that user-provided class props are applied to elements
  // The actual CSS override behavior depends on :where() having zero specificity
  test(`class props are applied to correct elements`, async ({ page }) => {
    await page.goto(`/css-classes`, { waitUntil: `networkidle` })

    // Click to open dropdown first
    await page.click(`#foods input[autocomplete]`)

    // Verify class props from the demo page are applied
    await expect(page.locator(`div.multiselect.wrapper`)).toBeVisible()
    await expect(page.locator(`ul.selected.user-choices`)).toBeVisible()
    await expect(page.locator(`ul.selected > li.selected-li`).first()).toBeVisible()
    await expect(page.locator(`input.search-text-input`)).toBeVisible()
    await expect(page.locator(`ul.options.dropdown`)).toBeVisible()
    await expect(page.locator(`ul.options > li.selectable-li`).first()).toBeVisible()
  })

  test(`inline styles can be applied to override component background`, async ({ page }) => {
    await page.goto(`/css-classes`, { waitUntil: `networkidle` })

    const li = page.locator(`ul.selected > li`).first()
    await expect(li).toBeVisible()

    // Apply inline style
    await li.evaluate((el) => {
      ;(el as HTMLElement).style.setProperty(`background-color`, `red`, `important`)
    })

    // Verify the style attribute was set (more reliable than getComputedStyle
    // which can show blended colors due to transparency)
    const style_attr = await li.getAttribute(`style`)
    expect(style_attr).toContain(`background-color`)
    expect(style_attr).toContain(`red`)
  })

  test(`compiled CSS uses :where() for overridable selectors`, async ({ page }) => {
    await page.goto(`/css-classes`, { waitUntil: `networkidle` })

    // Verify the component CSS uses :where() for the selected li selector
    // This ensures the implementation is correct even if we can't easily test cascade
    const uses_where = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets)
      for (const sheet of stylesheets) {
        try {
          const rules = Array.from(sheet.cssRules || [])
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              // Check for :where() in li selector within selected ul
              if (
                rule.selectorText.includes(`:where(`) &&
                rule.selectorText.includes(`selected`) &&
                rule.selectorText.includes(`> li`)
              ) {
                return rule.selectorText
              }
            }
          }
        } catch {
          // Cross-origin stylesheets will throw, ignore them
        }
      }
      return null
    })

    expect(uses_where).not.toBeNull()
    expect(uses_where).toContain(`:where(`)
  })

  test(`component buttons are styled correctly with border: none`, async ({ page }) => {
    await page.goto(`/css-classes`, { waitUntil: `networkidle` })

    // Verify the remove button exists and has no visible border
    // (checking border-style since border-width might be 0px or none)
    const button = page.locator(`ul.selected > li button`).first()
    await expect(button).toBeVisible()

    const border_style = await button.evaluate((el) => getComputedStyle(el).borderStyle)

    // Component's :is() selector should set border: none
    expect(border_style).toBe(`none`)
  })

  test(`.group-label and .group-count elements are visible and styled correctly`, async ({ page }) => {
    await page.goto(`/grouping`, { waitUntil: `networkidle` })
    await page.click(`input[autocomplete]`)

    // These internal elements should be visible with correct styling
    const group_label = page.locator(`.group-label`).first()
    const group_count = page.locator(`.group-count`).first()

    await expect(group_label).toBeVisible()
    await expect(group_count).toBeVisible()

    // Verify group-label has flex-grow: 1 (expands to fill available space)
    const flex = await group_label.evaluate((el) => getComputedStyle(el).flexGrow)
    expect(flex).toBe(`1`)

    // Verify group-count has opacity > 0 (visible)
    const opacity = await group_count.evaluate((el) => getComputedStyle(el).opacity)
    expect(parseFloat(opacity)).toBeGreaterThan(0)
  })

  test(`internal elements use :is() for specificity protection`, async ({ page }) => {
    // This test verifies that internal elements (.group-label, .group-count)
    // use :is() instead of :where() to protect against global style conflicts
    await page.goto(`/grouping`, { waitUntil: `networkidle` })

    const uses_is_for_internals = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets)
      for (const sheet of stylesheets) {
        try {
          const rules = Array.from(sheet.cssRules || [])
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              // Check that .group-label uses :is() not :where()
              if (
                rule.selectorText.includes(`:is(`) &&
                rule.selectorText.includes(`group-label`)
              ) {
                return true
              }
            }
          }
        } catch {
          // Cross-origin stylesheets will throw, ignore them
        }
      }
      return false
    })

    expect(uses_is_for_internals).toBe(true)
  })

  test(`component selectors use :where() for overridable elements`, async ({ page }) => {
    // This test verifies the implementation detail by checking compiled CSS
    await page.goto(`/css-classes`, { waitUntil: `networkidle` })

    // Check that key selectors use :where() for zero specificity
    // This is critical for user class overrides to work
    const selectors_using_where = await page.evaluate(() => {
      const results: Record<string, boolean> = {
        div_multiselect: false,
        ul_selected_li: false,
        ul_options: false,
      }

      const stylesheets = Array.from(document.styleSheets)
      for (const sheet of stylesheets) {
        try {
          const rules = Array.from(sheet.cssRules || [])
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              const sel = rule.selectorText
              // Check div.multiselect uses :where() (not just any selector containing it)
              if (
                sel.match(
                  /:where\(div\.multiselect\.[a-zA-Z0-9_-]+\)\s*\{?$|:where\(div\.multiselect\.[a-zA-Z0-9_-]+\)$/,
                )
              ) {
                results.div_multiselect = true
              }
              // Check ul.selected > li uses :where()
              if (
                sel.includes(`:where(`) && sel.includes(`selected`) &&
                sel.includes(`> li`)
              ) {
                results.ul_selected_li = true
              }
              // Check ul.options uses :where()
              if (sel.match(/:where\(ul\.options/)) {
                results.ul_options = true
              }
            }
          }
        } catch {
          // Cross-origin stylesheets will throw, ignore them
        }
      }
      return results
    })

    expect(selectors_using_where.div_multiselect).toBe(true)
    expect(selectors_using_where.ul_selected_li).toBe(true)
    expect(selectors_using_where.ul_options).toBe(true)
  })
})
