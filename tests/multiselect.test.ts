import * as playwright from 'playwright'
import { describe, expect, test } from 'vitest'

const vendor = (process.env.BROWSER ?? `chromium`) as
  | 'chromium'
  | 'firefox'
  | 'webkit'

const port = process.env.PORT ?? 3000

const headful = process.env.HEADFUL
const headful_config = {
  headless: false,
  slowMo: 1000,
}

const browser = await playwright[vendor].launch(headful ? headful_config : {})
const context = await browser.newContext({
  baseURL: `http://localhost:${port}`,
})

describe(`input`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  test(`opens dropdown on focus`, async () => {
    expect(await page.$(`div.multiselect > ul.options.hidden`)).toBeTruthy()
    expect(await page.$(`div.multiselect.open`)).toBeNull()

    await page.click(`input[id='foods']`)

    expect(await page.$(`div.multiselect.open > ul.options.hidden`)).toBeNull()

    const visible_dropdown = await page.waitForSelector(
      `div.multiselect.open > ul.options:visible`
    )
    expect(visible_dropdown).toBeTruthy()
  })

  test(`closes dropdown on tab out`, async () => {
    // note we only test for close on tab out, not on blur since blur should not close in case user
    // clicked anywhere else inside component
    await page.focus(`input[id='foods']`)

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

  test(`filters dropdown to show only matching options when entering text`, async () => {
    await page.fill(`input[id='foods']`, `Pineapple`)

    expect(
      await page.$$(`div.multiselect.open > ul.options > li`)
    ).toHaveLength(1)
    const text = await page.textContent(`div.multiselect.open > ul.options`)
    expect(text?.trim()).toBe(`🍍 Pineapple`)
  })
})

describe(`remove single button`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  await page.click(`input#foods`)

  test(`should remove 1 option`, async () => {
    await page.click(`text=🍌 Banana`)

    await page.click(`button[title='Remove 🍌 Banana']`)

    const selected = await page.$$(
      `div.multiselect > ul.selected > li > button`
    )
    expect(selected.length).toBe(0)
  })
})

describe(`remove all button`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  await page.click(`div.multiselect`) // open the dropdown
  const ul_options = await page.$(`div.multiselect > ul.options`)
  await ul_options?.waitForElementState(`visible`)
  await page.click(`div.multiselect > ul.options > li`) // select 1st option

  test(`only appears if more than 1 option is selected`, async () => {
    expect(await page.$(`button.remove-all`)).toBeNull()
    await page.click(`div.multiselect > ul.options > li`) // select next 1st option
    expect(await page.$(`button.remove-all`)).toBeTruthy()
  })

  test(`has custom title`, async () => {
    const btn = await page.$(`button.remove-all`)
    expect(await btn?.getAttribute(`title`)).toBe(`Delete all foods`)
  })

  // TODO: test button emits removeAll event
  // test(`emits removeAll event`, async () => {
  //   await page.waitForEvent(`removeAll`)
  // })

  test(`should remove all selected options`, async () => {
    await page.click(`div.multiselect > button.remove-all`)
    const selected = await page.$$(
      `div.multiselect > ul.selected > li > button`
    )
    expect(selected.length).toBe(0)
  })
})

describe(`external CSS classes`, async () => {
  const page = await context.newPage()
  await page.goto(`/css-classes`)

  const ul_options = await page.$(`div.multiselect > ul.options`)
  await page.click(`input#foods`)
  await ul_options?.waitForElementState(`visible`)

  await page.hover(`text=🍌 Banana`) // hover any option to give it active state (can also use arrow keys)

  for (const [prop, selector, cls] of [
    [`outerDivClass`, `div.multiselect`, `foo`],
    [`ulSelectedClass`, `div.multiselect > ul.selected`, `bar`],
    [`ulOptionsClass`, `div.multiselect > ul.options`, `baz`],
    [`liOptionClass`, `div.multiselect > ul.options > li`, `bam`],
    [`inputClass`, `div.multiselect > ul.selected > li > input`, `slam`],
    // below classes requires component interaction before appearing in DOM
    [`liSelectedClass`, `div.multiselect > ul.selected > li`, `hi`],
    [`liActiveOptionClass`, `div.multiselect > ul.options > li.active`, `mom`],
  ]) {
    test(`${prop} attaches to correct DOM node`, async () => {
      const node = await page.$(`${selector}.${cls}`)
      expect(node).toBeTruthy()
    })
  }
})

describe(`disabled multiselect`, async () => {
  const page = await context.newPage()
  await page.goto(`/disabled`)
  const div = await page.$(`div.multiselect.disabled`)

  test(`has attribute aria-disabled`, async () => {
    expect(await div?.getAttribute(`aria-disabled`)).to.equal(`true`)
  })

  test(`has disabled title`, async () => {
    expect(await div?.getAttribute(`title`)).to.equal(
      `Super special disabled message`
    )
  })

  test(`has input attribute disabled`, async () => {
    const input = await page.$(`.disabled > ul.selected > li > input`)
    expect(await input?.isDisabled()).to.equal(true)
  })

  test(`renders no buttons`, async () => {
    expect(await page.$$(`button`)).toHaveLength(0)
  })

  test(`renders disabled slot`, async () => {
    const span = await page.textContent(`[slot='disabled-icon']`)
    expect(await span).toBe(`This component is disabled. Get outta here!`)
  })
})

