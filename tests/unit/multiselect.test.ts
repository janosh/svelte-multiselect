import MultiSelect, { type MultiSelectEvents } from '$lib'
import { beforeEach, describe, expect, test, vi } from 'vitest'

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

  test(`applies DOM attributes to input node`, () => {
    const options = [1, 2, 3]
    const searchText = `1`
    const id = `fancy-id`
    const autocomplete = `on`
    const name = `fancy-name`
    const placeholder = `fancy placeholder`
    const inputmode = `tel`
    const pattern = `(reg)[ex]`

    new MultiSelect({
      target: document.body,
      props: {
        options,
        searchText,
        id,
        autocomplete,
        placeholder,
        name,
        inputmode,
        pattern,
      },
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
    expect(input?.inputMode).toBe(inputmode)
    expect(input?.pattern).toBe(pattern)
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

  // https://github.com/janosh/svelte-multiselect/issues/111
  test(`arrow down makes first option active`, async () => {
    const options = [`1`, `2`, `3`]

    new MultiSelect({ target: document.body, props: { options, open: true } })

    const input = document.querySelector(`div.multiselect ul.selected input`)
    if (!input) throw new Error(`input not found`)

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))

    await sleep()

    const active_option = document.querySelector(
      `div.multiselect > ul.options > li.active`
    )

    expect(active_option?.textContent?.trim()).toBe(`1`)
  })

  // https://github.com/janosh/svelte-multiselect/issues/112
  test(`can select 1st and last option with arrow and enter key`, async () => {
    const options = [1, 2, 3]

    new MultiSelect({ target: document.body, props: { options } })

    const input = document.querySelector(`div.multiselect ul.selected input`)

    if (!input) throw new Error(`input not found`)

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

  // https://github.com/janosh/svelte-multiselect/issues/119
  test(`invokes callback functions on input node DOM events`, async () => {
    const options = [1, 2, 3]

    const events: [keyof MultiSelectEvents, Event][] = [
      [`blur`, new FocusEvent(`blur`)],
      [`click`, new MouseEvent(`click`)],
      [`focus`, new FocusEvent(`focus`)],
      [`keydown`, new KeyboardEvent(`keydown`, { key: `Enter` })],
      [`keyup`, new KeyboardEvent(`keyup`, { key: `Enter` })],
      [`mouseenter`, new MouseEvent(`mouseenter`)],
      [`mouseleave`, new MouseEvent(`mouseleave`)],
      [`touchend`, new TouchEvent(`touchend`)],
      [`touchmove`, new TouchEvent(`touchmove`)],
      [`touchstart`, new TouchEvent(`touchstart`)],
    ]

    const instance = new MultiSelect({
      target: document.body,
      props: { options },
    })

    const input = document.querySelector(`div.multiselect ul.selected input`)
    if (!input) throw new Error(`input not found`)

    for (const [event_name, event] of events) {
      const callback = vi.fn()
      instance.$on(event_name, callback)

      input.dispatchEvent(event)
      expect(callback, `event type '${event_name}'`).toHaveBeenCalledTimes(1)
      expect(callback, `event type '${event_name}'`).toHaveBeenCalledWith(event)
    }
  })
})
