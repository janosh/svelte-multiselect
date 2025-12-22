// deno-lint-ignore-file no-await-in-loop
import { foods, languages, octicons } from '$site/options'
import { expect, test } from '@playwright/test'
import process from 'node:process'

test.describe.configure({ mode: `parallel` })

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
    expect(await page.$(`div.multiselect > ul.options.hidden`)).toBeTruthy()
    expect(await page.$(`div.multiselect.open`)).toBeNull()

    await page.click(`#foods input[autocomplete]`)

    expect(await page.$(`div.multiselect.open > ul.options.hidden`)).toBeNull()

    const options = page.locator(`div.multiselect.open > ul.options`)
    await expect(options).toBeVisible()
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

    const dropdown = await page.locator(`div.multiselect > ul.options`)
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

    const ul_selector = `div.multiselect.open > ul.options`
    expect(await page.$$(`${ul_selector} > li`)).toHaveLength(1)
    const text = await page.textContent(ul_selector)
    expect(text?.trim()).toBe(`🍍 Pineapple`)
  })
})

test.describe(`remove single button`, () => {
  test(`should remove 1 option`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`#foods input[autocomplete]`)
    await page.click(`text=🍌 Banana`)

    await page.click(`button[title='Remove 🍌 Banana']`)

    const selected = await page.$$(
      `div.multiselect > ul.selected > li > button`,
    )
    expect(selected.length).toBe(0)
  })
})

test.describe(`remove all button`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    const input_locator = page.locator(`#foods input[autocomplete]`)
    const options_list_locator = page.locator(`ul.options[role="listbox"]`)

    // Select first option
    await input_locator.click() // Ensure dropdown is open
    await options_list_locator.waitFor({ state: `visible` })
    const first_option = options_list_locator.locator(`li >> nth=0`)
    await first_option.waitFor({ state: `visible` })
    await first_option.click()

    // Select second option
    await input_locator.click() // Ensure dropdown is open again
    await options_list_locator.waitFor({ state: `visible` })
    const second_option = options_list_locator.locator(`li >> nth=0`) // targets the new first item
    await second_option.waitFor({ state: `visible` })
    await second_option.click()
  })

  test(`only appears if more than 1 option is selected and removes all selected`, async ({ page }) => {
    let selected_items = await page.$$(
      `div.multiselect > ul.selected > li > button`,
    )
    expect(selected_items).toHaveLength(2)

    await page.click(`button.remove-all`)
    expect(await page.$(`button.remove-all`)).toBeNull() // remove-all button is hidden when nothing selected

    selected_items = await page.$$(
      `div.multiselect > ul.selected > li > button`,
    )
    expect(selected_items).toHaveLength(0)
  })

  test(`has custom title`, async ({ page }) => {
    const button_title = await page.getAttribute(`button.remove-all`, `title`)
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

      const node = await page.$(`${selector}.${cls}`)
      expect(node).toBeTruthy()
    })
  }
})

test.describe(`disabled multiselect`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/disabled`, { waitUntil: `networkidle` })
  })

  test(`has attribute aria-disabled`, async ({ page }) => {
    const div = await page.$(`div.multiselect.disabled ul.options`)
    expect(await div?.getAttribute(`aria-disabled`)).toBe(`true`)
  })

  test(`has disabled title`, async ({ page }) => {
    const div = await page.$(`div.multiselect.disabled`)
    expect(await div?.getAttribute(`title`)).toBe(
      `Super special disabled message (shows on hover)`,
    )
  })

  test(`has input attribute disabled`, async ({ page }) => {
    const input = await page.$(`.disabled input[autocomplete]`)
    expect(await input?.isDisabled()).toBe(true)
  })

  test(`renders no buttons`, async ({ page }) => {
    expect(
      await page.$$(`#disabled-input-title div.multiselect button`),
    ).toHaveLength(0)
  })

  test(`renders disabled snippet`, async ({ page }) => {
    const span = await page.locator(
      `span:has-text('This component is disabled. It won't even open.')`,
    )
    expect(span).toBeTruthy()
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
      `div.multiselect ul.options`,
      `aria-expanded`,
      { strict: true },
    )
    expect(before).toBe(`false`)
  })

  test(`has aria-expanded='true' when open`, async ({ page }) => {
    await page.click(`div.multiselect`) // open the dropdown
    const after = await page.getAttribute(
      `div.multiselect ul.options`,
      `aria-expanded`,
      { strict: true },
    )
    expect(after).toBe(`true`)
  })

  test(`options have aria-selected='false' and selected items have aria-selected='true'`, async ({ page }) => {
    await page.click(`div.multiselect`) // open the dropdown
    await page.click(`div.multiselect > ul.options > li`) // select 1st option
    const aria_option = await page.getAttribute(
      `div.multiselect > ul.options > li`,
      `aria-selected`,
    )
    expect(aria_option).toBe(`false`)
    const aria_selected = await page.getAttribute(
      `div.multiselect > ul.selected > li`,
      `aria-selected`,
    )
    expect(aria_selected).toBe(`true`)
  })

  test(`invisible input.form-control is aria-hidden`, async ({ page }) => {
    // https://github.com/janosh/svelte-multiselect/issues/58

    const hidden = await page.getAttribute(
      `input.form-control`,
      `aria-hidden`,
      { strict: true },
    )
    expect(hidden).toBe(`true`)
  })
})

