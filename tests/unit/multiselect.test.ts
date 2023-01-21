import MultiSelect, { type MultiSelectEvents, type Option } from '$lib'
import { describe, expect, test, vi } from 'vitest'
import { doc_query, sleep } from '.'
import Test2WayBind from './Test2WayBind.svelte'

test(`2-way binding of activeIndex`, async () => {
  let activeIndex: number
  const binder = new Test2WayBind({
    target: document.body,
    props: { options: [1, 2, 3] },
  })
  binder.$on(`activeIndex-changed`, (e: CustomEvent) => {
    activeIndex = e.detail
  })

  // test internal changes to activeIndex bind outwards
  for (const idx of [1, 2]) {
    const li = doc_query(`ul.options li:nth-child(${idx})`)
    li.dispatchEvent(new MouseEvent(`mouseover`))
    await sleep()
    expect(activeIndex).toEqual(idx - 1)
  }

  // test external changes to activeIndex bind inwards
  activeIndex = 2
  binder.$set({ activeIndex })
  await sleep()
  expect(doc_query(`ul.options > li.active`).textContent?.trim()).toBe(`3`)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  const binder = new Test2WayBind({
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  // test internal change to activeOption binds outwards
  let active_option: Option
  binder.$on(`activeOption-changed`, (e: CustomEvent) => {
    active_option = e.detail
  })
  const cb = vi.fn()
  binder.$on(`activeOption-changed`, cb)

  const first_option = doc_query(`ul.options > li`)
  first_option.dispatchEvent(new MouseEvent(`mouseover`))

  await sleep()
  expect(active_option).toBe(1)
  expect(cb).toBeCalledTimes(1)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  const binder = new Test2WayBind({
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  // test internal change to activeOption binds outwards
  let activeOption: Option
  binder.$on(`activeOption-changed`, (e: CustomEvent) => {
    activeOption = e.detail
  })
  const cb = vi.fn()
  binder.$on(`activeOption-changed`, cb)

  const first_option = doc_query(`ul.options > li`)
  first_option.dispatchEvent(new MouseEvent(`mouseover`))

  await sleep()
  expect(activeOption).toBe(1)
  expect(cb).toBeCalledTimes(1)
})

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
  const form_input = doc_query(`input.form-control`) as HTMLInputElement

  // make sure the search text filtered the dropdown options
  expect(lis.length).toBe(1)

  expect(input?.value).toBe(searchText)
  expect(input?.id).toBe(id)
  expect(input?.autocomplete).toBe(autocomplete)
  expect(input?.placeholder).toBe(placeholder)
  expect(form_input?.name).toBe(name)
  expect(input?.inputMode).toBe(inputmode)
  expect(input?.pattern).toBe(pattern)
})

test(`applies custom classes for styling through CSS frameworks`, async () => {
  const prop_elem_map = {
    input: HTMLInputElement,
    liOption: HTMLLIElement,
    liActiveOption: HTMLLIElement,
    liSelected: HTMLLIElement,
    outerDiv: HTMLDivElement,
    ulOptions: HTMLUListElement,
    ulSelected: HTMLUListElement,
    maxSelectMsg: HTMLSpanElement,
  }
  const css_classes = Object.fromEntries(
    Object.keys(prop_elem_map).map((cls) => [`${cls}Class`, cls])
  )

  new MultiSelect({
    target: document.body,
    // select=[1] needed for selected list to show up
    // maxSelect={2} needed for maxSelectMsg to show up
    props: { options: [1, 2, 3], ...css_classes, selected: [1], maxSelect: 2 },
  })

  // make an option active hovering it so it gets the active class
  document
    .querySelector(`ul.options > li`)
    ?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
  await sleep()

  for (const [class_name, elem_type] of Object.entries(prop_elem_map)) {
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
  const selected = doc_query(`ul.selected`)

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

test(`value is a single option (i.e. selected[0]) when maxSelect=1`, async () => {
  const options = [1, 2, 3]

  const instance = new MultiSelect({
    target: document.body,
    props: { options, maxSelect: 1, selected: options },
  })

  const value = instance.$$.ctx[instance.$$.props.value]

  // this also tests that only 1st option is pre-selected although all options are marked such, i.e. no more than maxSelect options can be pre-selected
  expect(value).toBe(options[0])
})

test(`selected is null when maxSelect=1 and no option is pre-selected`, async () => {
  const instance = new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], maxSelect: 1 },
  })

  const value = instance.$$.ctx[instance.$$.props.value]

  expect(value).toBe(null)
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

describe.each([
  [false, [], true], // unrequired + empty selected = valid form
  [true, [], false], // required + empty selected = invalid form
  [1, [1], true], // required=1 + 1 selected = valid form
  [2, [1], false], // required=2 + 1 selected = invalid form
  [2, [1, 2], true], // required=2 + 2 selected = valid form
])(
  `MultiSelect with required=%s, selected=%s`,
  (required, selected, form_valid) => {
    test.each([1, 2, null])(
      `${
        form_valid ? `passes` : `doesn't pass`
      } form validity check and maxSelect=%s`,
      (maxSelect) => {
        // i think, not passing validity check means form won't submit
        // maybe TODO: simulating form submission event and checking
        // event.defaultPrevented == true seems closer to ground truth but harder to test

        const form = document.createElement(`form`)
        document.body.appendChild(form)

        new MultiSelect({
          target: form,
          props: { options: [1, 2, 3], required, selected, maxSelect },
        })

        expect(form.checkValidity()).toBe(form_valid)
      }
    )
  }
)

test.each([
  [0, 1, 0],
  [1, 1, 0],
  [2, 1, 1],
  [1, 2, 0],
])(`console error if required > maxSelect`, (required, maxSelect, expected) => {
  console.error = vi.fn()

  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], required, maxSelect },
  })

  expect(console.error).toHaveBeenCalledTimes(expected)
  if (expected > 0) {
    expect(console.error).toHaveBeenCalledWith(
      `MultiSelect maxSelect=${maxSelect} < required=${required}, makes it impossible for users to submit a valid form`
    )
  }
})

test(`required and non-empty MultiSelect makes form pass validity check`, async () => {
  const form = document.createElement(`form`)
  document.body.appendChild(form)

  new MultiSelect({
    target: form,
    props: { options: [1, 2, 3], required: true, selected: [1] },
  })

  expect(form.checkValidity()).toBe(true)
})

test.each([
  [
    [1, 2, 3],
    [`a`, `b`, `c`],
    [{ label: `a` }, { label: `b` }, { label: `c` }],
  ],
])(
  `passes selected options=%s to form submission handlers`,
  async (options) => {
    const form = document.createElement(`form`)
    // actual form submission not supported in nodejs, would throw without preventing default behavior
    form.onsubmit = (e) => e.preventDefault()
    document.body.appendChild(form)

    const field_name = `test form submission`
    // add multiselect to form
    new MultiSelect({
      target: form,
      props: { options, name: field_name, required: true },
    })
    expect(form.checkValidity()).toBe(false)

    // add submit button to form
    const btn = document.createElement(`button`)
    form.appendChild(btn)

    // select 3 options
    for (const _ of Array(3)) {
      const li = doc_query(`ul.options li`)
      li.dispatchEvent(new MouseEvent(`mouseup`))
      await sleep()
    }
    expect(form.checkValidity()).toBe(true)

    btn.dispatchEvent(new MouseEvent(`click`)) // submit form
    await sleep()
    const form_data = new FormData(form)
    expect(form_data.get(field_name)).toEqual(JSON.stringify(options))
  }
)

test(`invalid=true gives top-level div class 'invalid' and input attribute of 'aria-invalid'`, async () => {
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
  option.dispatchEvent(new MouseEvent(`mouseup`))
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

  const dropdown = doc_query(`ul.options`)
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
      noMatchingOptionsMsg = select.$$.ctx[select.$$.props.noMatchingOptionsMsg]
    }

    const dropdown = doc_query(`ul.options`)
    expect(dropdown.textContent?.trim()).toBe(noMatchingOptionsMsg)
  }
)

// https://github.com/janosh/svelte-multiselect/issues/183
test(`up/down arrow keys can traverse dropdown list even when user entered searchText into input`, async () => {
  const options = [`foo`, `bar`, `baz`]
  new MultiSelect({
    target: document.body,
    props: { options, allowUserOptions: true },
  })

  const input = doc_query(`ul.selected input`)
  input.value = `ba`
  input.dispatchEvent(new InputEvent(`input`))
  await sleep()

  const dropdown = doc_query(`ul.options`)
  expect(dropdown.textContent?.trim()).toBe(`bar baz`)

  // loop through the dropdown list twice
  for (const text of [`bar`, `baz`, `bar`, `baz`]) {
    // down arrow key
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
    await sleep()
    const li_active = doc_query(`ul.options li.active`)
    expect(li_active.textContent?.trim()).toBe(text)
  }
})

test(`single remove button removes 1 selected option`, async () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2, 3] },
  })

  document
    .querySelector(`ul.selected button[title='Remove 1']`)
    ?.dispatchEvent(new MouseEvent(`mouseup`))

  const selected = doc_query(`ul.selected`)
  await sleep()

  expect(selected.textContent?.trim()).toEqual(`2 3`)
})

test(`remove all button removes all selected options and is visible only if more than 1 option is selected`, async () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2, 3] },
  })
  let selected = doc_query(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(`1 2 3`)

  document
    .querySelector(`button[title='Remove all']`)
    ?.dispatchEvent(new MouseEvent(`mouseup`))
  await sleep()

  selected = doc_query(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(``)

  // select 2 options
  for (const _ of Array(2)) {
    expect(
      document.querySelector(`button[title='Remove all']`),
      `remove all button should only appear if more than 1 option is selected`
    ).toBeNull()

    const li = doc_query(`ul.options li`)
    li.dispatchEvent(new MouseEvent(`mouseup`))
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
  const remove_btns = document.querySelectorAll(`ul.selected > li > button`)

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

  const selected = doc_query(`ul.selected`)
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

    const selected = doc_query(`ul.selected`)
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

        const dropdown = doc_query(`ul.options`)

        const fail_msg = `options=${options}, selected=${selected}, duplicates=${duplicates}, duplicateOptionMsg=${duplicateOptionMsg}`
        expect(dropdown.textContent?.trim(), fail_msg).toBe(duplicateOptionMsg)
      }
    )
  }
)

test.each([
  [true, ``],
  [false, `1`],
])(
  `resetFilterOnAdd=%j handles input value correctly after adding an option`,
  async (resetFilterOnAdd, expected) => {
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3], resetFilterOnAdd },
    })

    const input = doc_query<HTMLInputElement>(`ul.selected input`)
    input.value = `1`
    input.dispatchEvent(new InputEvent(`input`))
    await sleep()

    const li = doc_query(`ul.options li`)
    li.dispatchEvent(new MouseEvent(`mouseup`))
    await sleep()

    expect(input.value).toBe(expected)
  }
)

test(`2-way binding of selected`, async () => {
  let selected: Option[]
  const binder = new Test2WayBind({
    target: document.body,
    props: { options: [1, 2, 3] },
  })
  binder.$on(`selected-changed`, (e: CustomEvent) => {
    selected = e.detail
  })

  // test internal changes to selected bind outwards
  for (const _ of Array(2)) {
    const li = doc_query(`ul.options li`)
    li.dispatchEvent(new MouseEvent(`mouseup`))
    await sleep()
  }

  expect(selected).toEqual([1, 2])

  // test external changes to selected bind inwards
  selected = [3]
  binder.$set({ selected })
  await sleep()
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`3`)
})

test.each([
  [null, [1, 2]],
  [1, 2],
  [2, [1, 2]],
])(
  `1-way bind value when maxSelect=%s, expected value=%s`,
  async (maxSelect, expected) => {
    const binder = new Test2WayBind({
      target: document.body,
      props: { options: [1, 2, 3], maxSelect },
    })
    let value: Option[]
    binder.$on(`value-changed`, (e: CustomEvent) => {
      value = e.detail
    })

    // test internal changes bind outwards
    for (const _ of [1, 2]) {
      const li = doc_query(`ul.options li`)
      li.dispatchEvent(new MouseEvent(`mouseup`))
      await sleep()
    }

    expect(value).toEqual(expected)
  }
)

test.each([
  [true, false, 0],
  [false, true, 0],
  [true, true, 0],
  [false, false, 1],
])(
  `no console error about missing options if loading or disabled=true`,
  (loading, disabled, expected) => {
    console.error = vi.fn()

    new MultiSelect({
      target: document.body,
      props: { options: [], loading, disabled },
    })

    expect(console.error).toHaveBeenCalledTimes(expected)
    if (expected > 0) {
      expect(console.error).toHaveBeenCalledWith(
        `MultiSelect received no options`
      )
    }
  }
)

test.each([[null], [`custom add option message`]])(
  `arrow keys on empty multiselect toggle createOptionMsg as active`,
  async (createOptionMsg) => {
    let props = { options: [], allowUserOptions: true, searchText: `foo` }
    if (createOptionMsg) props = { ...props, createOptionMsg }
    new MultiSelect({ target: document.body, props })

    const input = doc_query(`ul.selected input`)
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
    await sleep()

    const li_active = doc_query(`ul.options li.active`)
    expect(li_active.textContent?.trim()).toBe(
      createOptionMsg ?? `Create this option...`
    )
  }
)

test(`disabled multiselect has disabled icon`, () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], disabled: true },
  })

  expect(
    doc_query(`ul.selected + svg[data-name='disabled-icon']`)
  ).toBeInstanceOf(SVGSVGElement)
})

test(`can remove user-created selected option which is not in dropdown list`, async () => {
  // i.e. allowUserOptions=true, not 'append', meaning user options are only selected but
  // aren't added to dropdown list yet remove() should still be able to delete them
  new MultiSelect({
    target: document.body,
    props: { options: [`1`, `2`, `3`], allowUserOptions: true },
  })

  // add a new option created from user text input
  const input = doc_query(`ul.selected input`)
  input.value = `foo`
  input.dispatchEvent(new InputEvent(`input`))
  await sleep()

  const li = doc_query(`ul.options li[title='Create this option...']`)
  li.dispatchEvent(new MouseEvent(`mouseup`))
  await sleep()
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`foo`)

  // remove the new option
  const li_selected = doc_query(`ul.selected li button[title*='Remove']`)
  li_selected.dispatchEvent(new MouseEvent(`mouseup`))
  await sleep()

  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(``)
})

test.each([[[1]], [[1, 2]], [[1, 2, 3]], [[1, 2, 3, 4]]])(
  `does not render remove buttons if selected.length <= minSelect`,
  async (selected) => {
    const minSelect = 2
    new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3, 4], minSelect, selected },
    })

    expect(
      document.querySelectorAll(`ul.selected button[title*='Remove']`)
    ).toHaveLength(selected.length > minSelect ? selected.length : 0)
  }
)

class DataTransfer {
  data: Record<string, string> = {}
  setData(type: string, val: string) {
    this.data[type] = val
  }
  getData(type: string) {
    return this.data[type]
  }
}

class DragEvent extends MouseEvent {
  constructor(type: string, props: Record<string, unknown>) {
    super(type, props)
    Object.assign(this, props)
  }
}

test(`dragging selected options across each other changes their order`, async () => {
  // https://github.com/janosh/svelte-multiselect/issues/176
  const options = [1, 2, 3]
  new MultiSelect({
    target: document.body,
    props: { options, selected: options },
  })
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`1 2 3`)

  // test swapping selected options 1 and 2
  const li = doc_query(`ul.selected li`)

  const dataTransfer = new DataTransfer()
  dataTransfer.setData(`text/plain`, `1`)

  li.dispatchEvent(new DragEvent(`drop`, { dataTransfer }))
  await sleep()

  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`2 1 3`)

  // test swapping them back
  const li2 = doc_query(`ul.selected li:nth-child(2)`)
  dataTransfer.setData(`text/plain`, `0`)

  li2.dispatchEvent(new DragEvent(`drop`, { dataTransfer }))
  await sleep()
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`1 2 3`)
})

test.each([[true], [false]])(
  `console warning when combining sortSelected=%s and selectedOptionsDraggable`,
  async (sortSelected) => {
    console.warn = vi.fn()

    new MultiSelect({
      target: document.body,
      props: {
        options: [1, 2, 3],
        sortSelected,
        selectedOptionsDraggable: true,
      },
    })

    if (sortSelected) {
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        `MultiSelect's sortSelected and selectedOptionsDraggable should not be combined as any user re-orderings of selected options will be undone by sortSelected on component re-renders.`
      )
    } else {
      expect(console.warn).toHaveBeenCalledTimes(0)
    }
  }
)

describe.each([[true], [false]])(`allowUserOptions=%s`, (allowUserOptions) => {
  describe.each([[true], [false]])(`disabled=%s`, (disabled) => {
    test.each([[true], [false]])(
      `console.error when allowEmpty=false and multiselect has no options`,
      async (allowEmpty) => {
        console.error = vi.fn()

        new MultiSelect({
          target: document.body,
          props: { options: [], allowEmpty, disabled, allowUserOptions },
        })

        if (!allowEmpty && !disabled && !allowUserOptions) {
          expect(console.error).toHaveBeenCalledTimes(1)
          expect(console.error).toHaveBeenCalledWith(
            `MultiSelect received no options`
          )
        } else {
          expect(console.error).toHaveBeenCalledTimes(0)
        }
      }
    )
  })
})
