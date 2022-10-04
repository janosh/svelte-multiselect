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
    const options = [1, 2, 3].map((el) => ({
      label: el,
      value: el,
      disabled: true,
      disabledTitle: el > 1 ? undefined : special_disabled_title,
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
    const options = [1, 2, 3]

    new MultiSelect({
      target: document.body,
      props: { removeAllTitle, removeBtnTitle, options, selected: options },
    })
    const remove_all_btn = document.querySelector(
      `div.multiselect button.remove-all`
    ) as HTMLButtonElement
    const remove_btns = document.querySelectorAll(
      `div.multiselect > ul.selected > li > button`
    )

    expect(remove_all_btn.title).toBe(removeAllTitle)
    expect([...remove_btns].map((btn) => btn.title)).toEqual(
      options.map((op) => `${removeBtnTitle} ${op}`)
    )
  })

  test(`applies DOM attributes to input node`, () => {
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
        options: [1, 2, 3],
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
    const css_classes = {
      input: HTMLInputElement,
      liOption: HTMLLIElement,
      liSelected: HTMLLIElement,
      outerDiv: HTMLDivElement,
      ulOptions: HTMLUListElement,
      ulSelected: HTMLUListElement,
    }
    const prop_classes = Object.fromEntries(
      Object.keys(css_classes).map((cls) => [`${cls}Class`, cls])
    )

    new MultiSelect({
      target: document.body,
      // select 1 to make sure the selected list is rendered
      props: { options: [1, 2, 3], ...prop_classes, selected: [1] },
    })

    // TODO also test liActiveOptionClass once figured out how to make an option active
    // this doesn't work for unknown reasons
    // document
    //   .querySelector(`div.multiselect > ul.options > li`)
    //   ?.dispatchEvent(new Event(`mouseover`, { bubbles: true }))

    for (const [class_name, elem_type] of Object.entries(css_classes)) {
      const el = document.querySelector(`.${class_name}`)

      expect(
        el,
        `did not find an element for ${class_name}Class`
      ).toBeInstanceOf(elem_type)
    }
  })

  // https://github.com/janosh/svelte-multiselect/issues/111
  test(`arrow down makes first option active`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], open: true },
    })

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
    new MultiSelect({ target: document.body, props: { options: [1, 2, 3] } })

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

  test(`selected is a single option (not length-1 array) when maxSelect=1`, async () => {
    const options = [1, 2, 3]

    const instance = new MultiSelect({
      target: document.body,
      props: { options, maxSelect: 1, selected: options },
    })

    const selected = instance.$$.ctx[instance.$$.props.selected]

    // this also tests that only 1st option is preselected although all options are marked such
    expect(selected).toBe(options[0])
  })

  test(`selected is null when maxSelect=1 and no option is preselected`, async () => {
    const instance = new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], maxSelect: 1 },
    })

    const selected = instance.$$.ctx[instance.$$.props.selected]

    expect(selected).toBe(null)
  })

  test(`selected is array of first two options when maxSelect=2`, async () => {
    // even though all options have preselected=true
    const options = [1, 2, 3].map((itm) => ({
      label: itm,
      value: itm,
      preselected: true,
    }))

    const instance = new MultiSelect({
      target: document.body,
      props: { options, maxSelect: 2 },
    })

    const selected = instance.$$.ctx[instance.$$.props.selected]

    expect(selected).toEqual(options.slice(0, 2))
  })

  test.each([null, [], undefined])(
    `required but empty MultiSelect makes form not pass validity check`,
    async (selected) => {
      // not passing validity check means form won't submit (but dispatching
      // submit and checking event.defaultPrevented is true seems harder to test)

      const form = document.createElement(`form`)
      document.body.appendChild(form)

      new MultiSelect({
        target: form,
        props: { options: [1, 2, 3], required: true, selected },
      })

      expect(form.checkValidity()).toBe(false)
    }
  )

  test(`required and non-empty MultiSelect makes form pass validity check`, async () => {
    const form = document.createElement(`form`)
    document.body.appendChild(form)

    new MultiSelect({
      target: form,
      props: { options: [1, 2, 3], required: true, selected: [1] },
    })

    expect(form.checkValidity()).toBe(true)
  })

  test(`input is aria-invalid when component has invalid=true`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], invalid: true },
    })

    const input = document.querySelector(`div.multiselect ul.selected input`)
    if (!input) throw new Error(`input not found`)

    expect(input.getAttribute(`aria-invalid`)).toBe(`true`)
  })

  test(`parseLabelsAsHtml renders anchor tags as links`, async () => {
    new MultiSelect({
      target: document.body,
      props: {
        options: [`<a href="https://example.com">example.com</a>`],
        parseLabelsAsHtml: true,
      },
    })

    const anchor = document.querySelector(`a[href='https://example.com']`)
    expect(anchor).toBeInstanceOf(HTMLAnchorElement)
  })

  test(`filters dropdown to show only matching options when entering text`, async () => {
    const options = [`foo`, `bar`, `baz`]

    new MultiSelect({
      target: document.body,
      props: { options },
    })

    const input = document.querySelector(`div.multiselect ul.selected input`)
    if (!input) throw new Error(`input not found`)

    input.value = `ba`
    input.dispatchEvent(new InputEvent(`input`))
    await sleep()

    const dropdown = document.querySelector(`div.multiselect ul.options`)
    expect(dropdown?.textContent?.trim()).toBe(`bar baz`)
  })
})