test.describe(`multiselect`, () => {
  test(`can select and remove many options`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    for (const idx of [2, 5, 8]) {
      await page.click(`#foods input[autocomplete]`)
      await page.click(`ul.options > li >> nth=${idx}`)
    }
    let selected_text = await page.textContent(`div.multiselect > ul.selected`)
    for (const food of `Pear Pineapple Watermelon`.split(` `)) {
      expect(selected_text).toContain(food)
    }

    await page.click(`.remove-all`)
    selected_text = await page.textContent(`div.multiselect > ul.selected`)
    expect(selected_text?.trim()).toBe(``)

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

    for (const expected_fruit of foods) {
      await page.keyboard.press(`ArrowDown`)
      const actual_food = await page.textContent(`ul.options > li.active`)
      expect(actual_food?.trim()).toBe(expected_fruit)
    }

    // test loop back to first option
    await page.keyboard.press(`ArrowDown`)
    const first_food = await page.textContent(`ul.options > li.active`)
    expect(first_food?.trim()).toBe(foods[0])

    // test loop back to last option
    await page.keyboard.press(`ArrowUp`)
    const last_food = await page.textContent(`ul.options > li.active`)
    expect(last_food?.trim()).toBe(foods.at(-1))
  })

  // https://github.com/janosh/svelte-multiselect/issues/357
  test(`keyboard nav ignores scroll-triggered mouseover but re-enables on mouse movement`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    await page.click(`#foods input[autocomplete]`)

    // Navigate down to the 3rd option (index 2 = Watermelon)
    for (let idx = 0; idx < 3; idx++) {
      await page.keyboard.press(`ArrowDown`)
    }
    const active_after_keys = await page.textContent(`#foods ul.options > li.active`)
    expect(active_after_keys?.trim()).toBe(foods[2]) // Watermelon

    // Simulate scroll-triggered mouseover (no actual mouse movement)
    await page.evaluate(() => {
      const first_option = document.querySelector(`#foods ul.options > li`)
      first_option?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
    })

    // Active should NOT change from synthetic mouseover
    const active_after_synthetic_hover = await page.textContent(
      `#foods ul.options > li.active`,
    )
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
    const active_after_real_hover = await page.textContent(
      `#foods ul.options > li.active`,
    )
    expect(active_after_real_hover?.trim()).toBe(foods[4]) // Lemon
  })

  test(`retains its selected state on page reload when bound to localStorage`, async ({ page }) => {
    await page.goto(`/persistent`, { waitUntil: `networkidle` })

    // Clear any pre-selected items first
    const remove_buttons = page.locator(`#languages button[title^="Remove"]`)
    const count = await remove_buttons.count()
    for (let idx = 0; idx < count; idx++) {
      await remove_buttons.first().click()
    }

    // Open dropdown and wait for it to be visible
    await page.click(`#languages input[autocomplete]`)
    await page.locator(`#languages ul.options`).waitFor({ state: `visible` })

    await page.locator(`#languages ul.options li:has-text("Haskell")`).first().click()

    await page.fill(`#languages input[autocomplete]`, `java`)
    await page.locator(`#languages ul.options li:has-text("JavaScript")`).first().click()

    await page.reload()

    const selected = page.locator(`#languages ul.selected`)
    await expect(selected).toContainText(`Haskell`)
    await expect(selected).toContainText(`JavaScript`)
  })
})

