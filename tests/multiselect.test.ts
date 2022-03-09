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
  await page.goto(`/ux`)

  test(`focus opens dropdown`, async () => {
    expect(await page.$(`.multiselect > ul.options.hidden`)).toBeTruthy()
    expect(await page.$(`.multiselect.open`)).toBeNull()

    await page.click(`input[placeholder='Pick your favorite fruits']`)

    expect(await page.$(`.multiselect.open`)).toBeTruthy()
  })

  test(`filters to show only matching options when typing search text`, async () => {
    await page.fill(
      `input[placeholder='Pick your favorite fruits']`,
      `Pineapple`
    )

    await page.waitForTimeout(300) // give DOM time to update

    expect(await page.$$(`.multiselect.open > ul.options > li`)).toHaveLength(1)
    const text = await page.textContent(`.multiselect.open > ul.options > li`)
    expect(text?.trim()).toBe(`Pineapple`)
  })
})

describe(`remove all button`, async () => {
  const page = await context.newPage()
  await page.goto(`/ux`)

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

  for (const [className, selector] of [
    [`outerDivClass`, `div.multiselect`],
    [`ulSelectedClass`, `div.multiselect > ul.selected`],
    [`ulOptionsClass`, `div.multiselect > ul.options`],
    [`liOptionClass`, `div.multiselect > ul.options > li`],
    // below classes requires component interaction before appearing in DOM
    [`liSelectedClass`, `div.multiselect > ul.selected > li`],
    [`liActiveOptionClass`, `div.multiselect > ul.options > li.active`],
  ]) {
    test(`${className} attaches to correct DOM node`, async () => {
      const node = await page.$(`${selector}.test-${className}`)
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
