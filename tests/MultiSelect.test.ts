import { expect, test } from '@playwright/test'
import { foods } from '../src/options.ts'
import { wait_for_animation_end } from './index.ts'

// to run tests in this file, use `npm run test:e2e`

test.describe.configure({ mode: `parallel` })

test.describe(`input`, async () => {
  test(`opens dropdown on focus`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    expect(await page.$(`div.multiselect > ul.options.hidden`)).toBeTruthy()
    expect(await page.$(`div.multiselect.open`)).toBeNull()

    await page.click(`#foods ul input`)

    expect(await page.$(`div.multiselect.open > ul.options.hidden`)).toBeNull()

    const visible_dropdown = await page.waitForSelector(
      `div.multiselect.open > ul.options:visible`
    )
    expect(visible_dropdown).toBeTruthy()
  })

  test(`closes dropdown on tab out`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
    // note we only test for close on tab out, not on blur since blur should not close in case user
    // clicked anywhere else inside component
    await page.focus(`#foods ul input`)

    await page.keyboard.press(`Tab`)

    const dropdown = await page.locator(`div.multiselect > ul.options`)
    await dropdown.waitFor({ state: `hidden` })
    const visibility = await dropdown.evaluate(
      (el) => getComputedStyle(el).visibility
    )
    const opacity = await dropdown.evaluate(
      (el) => getComputedStyle(el).opacity
    )
    expect(visibility).toBe(`hidden`)
    expect(opacity).toBe(`0`)
  })

  test(`filters dropdown to show only matching options when entering text`, async ({
    page,
  }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.fill(`#foods ul input`, `Pineapple`)

    expect(
      await page.$$(`div.multiselect.open > ul.options > li`)
    ).toHaveLength(1)
    const text = await page.textContent(`div.multiselect.open > ul.options`)
    expect(text?.trim()).toBe(`🍍 Pineapple`)
  })
})

test.describe(`remove single button`, async () => {
  test(`should remove 1 option`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`#foods ul input`)
    await page.click(`text=🍌 Banana`)

    await page.click(`button[title='Remove 🍌 Banana']`)

    const selected = await page.$$(
      `div.multiselect > ul.selected > li > button`
    )
    expect(selected.length).toBe(0)
  })
})

test.describe(`remove all button`, async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`div.multiselect`) // open the dropdown
    const ul_options = await page.$(`div.multiselect > ul.options`)
    await ul_options?.waitForElementState(`visible`)
    // select first 2 options since remove-all is only visible if more than 1 option is selected
    await page.click(`div.multiselect > ul.options > li`)
    await page.click(`div.multiselect > ul.options > li`)
  })

  test(`only appears if more than 1 option is selected and removes all selected`, async ({
    page,
  }) => {
    let selected_items = await page.$$(
      `div.multiselect > ul.selected > li > button`
    )
    expect(selected_items).toHaveLength(2)

    // await Promise.all([
    //   await page.waitForEvent(`removeAll`),
    // ])
    await page.click(`button.remove-all`)
    expect(await page.$(`button.remove-all`)).toBeNull() // remove-all button is hidden when nothing selected

    selected_items = await page.$$(
      `div.multiselect > ul.selected > li > button`
    )
    expect(selected_items).toHaveLength(0)
  })

  test(`has custom title`, async ({ page }) => {
    const button_title = await page.getAttribute(`button.remove-all`, `title`)
    expect(await button_title).toBe(`Delete all foods`)
  })

  // TODO: test button emits removeAll event
  // test(`emits removeAll event`, async ({ page }) => {
  //   await page.waitForEvent(`removeAll`),
  // })
})

test.describe(`external CSS classes`, async () => {
  for (const [prop, selector, cls] of [
    [`outerDiv`, `div.multiselect`, `wrapper`],
    [`ulSelected`, `ul.selected`, `user-choices`],
    [`ulOptions`, `ul.options`, `dropdown`],
    [`liOption`, `ul.options > li`, `selectable-li`],
    [`input`, `ul.selected > li > input`, `search-text-input`],
    // below classes requires component interaction before appearing in DOM
    [`liSelected`, `ul.selected > li`, `selected-li`],
    [`liActiveOption`, `ul.options > li.active`, `hovered-or-arrow-keyed-li`],
    [`maxSelectMsg`, `span.max-select-msg`, `user-hint-max-selected-reached`],
  ]) {
    test(`${prop}Class`, async ({ page }) => {
      await page.goto(`/css-classes`, { waitUntil: `networkidle` })

      await page.click(`#foods ul input`)
      await page.hover(`ul.options > li`) // hover any option to give it active state

      const node = await page.$(`${selector}.${cls}`)
      expect(node).toBeTruthy()
    })
  }
})