test.describe(`allowUserOptions`, () => {
  test(`entering custom option adds it to selected but not to options`, async ({ page }) => {
    const selector = `#foods input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })
    await page.click(selector)

    // ensure custom option initially not present
    let li_handle = await page.$(`div.multiselect > ul.selected >> text=Durian`)
    expect(li_handle).toBeNull()

    // create custom option
    await page.fill(selector, `Durian`)
    await page.press(selector, `Enter`)

    // ensure custom option now present
    li_handle = await page.$(`div.multiselect > ul.selected >> text=Durian`)
    expect(li_handle).toBeTruthy()

    // ensure custom option was not added to options
    await page.fill(selector, `Durian`)
    li_handle = await page.$(`div.multiselect > ul.option >> text=Durian`)
    expect(li_handle).toBeNull()
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

      await page.click(`ul.options >> text=foobar`)

      const ul_selected = await page.$(`ul.selected >> text=foobar`)
      expect(ul_selected).toBeTruthy()
    },
  )

  test(`shows custom createOptionMsg if no options match`, async ({ page }) => {
    const selector = `#languages input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)

    // enter some search text so no options match, should cause createOptionMsg to be shown
    await page.fill(selector, `foobar`)

    const custom_msg_li = await page.$(
      `text=True polyglots can enter custom languages!`,
    )
    expect(custom_msg_li).toBeTruthy()
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
    await page.click(`text=Python`)

    await page.fill(selector, `foobar`)
    await page.press(selector, `Enter`) // create custom option

    const ul_selected = await page.$(`ul.selected >> text=foobar`)
    expect(ul_selected).toBeTruthy()
  })

  test(`can create custom option starting from empty options array`, async ({ page }) => {
    // and doesn't error about empty options when custom options allowed
    const logs: string[] = []
    page.on(`console`, (msg) => {
      if (msg.type() === `error`) logs.push(msg.text())
    })
    const selector = `#no-default-options input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)

    await page.fill(selector, `foo`)
    await page.press(selector, `Enter`) // create custom option
    await page.fill(selector, `42`)
    await page.press(selector, `Enter`) // 2nd create custom option

    const ul_selected = await page.$(`ul.selected >> text=42`)
    expect(ul_selected).toBeTruthy()

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

    await page.click(`#default-sort input[autocomplete]`) // open dropdown

    for (const label of labels) {
      await page.click(`ul.options >> text=${label}`)
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`,
    )
    expect(selected?.trim()).toBe(
      `Angular Django Laravel Polymer React Svelte Vue`,
    )
  })

  test(`custom sorting`, async ({ page }) => {
    await page.goto(`/sort-selected`, { waitUntil: `networkidle` })

    await page.click(`#custom-sort input[autocomplete]`) // open dropdown
    for (const label of labels) {
      await page.click(`ul.options:visible >> text=${label}`)
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`,
    )
    expect(selected?.trim()).toBe(
      `Angular Polymer React Svelte Vue Laravel Django`,
    )
  })
})

test.describe(`parseLabelsAsHtml`, () => {
  test(`renders anchor tags as links`, async ({ page }) => {
    await page.goto(`/parse-labels-as-html`, { waitUntil: `networkidle` })

    const anchor = await page.$(
      `a[href='https://wikipedia.org/wiki/Red_pill_and_blue_pill']`,
    )
    expect(anchor).toBeTruthy()
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
      await page.click(`ul.options > li >> nth=${idx}`)
    }
  })

  test(`options dropdown disappears when reaching maxSelect items`, async ({ page }) => {
    const ul_selector = `#languages ul.options`

    await expect(page.locator(ul_selector)).toBeHidden()
    expect(await page.getAttribute(ul_selector, `class`)).toContain(`hidden`)
  })

  test(`no more options can be added after reaching maxSelect items`, async ({ page }) => {
    // query for li[aria-selected=true] to avoid matching the ul.selected > li containing the <input/>
    let selected_lis = await page.$$(
      `#languages ul.selected > li[aria-selected=true]`,
    )
    expect(selected_lis).toHaveLength(max_select)

    // Try to add another option - should not work
    await page.click(`#languages input[autocomplete]`) // re-open options dropdown

    // The dropdown might still be visible but clicking on options shouldn't add more
    await page.click(`ul.options > li >> nth=0`)

    // Verify selected count hasn't changed (still maxSelect)
    selected_lis = await page.$$(
      `#languages ul.selected > li[aria-selected=true]`,
    )
    expect(selected_lis).toHaveLength(max_select)
  })
})

test.describe(`snippets`, () => {
  test(`renders removeIcon snippet for individual remove buttons and the remove-all button`, async ({ page }) => {
    await page.goto(`/snippets`, { waitUntil: `networkidle` })

    const expand_icon_locator = page.locator(
      `#languages-1 .multiselect > input.form-control + svg`,
    )
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
  let selected = await page.textContent(`ul.selected`)
  expect(selected?.trim()).toBe(`1  Python 2  TypeScript 3  C 4  Haskell`)

  // swap selected options 1 and 2
  const li1 = await page.locator(`ul.selected li:nth-child(1)`)
  const li2 = await page.locator(`ul.selected li:nth-child(2)`)
  await li1?.dragTo(li2)
  selected = await page.textContent(`ul.selected`)
  expect(selected?.trim()).toBe(`1  TypeScript 2  Python 3  C 4  Haskell`)
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
