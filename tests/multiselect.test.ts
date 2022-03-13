import * as playwright from 'playwright'
import { describe, expect, test } from 'vitest'

type browser_kind = 'chromium' | 'firefox' | 'webkit'
const BROWSER = (process.env.BROWSER ?? `chromium`) as browser_kind

const port = process.env.PORT ?? 3000

const headful = process.env.HEADFUL
const headful_config = {
  headless: false,
  slowMo: 1000,
}

const browser = await playwright[BROWSER].launch(headful ? headful_config : {})
const context = await browser.newContext({
  baseURL: `http://localhost:${port}`,
})

describe(`input`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  test(`opens dropdown on focus`, async () => {
    expect(await page.$(`.multiselect > ul.options.hidden`)).toBeTruthy()
    expect(await page.$(`.multiselect.open`)).toBeNull()

    await page.click(`input[placeholder='Pick your favorite fruits']`)

    expect(await page.$(`.multiselect.open`)).toBeTruthy()
    await page.waitForTimeout(500) // give DOM time to update

    const visibility = await page.$eval(
      `.multiselect > ul.options`,
      (el) => getComputedStyle(el).visibility
    )
    expect(visibility).toBe(`visible`)
  })

  test(`closes dropdown on blur`, async () => {
    await page.$eval(`input[placeholder='Pick your favorite fruits']`, (el) =>
      el.blur()
    )
    await page.waitForTimeout(500) // give DOM time to update

    const visibility = await page.$eval(
      `.multiselect > ul.options`,
      (el) => getComputedStyle(el).visibility
    )
    expect(visibility).toBe(`hidden`)
  })

  test(`filters dropdown to show only matching options when entering text`, async () => {
    await page.fill(
      `input[placeholder='Pick your favorite fruits']`,
      `Pineapple`
    )

    await page.waitForTimeout(500) // give DOM time to update

    expect(await page.$$(`.multiselect.open > ul.options > li`)).toHaveLength(1)
    const text = await page.textContent(`.multiselect.open > ul.options > li`)
    expect(text?.trim()).toBe(`Pineapple`)
  })
})

describe(`remove all button`, async () => {
  const page = await context.newPage()
  await page.goto(`/ui`)

  await page.click(`.multiselect`) // open the dropdown
  await page.click(`.multiselect > ul.options > li`) // select 1st option

  test(`only appears if more than 1 option is selected`, async () => {
    expect(await page.$(`button.remove-all`)).toBeNull()
    await page.click(`.multiselect > ul.options > li`) // select 2nd option
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
    await page.click(`.multiselect > button.remove-all`)
    const selected = await page.$$(`.multiselect > ul.selected > li > button`)
    expect(selected.length).toBe(0)
  })
})

describe(`external CSS classes`, async () => {
  const page = await context.newPage()
  await page.goto(`/css-classes`)

  await page.click(`.multiselect`) // open the dropdown
  await page.click(`.multiselect > ul.options > li`) // select 1st option
  await page.keyboard.press(`ArrowDown`) // make next option active

  for (const [prop, selector, cls] of [
    [`outerDivClass`, `div.multiselect`, `foo`],
    [`ulSelectedClass`, `div.multiselect > ul.selected`, `bar`],
    [`ulOptionsClass`, `div.multiselect > ul.options`, `baz`],
    [`liOptionClass`, `div.multiselect > ul.options > li`, `bam`],
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
  const div = await page.$(`.multiselect.disabled`)

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

  test(`has aria-expanded='true' after user interaction`, async () => {
    const before = await page.getAttribute(`.multiselect`, `aria-expanded`, {
      strict: true,
    })
    expect(before).toBe(`false`)
  })

  test(`has aria-expanded='true' after click`, async () => {
    await page.click(`.multiselect`) // open the dropdown
    await page.click(`.multiselect > ul.options > li`) // select 1st option
    const after = await page.getAttribute(`.multiselect`, `aria-expanded`, {
      strict: true,
    })
    expect(after).toBe(`true`)
  })
})