test.describe(`disabled multiselect`, async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/disabled`, { waitUntil: `networkidle` })
  })

  test(`has attribute aria-disabled`, async ({ page }) => {
    const div = await page.$(`div.multiselect.disabled`)
    expect(await div?.getAttribute(`aria-disabled`)).toBe(`true`)
  })

  test(`has disabled title`, async ({ page }) => {
    const div = await page.$(`div.multiselect.disabled`)
    expect(await div?.getAttribute(`title`)).toBe(
      `Super special disabled message (shows on hover)`
    )
  })

  test(`has input attribute disabled`, async ({ page }) => {
    const input = await page.$(`.disabled > ul.selected > li > input`)
    expect(await input?.isDisabled()).toBe(true)
  })

  test(`renders no buttons`, async ({ page }) => {
    expect(
      await page.$$(`#disabled-input-title div.multiselect button`)
    ).toHaveLength(0)
  })

  test(`renders disabled slot`, async ({ page }) => {
    const span = await page.textContent(`[slot='disabled-icon']`)
    expect(await span).toBe(`This component is disabled. It won't even open.`)
  })
})

test.describe(`accessibility`, async () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })
  })

  test(`input is aria-invalid when component has invalid=true`, async ({
    page,
  }) => {
    // don't interact with component before this test as it will set invalid=false
    const invalid = await page.getAttribute(`#foods ul input`, `aria-invalid`, {
      strict: true,
    })
    expect(invalid).toBe(`true`)
  })

  test(`has aria-expanded='false' when closed`, async ({ page }) => {
    const before = await page.getAttribute(`div.multiselect`, `aria-expanded`, {
      strict: true,
    })
    expect(before).toBe(`false`)
  })

  test(`has aria-expanded='true' when open`, async ({ page }) => {
    await page.click(`div.multiselect`) // open the dropdown
    const after = await page.getAttribute(`div.multiselect`, `aria-expanded`, {
      strict: true,
    })
    expect(after).toBe(`true`)
  })

  test(`options have aria-selected='false' and selected items have aria-selected='true'`, async ({
    page,
  }) => {
    await page.click(`div.multiselect`) // open the dropdown
    await page.click(`div.multiselect > ul.options > li`) // select 1st option
    const aria_option = await page.getAttribute(
      `div.multiselect > ul.options > li`,
      `aria-selected`
    )
    expect(aria_option).toBe(`false`)
    const aria_selected = await page.getAttribute(
      `div.multiselect > ul.selected > li`,
      `aria-selected`
    )
    expect(aria_selected).toBe(`true`)
  })

  test(`invisible input.form-control is aria-hidden`, async ({ page }) => {
    // https://github.com/janosh/svelte-multiselect/issues/58

    const hidden = await page.getAttribute(
      `input.form-control`,
      `aria-hidden`,
      { strict: true }
    )
    expect(hidden).toBe(`true`)
  })
})

test.describe(`multiselect`, async () => {
  test(`can select and remove many options`, async ({ page }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`#foods ul input`)
    for (const idx of [2, 5, 8]) {
      await page.click(`ul.options > li >> nth=${idx}`)
    }

    await page.click(`.remove-all`)

    // repeatedly select 1st option
    for (const idx of [0, 0, 0]) {
      await page.click(`ul.options > li >> nth=${idx}`)
    }

    const selected_text = await page.textContent(
      `div.multiselect > ul.selected`
    )
    for (const food of `Grapes Melon Watermelon`.split(` `)) {
      expect(selected_text).toContain(food)
    }
  })

  // https://github.com/janosh/svelte-multiselect/issues/111
  test(`loops through dropdown list with arrow keys making each option active in turn`, async ({
    page,
  }) => {
    await page.goto(`/ui`, { waitUntil: `networkidle` })

    await page.click(`#foods ul input`)

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

    await page.click(`#languages ul input`)

    await page.click(`text=Haskell >> nth=0`)

    await page.fill(`#languages ul input`, `java`)

    await page.click(`text=JavaScript`)

    await page.reload()

    const selected_text = await page.textContent(`text=4 Haskell 5 JavaScript`)
    expect(selected_text).toContain(`JavaScript`)
    expect(selected_text).toContain(`Haskell`)
  })
})