describe(`accessibility`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  test(`input is aria-invalid when component has invalid=true`, async () => {
    // don't interact with component before this test as it will set invalid=false
    const invalid = await page.getAttribute(
      `input[id='foods']`,
      `aria-invalid`,
      { strict: true }
    )
    expect(invalid).toBe(`true`)
  })

  test(`has aria-expanded='false' when closed`, async () => {
    const before = await page.getAttribute(`div.multiselect`, `aria-expanded`, {
      strict: true,
    })
    expect(before).toBe(`false`)
  })

  test(`has aria-expanded='true' when open`, async () => {
    await page.click(`div.multiselect`) // open the dropdown
    const after = await page.getAttribute(`div.multiselect`, `aria-expanded`, {
      strict: true,
    })
    expect(after).toBe(`true`)
  })

  test(`options have aria-selected='false' and selected items have aria-selected='true'`, async () => {
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

  test(`invisible input.form-control is aria-hidden`, async () => {
    // https://github.com/janosh/svelte-multiselect/issues/58

    const hidden = await page.getAttribute(
      `input.form-control`,
      `aria-hidden`,
      { strict: true }
    )
    expect(hidden).toBe(`true`)
  })
})

describe(`multiselect`, async () => {
  test(`can select and remove many options`, async () => {
    const page = await context.newPage()
    await page.goto(`/ui`)

    await page.click(`[placeholder="Pick your favorite foods!"]`)

    for (const idx of [2, 5, 8]) {
      await page.click(`ul.options >> li >> nth=${idx}`)
    }

    await page.click(`.remove-all`)

    // repeatedly select 1st option
    for (const idx of [0, 0, 0]) {
      await page.click(`ul.options >> li >> nth=${idx}`)
    }

    const selected_text = await page.textContent(
      `div.multiselect > ul.selected`
    )
    for (const food of `Grapes Melon Watermelon`.split(` `)) {
      expect(selected_text).toContain(food)
    }
  })

  test(`retains its selected state on page reload when bound to localStorage`, async () => {
    const page = await context.newPage()
    await page.goto(`/persistent`)

    await page.click(`input#languages`)

    await page.click(`text=Haskell >> nth=0`)

    await page.fill(`input#languages`, `java`)

    await page.click(`text=JavaScript`)

    await page.reload()

    const selected_text = await page.textContent(`text=Haskell JavaScript`)
    expect(selected_text).toContain(`JavaScript`)
    expect(selected_text).toContain(`Haskell`)
  })
})

describe(`allowUserOptions`, async () => {
  test(`entering custom option adds it to selected but not to options`, async () => {
    const page = await context.newPage()
    const selector = `input#foods`

    await page.goto(`/allow-user-options`)

    await page.click(selector)

    await page.fill(selector, `Durian`)

    await page.press(selector, `Enter`)

    const li_selected_handle = await page.$(
      `div.multiselect > ul.selected >> :has-text("Durian")`
    )

    expect(li_selected_handle).toBeTruthy()

    await page.fill(selector, `Durian`)

    const li_option_handle = await page.$(
      `div.multiselect > ul.option >> :has-text("Durian")`
    )
    expect(li_option_handle).toBeNull()
  })

  test(`entering custom option in append mode adds it to selected
      list _and_ to options in dropdown menu`, async () => {
    // i.e. it remains selectable from the dropdown after removing from selected
    const page = await context.newPage()
    const selector = `input#languages`

    await page.goto(`/allow-user-options`)

    await page.click(selector)

    await page.fill(selector, `foobar`)

    await page.press(selector, `Enter`) // create custom option
    await page.press(selector, `Backspace`) // remove custom option from selected items

    await page.fill(selector, `foobar`) // filter dropdown options to only show custom one

    await page.click(`ul.options > li:has-text('foobar')`)

    const ul_selected = await page.$(`ul.selected > li:has-text('foobar')`)
    expect(ul_selected).toBeTruthy()
  })

  test(`shows custom addOptionMsg if no options match`, async () => {
    const page = await context.newPage()
    const selector = `input#languages`

    await page.goto(`/allow-user-options`)

    await page.click(selector)

    await page.fill(selector, `foobar`)

    const custom_msg_li = await page.$(
      `text='True polyglots can enter custom languages!'`
    )
    expect(custom_msg_li).toBeTruthy()
  })
})

describe(`sortSelected`, async () => {
  const labels = `Svelte Vue React Angular Polymer Laravel Django`.split(` `)

  const page = await context.newPage()
  await page.goto(`/sort-selected`)

  test(`default sorting is alphabetical by label`, async () => {
    await page.click(`input#default-sort`) // open dropdown

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

  test(`custom sorting`, async () => {
    await page.click(`input#custom-sort`) // open dropdown

    for (const label of labels) {
      await page.click(`ul.options >> text=${label}`)
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`
    )
    expect(selected?.trim()).toBe(
      `Angular Polymer React Svelte Vue Laravel Django`
    )
  })
})

describe(`parseLabelsAsHtml`, async () => {
  test(`renders anchor tags as links`, async () => {
    const page = await context.newPage()

    await page.goto(`/parse-labels-as-html`)

    const anchor = await page.$(
      `a[href='https://wikipedia.org/wiki/Red_pill_and_blue_pill']`
    )
    expect(anchor).toBeTruthy()
  })

  // TODO: fix test, expected error msg not recorded by page.on(`console`) for unknown reason
  // even though it's there when opening page in browser
  test.skip(`to raise error if combined with allowUserOptions`, async () => {
    const page = await context.newPage()
    const logs: string[] = []
    page.on(`console`, (msg) => logs.push(msg.text()))

    await page.goto(`/parse-labels-as-html`)

    const has_expected_error = logs.some((msg) =>
      msg.includes(
        `You shouldn't combine parseLabelsAsHtml and allowUserOptions. It's susceptible to XSS attacks!`
      )
    )

    expect(has_expected_error).toBe(true)
  })
})
