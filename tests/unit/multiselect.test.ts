import MultiSelect from '$lib'
import { beforeEach, describe, expect, test } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ``
})

async function sleep(ms: number = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe(`MultiSelect`, () => {
  test(`defaultDisabledTitle and custom per-option disabled titles are applied correctly`, () => {
    const defaultDisabledTitle = `Not selectable`
    const special_disabled_title = `Special disabled title`
    const options = [0, 1, 2].map((el) => ({
      label: el,
      value: el,
      disabled: true,
      disabledTitle: el ? undefined : special_disabled_title,
    }))

    new MultiSelect({
      target: document.body,
      props: { options, defaultDisabledTitle },
    })

    const lis = document.querySelectorAll(`div.multiselect > ul.options > li`)

    expect(lis.length).toBe(3)

    expect([...lis].map((li) => li.title)).toEqual([
      special_disabled_title,
      defaultDisabledTitle,
      defaultDisabledTitle,
    ])
  })

  test(`removeAllTitle and removeBtnTitle are applied correctly`, () => {
    const removeAllTitle = `Custom remove all title`
    const removeBtnTitle = `Custom remove button title`
    const options = [1, 2, 3].map((itm) => ({
      label: itm,
      value: itm,
      preselected: true,
    }))

    new MultiSelect({
      target: document.body,
      props: { removeAllTitle, removeBtnTitle, options },
    })
    const remove_all_btn = document.querySelector(
      `div.multiselect button.remove-all`
    ) as HTMLButtonElement
    const remove_btns = document.querySelectorAll(
      `div.multiselect > ul.selected > li > button`
    )

    expect(remove_all_btn.title).toBe(removeAllTitle)
    expect([...remove_btns].map((btn) => btn.title)).toEqual(
      options.map((op) => `${removeBtnTitle} ${op.label}`)
    )
  })

  test(`applies id, value, autocomplete, name, placeholder to input`, () => {
    const options = [1, 2, 3]
    const searchText = `1`
    const id = `fancy-id`
    const autocomplete = `on`
    const name = `fancy-name`
    const placeholder = `fancy placeholder`

    new MultiSelect({
      target: document.body,
      props: { options, searchText, id, autocomplete, placeholder, name },
    })

    const lis = document.querySelectorAll(`div.multiselect > ul.options > li`)
    const input = document.querySelector(
      `div.multiselect ul.selected input`
    ) as HTMLInputElement

    // make sure the search text filtered the dropdown options
    expect(lis.length).toBe(1)

    expect(input?.value).toBe(searchText)
    expect(input?.id).toBe(id)
    expect(input?.autocomplete).toBe(autocomplete)
    expect(input?.placeholder).toBe(placeholder)
    expect(input?.name).toBe(name)
  })

  test(`applies custom classes for styling through CSS frameworks`, () => {
    const options = [1, 2, 3].map((itm, idx) => ({
      label: itm,
      value: itm,
      preselected: Boolean(idx),
    }))
    const classes = Object.fromEntries(
      `input liOption liSelected outerDiv ulOptions ulSelected`
        .split(` `)
        .map((cls) => [`${cls}Class`, cls])
    )

    new MultiSelect({
      target: document.body,
      props: { options, ...classes },
    })

    // TODO also test liActiveOptionClass once figured out how to make an option active
    // this doesn't work for unknown reasons
    // document
    //   .querySelector(`div.multiselect > ul.options > li`)
    //   ?.dispatchEvent(new Event(`mouseover`, { bubbles: true }))

    for (const class_name of Object.values(classes)) {
      const el = document.querySelector(`.${class_name}`)

      expect(el, `did not find an element for ${class_name}Class`).toBeTruthy()
    }
  })

  test(`arrow down makes first option active`, async () => {
    const options = [1, 2, 3]

    new MultiSelect({
      target: document.body,
      props: { options, open: true },
    })

    const input = document.querySelector(
      `div.multiselect ul.selected input`
    ) as HTMLInputElement

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))

    await sleep()

    const active_option = document.querySelector(
      `div.multiselect > ul.options > li.active`
    )

    expect(active_option?.textContent?.trim()).toBe(`1`)
  })

  test(`can select 1st and last option with arrow and enter key`, async () => {
    const options = [1, 2, 3]

    new MultiSelect({
      target: document.body,
      props: { options },
    })

    const input = document.querySelector(
      `div.multiselect ul.selected input`
    ) as HTMLInputElement

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
    await sleep()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter` }))
    await sleep()
    const selected = document.querySelector(`div.multiselect > ul.selected`)

    expect(selected?.textContent?.trim()).toBe(`1`)

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowUp` }))
    await sleep()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter` }))
    await sleep()

    expect(selected?.textContent?.trim()).toBe(`1 3`)
  })
})