test.describe(`allowUserOptions`, async () => {
  test(`entering custom option adds it to selected but not to options`, async ({
    page,
  }) => {
    const selector = `#foods ul input`

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
    const selector = `#languages ul input`

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
    const selector = `#languages ul input`

    await page.goto(`/allow-user-options`, { waitUntil: `networkidle` })

    await page.click(selector)

    // enter some search text so no options match, should cause createOptionMsg to be shown
    await page.fill(selector, `foobar`)

    const custom_msg_li = await page.$(
      `text=True polyglots can enter custom languages!`
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
    const selector = `#languages ul input`

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
    const selector = `#no-default-options ul input`

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

test.describe(`sortSelected`, async () => {
  const labels = `Svelte Vue React Angular Polymer Laravel Django`.split(` `)

  test(`default sorting is alphabetical by label`, async ({ page }) => {
    await page.goto(`/sort-selected`, { waitUntil: `networkidle` })

    await page.click(`#default-sort ul input`) // open dropdown

    for (const label of labels) {
      await page.click(`ul.options >> text=${label}`)
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`
    )
    expect(selected?.trim()).toBe(
      `Angular Django Laravel Polymer React Svelte Vue`
    )
  })

  test(`custom sorting`, async ({ page }) => {
    await page.goto(`/sort-selected`, { waitUntil: `networkidle` })

    await page.click(`#custom-sort ul input`) // open dropdown
    for (const label of labels) {
      await page.click(`ul.options:visible >> text=${label}`)
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`
    )
    expect(selected?.trim()).toBe(
      `Angular Polymer React Svelte Vue Laravel Django`
    )
  })
})

test.describe(`parseLabelsAsHtml`, async () => {
  test(`renders anchor tags as links`, async ({ page }) => {
    await page.goto(`/parse-labels-as-html`, { waitUntil: `networkidle` })

    const anchor = await page.$(
      `a[href='https://wikipedia.org/wiki/Red_pill_and_blue_pill']`
    )
    expect(anchor).toBeTruthy()
  })

  test(`to raise error if combined with allowUserOptions`, async ({ page }) => {
    const logs: string[] = []
    page.on(`console`, (msg) => logs.push(msg.text()))

    await page.goto(`/parse-labels-as-html`, { waitUntil: `networkidle` })

    const has_expected_error = logs.some((msg) =>
      msg.includes(
        `Don't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`
      )
    )

    expect(has_expected_error).toBe(true)
  })
})

test.describe(`maxSelect`, async () => {
  const max_select = 5

  test.beforeEach(async ({ page }) => {
    await page.goto(`/min-max-select`, { waitUntil: `networkidle` })
    await page.click(`#languages ul input`)

    // select maxSelect options
    for (const idx of Array(max_select).fill(0)) {
      await page.click(`ul.options > li >> nth=${idx}`)
    }
  })

  test(`options dropdown disappears when reaching maxSelect items`, async ({
    page,
  }) => {
    const ul_selector = `#languages ul.options`
    await wait_for_animation_end(page, ul_selector)

    expect(await page.locator(ul_selector)).toBeHidden()
    expect(await page.getAttribute(ul_selector, `class`)).toContain(`hidden`)
  })

  test(`no more options can be added after reaching maxSelect items`, async ({
    page,
  }) => {
    // query for li[aria-selected=true] to avoid matching the ul.selected > li containing the <input/>
    let selected_lis = await page.$$(`ul.selected > li[aria-selected=true]`)
    expect(selected_lis).toHaveLength(max_select)
    await page.click(`#languages ul input`) // re-open options dropdown
    await page.click(`ul.options > li >> nth=0`)
    selected_lis = await page.$$(`ul.selected > li[aria-selected=true]`)
    expect(selected_lis).toHaveLength(max_select)
  })
})

test.describe(`slots`, async () => {
  test(`renders remove-icon slot for individual remove buttons and the remove-all button`, async ({
    page,
  }) => {
    await page.goto(`/slots`, { waitUntil: `networkidle` })

    const expand_icon = await page.$$(`#languages-1 input + svg`)
    let msg = `custom expand icon slot is not rendered`
    expect(expand_icon, msg).toHaveLength(1)

    // make sure, rendering different expand-icon slot depending on open=true/false works
    // for that, first get d attribute of path inside svg
    const expand_icon_path = await page.$eval(
      `#languages-1 input + svg path`,
      (el) => el.getAttribute(`d`)
    )

    // then click on the expand icon to open the dropdown and change open to true
    await page.click(`#languages-1 input + svg`)
    await wait_for_animation_end(page, `#languages-1 ul.options`)

    // assert that the collapse icon path differs from expand icon path
    const collapse_icon_path = await page.$eval(
      `#languages-1 input + svg path`,
      (el) => el.getAttribute(`d`)
    )
    expect(expand_icon_path).not.toBe(collapse_icon_path)
    // ^^^ expand-icon test done

    const remove_icons = await page.$$(`ul.selected > li > button > svg`)
    msg = `custom remove icon slot is not rendered`
    expect(remove_icons, msg).toHaveLength(3)

    const remove_all_svg = await page.$$(`button.remove-all > svg`)
    msg = `custom remove-all icon slot is not rendered`
    expect(remove_all_svg, msg).toHaveLength(1)
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
