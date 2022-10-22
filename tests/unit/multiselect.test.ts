import MultiSelect, { type MultiSelectEvents } from '$lib'
import { beforeEach, describe, expect, test, vi } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ``
})

async function sleep(ms: number = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function doc_query(selector: string) {
  const res = document.querySelector(selector)
  if (!res) throw new Error(`No element found for selector: ${selector}`)
  return res
}

describe(`MultiSelect`, () => {
  test(`defaultDisabledTitle and custom per-option disabled titles are applied correctly`, () => {
    const defaultDisabledTitle = `Not selectable`
    const special_disabled_title = `Special disabled title`
    const options = [1, 2, 3].map((el) => ({
      label: el,
      disabled: true,
      disabledTitle: el > 1 ? undefined : special_disabled_title,
    }))

    new MultiSelect({
      target: document.body,
      props: { options, defaultDisabledTitle },
    })

    const lis = document.querySelectorAll(`ul.options > li`)

    expect(lis.length).toBe(3)

    expect([...lis].map((li) => li.title)).toEqual([
      special_disabled_title,
      defaultDisabledTitle,
      defaultDisabledTitle,
    ])
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

    const lis = document.querySelectorAll(`ul.options > li`)
    const input = doc_query(`ul.selected input`) as HTMLInputElement

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
    //   .querySelector(`ul.options > li`)
    //   ?.dispatchEvent(new Event(`mouseover`, { bubbles: true }))

    for (const [class_name, elem_type] of Object.entries(css_classes)) {
      const el = doc_query(`.${class_name}`)

      expect(el).toBeInstanceOf(elem_type)
    }
  })

  // https://github.com/janosh/svelte-multiselect/issues/111
  test(`arrow down makes first option active`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], open: true },
    })

    const input = doc_query(`ul.selected input`)

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))

    await sleep()

    const active_option = doc_query(`ul.options > li.active`)

    expect(active_option.textContent?.trim()).toBe(`1`)
  })

  // https://github.com/janosh/svelte-multiselect/issues/112
  test(`can select 1st and last option with arrow and enter key`, async () => {
    new MultiSelect({ target: document.body, props: { options: [1, 2, 3] } })

    const input = doc_query(`ul.selected input`)

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
    await sleep()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter` }))
    await sleep()
    const selected = doc_query(`div.multiselect > ul.selected`)

    expect(selected.textContent?.trim()).toBe(`1`)

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowUp` }))
    await sleep()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter` }))
    await sleep()

    expect(selected.textContent?.trim()).toBe(`1 3`)
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

    const input = doc_query(`ul.selected input`)

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

  test(`div has 'invalid' class and input is aria-invalid when invalid=true`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], invalid: true },
    })

    const input = doc_query(`ul.selected input`)

    expect(input.getAttribute(`aria-invalid`)).toBe(`true`)
    const multiselect = doc_query(`div.multiselect`)
    expect(multiselect.classList.contains(`invalid`)).toBe(true)

    // assert aria-invalid attribute is removed on selecting a new option
    const option = doc_query(`ul.options > li`)
    option.dispatchEvent(new Event(`mouseup`))
    await sleep()

    expect(input.getAttribute(`aria-invalid`)).toBe(null)

    // assert div.multiselect no longer has invalid class
    expect(multiselect.classList.contains(`invalid`)).toBe(false)
  })

  test(`parseLabelsAsHtml renders anchor tags as links`, async () => {
    new MultiSelect({
      target: document.body,
      props: {
        options: [`<a href="https://example.com">example.com</a>`],
        parseLabelsAsHtml: true,
      },
    })

    const anchor = doc_query(`a[href='https://example.com']`)
    expect(anchor).toBeInstanceOf(HTMLAnchorElement)
  })

  test(`filters dropdown to show only matching options when entering text`, async () => {
    const options = [`foo`, `bar`, `baz`]

    new MultiSelect({
      target: document.body,
      props: { options },
    })

    const input = doc_query(`ul.selected input`)

    input.value = `ba`
    input.dispatchEvent(new InputEvent(`input`))
    await sleep()

    const dropdown = doc_query(`div.multiselect ul.options`)
    expect(dropdown.textContent?.trim()).toBe(`bar baz`)
  })

  // test default case and custom message
  test.each([undefined, `Custom no options message`])(
    `shows noMatchingOptionsMsg when no options match searchText`,
    async (noMatchingOptionsMsg) => {
      const select = new MultiSelect({
        target: document.body,
        props: { options: [1, 2, 3], noMatchingOptionsMsg },
      })

      const input = doc_query(`ul.selected input`)

      input.value = `4`
      input.dispatchEvent(new InputEvent(`input`))
      await sleep()

      if (noMatchingOptionsMsg === undefined) {
        // get default value for noMatchingOptionsMsg
        noMatchingOptionsMsg =
          select.$$.ctx[select.$$.props.noMatchingOptionsMsg]
      }

      const dropdown = doc_query(`div.multiselect ul.options`)
      expect(dropdown.textContent?.trim()).toBe(noMatchingOptionsMsg)
    }
  )

  test(`single remove button removes 1 selected option`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], selected: [1, 2, 3] },
    })

    document
      .querySelector(`div.multiselect ul.selected button[title='Remove 1']`)
      ?.dispatchEvent(new Event(`mouseup`))

    const selected = doc_query(`div.multiselect ul.selected`)
    await sleep()

    expect(selected.textContent?.trim()).toEqual(`2 3`)
  })

  test(`remove all button removes all selected options and is visible only if more than 1 option is selected`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], selected: [1, 2, 3] },
    })
    let selected = doc_query(`div.multiselect ul.selected`)
    expect(selected.textContent?.trim()).toEqual(`1 2 3`)

    document
      .querySelector(`button[title='Remove all']`)
      ?.dispatchEvent(new Event(`mouseup`))
    await sleep()

    selected = doc_query(`div.multiselect ul.selected`)
    expect(selected.textContent?.trim()).toEqual(``)

    // select 2 options
    for (const _ of [1, 2]) {
      expect(
        document.querySelector(`button[title='Remove all']`),
        `remove all button should only appear if more than 1 option is selected`
      ).toBeNull()

      const li = doc_query(`div.multiselect ul.options li`)
      li.dispatchEvent(new Event(`mouseup`))
      await sleep()
    }

    expect(doc_query(`button[title='Remove all']`)).toBeInstanceOf(
      HTMLButtonElement
    )
  })

  test(`removeAllTitle and removeBtnTitle are applied correctly`, () => {
    const removeAllTitle = `Custom remove all title`
    const removeBtnTitle = `Custom remove button title`
    const options = [1, 2, 3]

    new MultiSelect({
      target: document.body,
      props: { removeAllTitle, removeBtnTitle, options, selected: options },
    })
    const remove_all_btn = doc_query(`button.remove-all`) as HTMLButtonElement
    const remove_btns = document.querySelectorAll(
      `div.multiselect > ul.selected > li > button`
    )

    expect(remove_all_btn.title).toBe(removeAllTitle)
    expect([...remove_btns].map((btn) => btn.title)).toEqual(
      options.map((op) => `${removeBtnTitle} ${op}`)
    )
  })

  test(`can't select disabled options`, async () => {
    const options = [1, 2, 3].map((el) => ({
      label: el,
      disabled: el === 1,
    }))
    new MultiSelect({ target: document.body, props: { options } })

    for (const li of document.querySelectorAll(`ul.options > li`)) {
      li.dispatchEvent(new MouseEvent(`mouseup`))
    }

    const selected = doc_query(`div.multiselect ul.selected`)
    await sleep()

    expect(selected.textContent?.trim()).toEqual(`2 3`)
  })

  test.each([2, 5, 10])(
    `cant select more than maxSelect options`,
    async (maxSelect: number) => {
      new MultiSelect({
        target: document.body,
        props: { options: [...Array(10).keys()], maxSelect },
      })

      document
        .querySelectorAll(`ul.options > li`)
        ?.forEach((li) => li.dispatchEvent(new MouseEvent(`mouseup`)))

      const selected = doc_query(`div.multiselect ul.selected`)
      await sleep()

      expect(selected.textContent?.trim()).toEqual(
        [...Array(maxSelect).keys()].join(` `)
      )
    }
  )

  test(`closes dropdown on tab out`, async () => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3] },
    })
    // starts with closed dropdown
    expect(doc_query(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)

    // opens dropdown on focus
    doc_query(`ul.selected input`).focus()
    await sleep()
    expect(document.querySelector(`ul.options.hidden`)).toBeNull()

    // closes dropdown again on tab out
    doc_query(`ul.selected input`).dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Tab` })
    )
    await sleep()
    expect(doc_query(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)
  })

  describe.each([
    [[`1`, `2`, `3`], [`1`]], // test string options
    [[1, 2, 3], [1]], // test number options
  ])(
    `shows duplicateOptionMsg when searchText is already selected for options=%j`,
    (options, selected) => {
      test.each([
        [true, `Create this option...`],
        [false, `Custom duplicate option message`],
      ])(
        `allowUserOptions=true, duplicates=%j`,
        async (duplicates, duplicateOptionMsg) => {
          new MultiSelect({
            target: document.body,
            props: {
              options,
              allowUserOptions: true,
              duplicates,
              duplicateOptionMsg,
              selected,
            },
          })

          const input = doc_query(`ul.selected input`)

          input.value = selected[0]
          input.dispatchEvent(new InputEvent(`input`))
          await sleep()

          const dropdown = doc_query(`div.multiselect ul.options`)

          const fail_msg = `options=${options}, selected=${selected}, duplicates=${duplicates}, duplicateOptionMsg=${duplicateOptionMsg}`
          expect(dropdown.textContent?.trim(), fail_msg).toBe(
            duplicateOptionMsg
          )
        }
      )
    }
  )
})
