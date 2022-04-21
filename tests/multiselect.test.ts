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

    await page.click(`input[placeholder='Pick your favorite fruits!']`)

    expect(await page.$(`div.multiselect.open`)).toBeTruthy()
    await page.waitForTimeout(500) // give DOM time to update

    const visibility = await page.$eval(
      `div.multiselect > ul.options`,
      (el) => getComputedStyle(el).visibility
    )
    expect(visibility).toBe(`visible`)
  })

  test(`closes dropdown on tab out`, async () => {
    // note we only test for close on tab out, not on blur since blur should not close in case user
    // clicked anywhere else inside component
    await page.focus(`input[placeholder='Pick your favorite fruits!']`)

    await page.keyboard.press(`Tab`)

    await page.waitForTimeout(500) // give DOM time to update

    const visibility = await page.$eval(
      `div.multiselect > ul.options.hidden`,
      (el) => getComputedStyle(el).visibility
    )
    expect(visibility).toBe(`hidden`)
  })

  test(`filters dropdown to show only matching options when entering text`, async () => {
    await page.fill(
      `input[placeholder='Pick your favorite fruits!']`,
      `Pineapple`
    )

    await page.waitForTimeout(500) // give DOM time to update

    expect(
      await page.$$(`div.multiselect.open > ul.options > li`)
    ).toHaveLength(1)
    const text = await page.textContent(`div.multiselect.open > ul.options`)
    expect(text?.trim()).toBe(`Pineapple`)
  })
})

describe(`remove single button`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  await page.click(`div.multiselect`) // open the dropdown
  await page.click(`div.multiselect > ul.options > li`) // select 1st option

  await page.locator(`input#fruits`).click()

  test(`should remove 1 option`, async () => {
    await page.locator(`text=Banana`).click()

    let selected = await page.$$(`div.multiselect > ul.selected > li > button`)
    expect(selected.length).toBe(1)

    await page.locator(`button[title='Remove Banana']`).click()

    selected = await page.$$(`div.multiselect > ul.selected > li > button`)
    expect(selected.length).toBe(0)
  })
})

describe(`remove all button`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  await page.click(`div.multiselect`) // open the dropdown
  await page.click(`div.multiselect > ul.options > li`) // select 1st option

  test(`only appears if more than 1 option is selected`, async () => {
    expect(await page.$(`button.remove-all`)).toBeNull()
    await page.click(`div.multiselect > ul.options > li`) // select 2nd option
    expect(await page.$(`button.remove-all`)).toBeTruthy()
  })

  test(`has custom title`, async () => {
    const btn = await page.$(`button.remove-all`)
    expect(await btn?.getAttribute(`title`)).toBe(`Delete all fruits`)
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

  await page.click(`div.multiselect`) // open the dropdown
  await page.click(`div.multiselect > ul.options > li`) // select 1st option
  await page.keyboard.press(`ArrowDown`) // make next option active

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
      `input[placeholder='Pick your favorite fruits!']`,
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

    await page.locator(`[placeholder="Pick your favorite fruits!"]`).click()

    for (const option of [`Avocado`, `Cherries`, `Peach`, `Lychee`, `Kiwi`]) {
      await page.locator(`text=${option} >> nth=0`).click()
    }

    await page.locator(`.remove-all`).click()

    for (const option of [`Lime`, `Nectarine`, `Pineapple`]) {
      await page.locator(`text=${option} >> nth=0`).click()
    }
    await page.locator(`text=Lime`).click()

    await page.locator(`text=Nectarine`).click()

    await page.locator(`text=Pineapple`).click()

    await page.locator(`text=Pineapple >> button`).click()

    const selected_text = await page.textContent(
      `div.multiselect > ul.selected`
    )
    for (const fruit of `Nectarine Lime`.split(` `)) {
      expect(selected_text).toContain(fruit)
    }
  })

  test(`retains its selected state on page reload when bound to localStorage`, async () => {
    const page = await context.newPage()
    await page.goto(`/persistent`)

    await page.locator(`input[name="languages"]`).click()

    await page.locator(`text=Haskell >> nth=0`).click()

    await page.locator(`input[name="languages"]`).fill(`java`)

    await page.locator(`text=JavaScript`).click()

    await page.reload()

    await page.waitForTimeout(300)

    const selected_text = await page.textContent(
      `div.multiselect > ul.selected`
    )
    expect(selected_text).toContain(`JavaScript`)
    expect(selected_text).toContain(`Haskell`)
  })
})

describe(`allowUserOptions`, async () => {
  test(`entering custom option adds it to selected but not to options`, async () => {
    const page = await context.newPage()
    const selector = `input[name="fruits"]`

    await page.goto(`/allow-user-options`)

    await page.locator(selector).click()

    await page.locator(selector).fill(`Durian`)

    await page.locator(selector).press(`Enter`)

    const selected_text = await page.textContent(
      `label[for='fruits'] + .multiselect > ul.selected`
    )
    expect(selected_text).toContain(`Durian`)

    const filtered_options = await page.textContent(
      `label[for='fruits'] + .multiselect > ul.options`
    )
    expect(filtered_options).not.toContain(`Durian`)
  })

  test(`entering custom option in append mode adds it to selected
      list and to options in dropdown menu`, async () => {
    // i.e. it remains selectable from the dropdown after removing from selected
    const page = await context.newPage()
    const selector = `input[name="fruits-append"]`

    await page.goto(`/allow-user-options`)

    await page.locator(selector).click()

    await page.locator(selector).fill(`Miracle Berry`)

    await page.locator(selector).press(`Enter`)

    await page.locator(selector).fill(`Miracle Berry`)

    await page.locator(selector).press(`ArrowDown`)

    await page.locator(selector).press(`Enter`)

    const selected_text = await page.textContent(
      `label[for='fruits-append'] + .multiselect > ul.selected`
    )
    expect(selected_text).toContain(`Miracle Berry`)
  })

  test(`shows custom addOptionMsg if no options match`, async () => {
    const page = await context.newPage()
    const selector = `input[name="fruits-append"]`

    await page.goto(`/allow-user-options`)

    await page.locator(selector).click()

    await page.locator(selector).fill(`Foobar Berry`)

    await page.waitForTimeout(500) // give DOM time to update

    const selected_text = await page.textContent(
      `label[for='fruits-append'] + .multiselect > ul.options`
    )
    expect(selected_text).toContain(`Add this custom fruit at your own risk!`)
  })
})

describe(`sortSelected`, async () => {
  const labels = `Svelte Vue React Angular Polymer Laravel Django`.split(` `)

  test(`default sorting is alphabetical by label`, async () => {
    const page = await context.newPage()

    await page.goto(`/sort-selected`)

    await page.locator(`input[name="default-sort"]`).click() // open dropdown

    for (const label of labels) {
      await page.locator(`css=.multiselect.open >> text=${label}`).click()
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`
    )
    expect(selected?.trim()).toBe(
      `Angular Django Laravel Polymer React Svelte Vue`
    )
  })

  test(`custom sorting`, async () => {
    const page = await context.newPage()

    await page.goto(`/sort-selected`)

    await page.locator(`input[name="custom-sort"]`).click() // open dropdown

    for (const label of labels) {
      await page.locator(`css=.multiselect.open >> text=${label}`).click()
    }

    const selected = await page.textContent(
      `div.multiselect.open > ul.selected`
    )
    expect(selected?.trim()).toBe(
      `Angular Polymer React Svelte Vue Laravel Django`
    )
  })
})
