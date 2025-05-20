import { expect, test } from '@playwright/test'
import {
  colors as demo_colors,
  languages as demo_languages,
  foods,
} from '../src/site/options'

// to run tests in this file, use `npm run test:e2e`

test.describe.configure({ mode: `parallel` })

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

  test(`filters dropdown to show only matching options when entering text`, async ({
    page,
  }) => {
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

  test(`only appears if more than 1 option is selected and removes all selected`, async ({
    page,
  }) => {
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
  for (const [prop, selector, cls] of [
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
  ]) {
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

  test(`input is aria-invalid when component has invalid=true`, async ({
    page,
  }) => {
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

  test(`options have aria-selected='false' and selected items have aria-selected='true'`, async ({
    page,
  }) => {
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
  test(`loops through dropdown list with arrow keys making each option active in turn`, async ({
    page,
  }) => {
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

  test(`retains its selected state on page reload when bound to localStorage`, async ({
    page,
  }) => {
    await page.goto(`/persistent`, { waitUntil: `networkidle` })

    await page.click(`#languages input[autocomplete]`)

    await page.click(`text=Haskell >> nth=0`)

    await page.fill(`#languages input[autocomplete]`, `java`)

    await page.click(`text=JavaScript`)

    await page.reload()

    const selected_text = await page.textContent(`text=4 Haskell 5 JavaScript`)
    expect(selected_text).toContain(`JavaScript`)
    expect(selected_text).toContain(`Haskell`)
  })
})

test.describe(`allowUserOptions`, () => {
  test(`entering custom option adds it to selected but not to options`, async ({
    page,
  }) => {
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

  test(`entering custom option in append mode adds it to selected
      list _and_ to options in dropdown menu`, async ({ page }) => {
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
  })

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
  test(`creates custom option correctly after selecting a provided option`, async ({
    page,
  }) => {
    const selector = `#languages input[autocomplete]`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)
    await page.click(`text=Python`)

    await page.fill(selector, `foobar`)
    await page.press(selector, `Enter`) // create custom option

    const ul_selected = await page.$(`ul.selected >> text=foobar`)
    expect(ul_selected).toBeTruthy()
  })

  test(`can create custom option starting from empty options array`, async ({
    page,
  }) => {
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
      msg.includes(`MultiSelect received no options`),
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
        `Don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`,
      ),
    )

    expect(has_expected_error).toBe(true)
  })
})

test.describe(`maxSelect`, () => {
  const max_select = 5

  test.beforeEach(async ({ page }) => {
    await page.goto(`/min-max-select`, { waitUntil: `networkidle` })
    await page.click(`#languages input[autocomplete]`)

    // select maxSelect options
    for (const idx of Array(max_select).fill(0)) {
      await page.click(`ul.options > li >> nth=${idx}`)
    }
  })

  test(`options dropdown disappears when reaching maxSelect items`, async ({
    page,
  }) => {
    const ul_selector = `#languages ul.options`

    await expect(page.locator(ul_selector)).toBeHidden()
    expect(await page.getAttribute(ul_selector, `class`)).toContain(`hidden`)
  })

  test(`no more options can be added after reaching maxSelect items`, async ({
    page,
  }) => {
    // query for li[aria-selected=true] to avoid matching the ul.selected > li containing the <input/>
    let selected_lis = await page.$$(
      `#languages ul.selected > li[aria-selected=true]`,
    )
    expect(selected_lis).toHaveLength(max_select)
    await page.click(`#languages input[autocomplete]`) // re-open options dropdown
    await page.click(`ul.options > li >> nth=0`)
    selected_lis = await page.$$(
      `#languages ul.selected > li[aria-selected=true]`,
    )
    expect(selected_lis).toHaveLength(max_select)
  })
})

test.describe(`snippets`, () => {
  test(`renders removeIcon snippet for individual remove buttons and the remove-all button`, async ({
    page,
  }) => {
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

test(`dragging selected options across each other changes their order`, async ({
  page,
}) => {
  // https://github.com/janosh/svelte-multiselect/issues/176
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
  test(`foods dropdown in modal 1 renders in body when portal is active`, async ({
    page,
  }) => {
    await page.goto(`/modal`, { waitUntil: `networkidle` })

    await page
      .getByRole(`button`, { name: `Open Modal 1 (Vertical Selects)` })
      .click()

    const modal_1_content = page.locator(`div.modal-content.modal-1`)
    const foods_input = modal_1_content.locator(
      `div.multiselect input[placeholder='Choose foods...']`,
    )
    await foods_input.click() // Open dropdown

    // Options list should be portalled to body and visible
    const portalled_foods_options = page.locator(
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${foods[0]}"))`,
    )
    await expect(portalled_foods_options).toBeVisible()

    // Options list should not be a direct child of the multiselect wrapper in the modal
    const foods_multiselect_wrapper = modal_1_content.locator(
      `div.multiselect:has(input[placeholder='Choose foods...'])`,
    )
    await expect(
      foods_multiselect_wrapper.locator(`> ul.options`),
    ).not.toBeAttached()

    // Select an option
    await portalled_foods_options.locator(`li:has-text("${foods[0]}")`).click()
    await expect(portalled_foods_options).toBeHidden() // Dropdown should close

    await expect(
      modal_1_content.getByRole(`button`, { name: `Remove ${foods[0]}` }),
    ).toBeVisible()

    await page.keyboard.press(`Escape`) // Close any remaining popups/dropdowns
    await page.getByRole(`button`, { name: `Close Modal 1` }).click()
    await expect(modal_1_content).toBeHidden()
  })

  test(`dropdown renders within component when portal is inactive (/ui page)`, async ({
    page,
  }) => {
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

  test(`colors dropdown in modal 1 renders in body when portal is active`, async ({
    page,
  }) => {
    await page.goto(`/modal`, { waitUntil: `networkidle` })

    await page
      .getByRole(`button`, { name: `Open Modal 1 (Vertical Selects)` })
      .click()

    const modal_1_content = page.locator(`div.modal-content.modal-1`)
    const colors_input = modal_1_content.locator(
      `div.multiselect input[placeholder='Choose colors...']`,
    )
    await colors_input.click() // Open dropdown

    // Options list should be portalled to body and visible
    const portalled_colors_options = page.locator(
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${demo_colors[0]}"))`,
    )
    await expect(portalled_colors_options).toBeVisible()

    // Options list should not be a direct child of the multiselect wrapper in the modal
    const colors_multiselect_wrapper = modal_1_content.locator(
      `div.multiselect:has(input[placeholder='Choose colors...'])`,
    )
    await expect(
      colors_multiselect_wrapper.locator(`> ul.options`),
    ).not.toBeAttached()

    // Select an option
    await portalled_colors_options
      .locator(`li:has-text("${demo_colors[0]}")`)
      .click()
    await expect(portalled_colors_options).toBeHidden() // Dropdown should close

    await expect(
      modal_1_content.getByRole(`button`, { name: `Remove ${demo_colors[0]}` }),
    ).toBeVisible()

    await page.keyboard.press(`Escape`) // Close any remaining popups/dropdowns
    await page.getByRole(`button`, { name: `Close Modal 1` }).click()
    await expect(modal_1_content).toBeHidden()
  })

  test(`languages dropdown in modal 2 renders in body when portal is active`, async ({
    page,
  }) => {
    await page.goto(`/modal`, { waitUntil: `networkidle` })

    await page
      .getByRole(`button`, { name: `Open Modal 2 (Horizontal Selects)` })
      .click()

    const modal_2_content = page.locator(`div.modal-content.modal-2`)
    const languages_input = modal_2_content.locator(
      `div.multiselect input[placeholder='Choose languages...']`,
    )
    await languages_input.click() // Open dropdown

    // Options list should be portalled to body and visible
    const portalled_languages_options = page.locator(
      `body > ul.options[aria-expanded="true"]:has(li:has-text("${demo_languages[0]}"))`,
    )
    await expect(portalled_languages_options).toBeVisible()

    // Options list should not be a direct child of the multiselect wrapper in the modal
    const languages_multiselect_wrapper = modal_2_content.locator(
      `div.multiselect:has(input[placeholder='Choose languages...'])`,
    )
    await expect(
      languages_multiselect_wrapper.locator(`> ul.options`),
    ).not.toBeAttached()

    // Select an option, ensuring exact match
    await portalled_languages_options
      .getByRole(`option`, { name: demo_languages[0], exact: true })
      .click()
    // Dropdown should remain visible on desktop by default
    await expect(portalled_languages_options).toBeVisible()
    // And the selected option should no longer be in the options list (if duplicates=false)
    await expect(
      portalled_languages_options.getByRole(`option`, {
        name: demo_languages[0],
        exact: true,
      }),
    ).not.toBeAttached()

    await expect(
      modal_2_content.getByRole(`button`, {
        name: `Remove ${demo_languages[0]}`,
      }),
    ).toBeVisible()

    await page.keyboard.press(`Escape`) // Close any remaining popups/dropdowns
    await page.getByRole(`button`, { name: `Close Modal 2` }).click()
    await expect(modal_2_content).toBeHidden()
  })
})
