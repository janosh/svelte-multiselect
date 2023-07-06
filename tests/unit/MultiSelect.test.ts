import MultiSelect, { type MultiSelectEvents, type Option } from '$lib'
import { tick } from 'svelte'
import { describe, expect, test, vi } from 'vitest'
import { doc_query } from '.'
import Test2WayBind from './Test2WayBind.svelte'

const mouseup = new MouseEvent(`mouseup`)
const mouseover = new MouseEvent(`mouseover`)
const input_event = new InputEvent(`input`)
const arrow_down = new KeyboardEvent(`keydown`, { key: `ArrowDown` })
const enter = new KeyboardEvent(`keydown`, { key: `Enter` })

test(`2-way binding of activeIndex`, async () => {
  let activeIndex: number = 0
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
    li.dispatchEvent(mouseover)
    await tick()
    expect(activeIndex).toEqual(idx - 1)
  }

  // test external changes to activeIndex bind inwards
  activeIndex = 2
  binder.$set({ activeIndex })
  await tick()
  expect(doc_query(`ul.options > li.active`).textContent?.trim()).toBe(`3`)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  const binder = new Test2WayBind({
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  // test internal change to activeOption binds outwards
  let active_option: number = 0
  binder.$on(`activeOption-changed`, (e: CustomEvent) => {
    active_option = e.detail
  })
  const cb = vi.fn()
  binder.$on(`activeOption-changed`, cb)

  const first_option = doc_query(`ul.options > li`)
  first_option.dispatchEvent(mouseover)

  await tick()
  expect(active_option).toBe(1)
  expect(cb).toBeCalledTimes(1)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  const binder = new Test2WayBind({
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  // test internal change to activeOption binds outwards
  let activeOption: number = 0
  binder.$on(`activeOption-changed`, (e: CustomEvent) => {
    activeOption = e.detail
  })
  const cb = vi.fn()
  binder.$on(`activeOption-changed`, cb)

  const first_option = doc_query(`ul.options > li`)
  first_option.dispatchEvent(mouseover)

  await tick()
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

  const lis = document.querySelectorAll<HTMLLIElement>(`ul.options > li`)

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
  const input = doc_query<HTMLInputElement>(
    `input[autocomplete]`,
  ) as HTMLInputElement
  const form_input = doc_query<HTMLInputElement>(
    `input.form-control`,
  ) as HTMLInputElement

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
    Object.keys(prop_elem_map).map((cls) => [`${cls}Class`, cls]),
  )

  new MultiSelect({
    target: document.body,
    // select=[1] needed for selected list to show up
    // maxSelect={2} needed for maxSelectMsg to show up
    props: { options: [1, 2, 3], ...css_classes, selected: [1], maxSelect: 2 },
  })

  // make an option active hovering it so it gets the active class
  document.querySelector(`ul.options > li`)?.dispatchEvent(mouseover)
  await tick()

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

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  input.dispatchEvent(arrow_down)

  await tick()

  const active_option = doc_query(`ul.options > li.active`)

  expect(active_option.textContent?.trim()).toBe(`1`)
})

// https://github.com/janosh/svelte-multiselect/issues/112
test(`can select 1st and last option with arrow and enter key`, async () => {
  new MultiSelect({ target: document.body, props: { options: [1, 2, 3] } })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  input.dispatchEvent(arrow_down)
  await tick()
  input.dispatchEvent(enter)
  await tick()
  const selected = doc_query(`ul.selected`)

  expect(selected.textContent?.trim()).toBe(`1`)

  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowUp` }))
  await tick()
  input.dispatchEvent(enter)
  await tick()

  expect(selected.textContent?.trim()).toBe(`1 3`)
})

// https://github.com/janosh/svelte-multiselect/issues/119
test(`bubbles <input> node DOM events`, async () => {
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

  const select = new MultiSelect({
    target: document.body,
    props: { options },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  for (const [event_name, event] of events) {
    const spy = vi.fn()
    select.$on(event_name, spy)

    input.dispatchEvent(event)
    expect(spy, `event type '${event_name}'`).toHaveBeenCalledTimes(1)
    expect(spy, `event type '${event_name}'`).toHaveBeenCalledWith(event)
  }
})

test(`value is a single option (i.e. selected[0]) when maxSelect=1`, async () => {
  const options = [1, 2, 3]

  const select = new MultiSelect({
    target: document.body,
    props: { options, maxSelect: 1, selected: options },
  })

  // this also tests that only 1st option is pre-selected although all options are marked such, i.e. no more than maxSelect options can be pre-selected
  expect(select.value).toBe(options[0])
})

test(`selected is null when maxSelect=1 and no option is pre-selected`, async () => {
  const select = new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], maxSelect: 1 },
  })

  expect(select.value).toBe(null)
})

test(`selected is array of first two options when maxSelect=2`, async () => {
  // even though all options have preselected=true
  const options = [1, 2, 3].map((itm) => ({
    label: itm,
    preselected: true,
  }))

  const select = new MultiSelect({
    target: document.body,
    props: { options, maxSelect: 2 },
  })

  expect(select.selected).toEqual(options.slice(0, 2))
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
      },
    )
  },
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
      `MultiSelect maxSelect=${maxSelect} < required=${required}, makes it impossible for users to submit a valid form`,
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
      li.dispatchEvent(mouseup)
      await tick()
    }
    expect(form.checkValidity()).toBe(true)

    btn.dispatchEvent(new MouseEvent(`click`)) // submit form
    await tick()
    const form_data = new FormData(form)
    expect(form_data.get(field_name)).toEqual(JSON.stringify(options))
  },
)

test(`invalid=true gives top-level div class 'invalid' and input attribute of 'aria-invalid'`, async () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], invalid: true },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  expect(input.getAttribute(`aria-invalid`)).toBe(`true`)
  const multiselect = doc_query(`div.multiselect`)
  expect(multiselect.classList.contains(`invalid`)).toBe(true)

  // assert aria-invalid attribute is removed on selecting a new option
  const option = doc_query(`ul.options > li`)
  option.dispatchEvent(mouseup)
  await tick()

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

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  input.value = `ba`
  input.dispatchEvent(input_event)
  await tick()

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

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

    input.value = `4`
    input.dispatchEvent(input_event)
    await tick()

    if (noMatchingOptionsMsg === undefined) {
      noMatchingOptionsMsg = select.noMatchingOptionsMsg
    }

    const dropdown = doc_query(`ul.options`)
    expect(dropdown.textContent?.trim()).toBe(noMatchingOptionsMsg)
  },
)

// https://github.com/janosh/svelte-multiselect/issues/183
test(`up/down arrow keys can traverse dropdown list even when user entered searchText into input`, async () => {
  const options = [`foo`, `bar`, `baz`]
  new MultiSelect({
    target: document.body,
    props: { options, allowUserOptions: true },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  input.dispatchEvent(input_event)
  await tick()

  const dropdown = doc_query(`ul.options`)
  expect(dropdown.textContent?.trim()).toBe(`bar baz`)

  // loop through the dropdown list twice
  for (const text of [`bar`, `baz`, `bar`, `baz`]) {
    // down arrow key
    input.dispatchEvent(arrow_down)
    await tick()
    const li_active = doc_query(`ul.options li.active`)
    expect(li_active.textContent?.trim()).toBe(text)
  }
})

test.each([
  [[`foo`, `bar`, `baz`]],
  [[1, 2, 3]],
  [[`foo`, 2, `baz`]],
  [[{ label: `foo` }, { label: `bar` }, { label: `baz` }]],
  [[{ label: `foo`, value: 1, key: `whatever` }]],
])(`single remove button removes 1 selected option`, async (options) => {
  const { get_label } = new MultiSelect({
    target: document.body,
    props: { options, selected: [...options] },
  })

  document
    .querySelector(
      `ul.selected button[title='Remove ${get_label(options[0])}']`,
    )
    ?.dispatchEvent(mouseup)

  const selected = doc_query(`ul.selected`)
  await tick()

  expect(selected.textContent?.trim()).toEqual(
    options.slice(1).map(get_label).join(` `),
  )
})

test(`remove all button removes all selected options and is visible only if more than 1 option is selected`, async () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2, 3] },
  })
  let selected = doc_query(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(`1 2 3`)

  document.querySelector(`button[title='Remove all']`)?.dispatchEvent(mouseup)
  await tick()

  selected = doc_query(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(``)

  // select 2 options
  for (const _ of Array(2)) {
    expect(
      document.querySelector(`button[title='Remove all']`),
      `remove all button should only appear if more than 1 option is selected`,
    ).toBeNull()

    const li = doc_query(`ul.options li`)
    li.dispatchEvent(mouseup)
    await tick()
  }

  expect(doc_query(`button[title='Remove all']`)).toBeInstanceOf(
    HTMLButtonElement,
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
  const remove_all_btn = doc_query<HTMLButtonElement>(`button.remove-all`)
  const remove_btns = document.querySelectorAll<HTMLButtonElement>(
    `ul.selected > li > button`,
  )

  expect(remove_all_btn.title).toBe(removeAllTitle)
  expect([...remove_btns].map((btn) => btn.title)).toEqual(
    options.map((op) => `${removeBtnTitle} ${op}`),
  )
})

test(`can't select disabled options`, async () => {
  const options = [1, 2, 3].map((el) => ({
    label: el,
    disabled: el === 1,
  }))
  new MultiSelect({ target: document.body, props: { options } })

  for (const li of document.querySelectorAll(`ul.options > li`)) {
    li.dispatchEvent(mouseup)
  }

  const selected = doc_query(`ul.selected`)
  await tick()

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
      ?.forEach((li) => li.dispatchEvent(mouseup))

    const selected = doc_query(`ul.selected`)
    await tick()

    expect(selected.textContent?.trim()).toEqual(
      [...Array(maxSelect).keys()].join(` `),
    )
  },
)

test(`closes dropdown on tab out`, async () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3] },
  })
  // starts with closed dropdown
  expect(doc_query(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)

  // opens dropdown on focus
  doc_query<HTMLInputElement>(`input[autocomplete]`).focus()
  await tick()
  expect(document.querySelector(`ul.options.hidden`)).toBeNull()

  // closes dropdown again on tab out
  doc_query<HTMLInputElement>(`input[autocomplete]`).dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `Tab` }),
  )
  await tick()
  expect(doc_query(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)
})

describe.each([
  [[`1`, `2`, `3`], [`1`]], // test string options
  [[1, 2, 3], [1]], // test number options
])(
  `shows duplicateOptionMsg when searchText is already selected for options=%j`,
  (options, selected) => {
    test.each([
      [true, `Option not found. Create it?`],
      [false, `Another custom duplicate option message`],
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

        const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

        input.value = `${selected[0]}`
        input.dispatchEvent(input_event)

        await tick()

        const dropdown = doc_query(`ul.options`)

        const fail_msg = `options=${options}, selected=${selected}, duplicates=${duplicates}, duplicateOptionMsg=${duplicateOptionMsg}`
        expect(dropdown.textContent?.trim(), fail_msg).toBe(
          duplicates ? `${selected[0]}` : duplicateOptionMsg,
        )
      },
    )
  },
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

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `1`
    input.dispatchEvent(input_event)
    await tick()

    const li = doc_query(`ul.options li`)
    li.dispatchEvent(mouseup)
    await tick()

    expect(input.value).toBe(expected)
  },
)

test(`2-way binding of selected`, async () => {
  let selected: number[] = []
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
    li.dispatchEvent(mouseup)
    await tick()
  }

  expect(selected).toEqual([1, 2])

  // test external changes to selected bind inwards
  selected = [3]
  binder.$set({ selected })
  await tick()
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`3`)
})

test.each([
  [null, [1, 2]],
  [1, 2],
  [2, [1, 2]],
])(
  `1-way (outward) binding of value works when maxSelect=%s, expected value=%s`,
  async (maxSelect, expected) => {
    const binder = new Test2WayBind({
      target: document.body,
      props: { options: [1, 2, 3], maxSelect },
    })
    let value: number = 0
    binder.$on(`value-changed`, (event: CustomEvent) => {
      value = event.detail
    })

    // test internal changes bind outwards
    for (const _ of [1, 2]) {
      const li = doc_query(`ul.options li`)
      li.dispatchEvent(mouseup)
      await tick()
    }

    expect(value).toEqual(expected)
  },
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
        `MultiSelect received no options`,
      )
    }
  },
)

test.each([[null], [`custom add option message`]])(
  `arrow keys on empty multiselect toggle createOptionMsg as active with createOptionMsg=%s`,
  async (createOptionMsg) => {
    const props = { options: [], allowUserOptions: true, searchText: `foo` }
    const select = new MultiSelect({ target: document.body, props })
    if (createOptionMsg) select.$set({ createOptionMsg })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(arrow_down)
    await tick()

    const li_active = doc_query(`ul.options li.active`)

    const default_msg = select.createOptionMsg
    expect(li_active.textContent?.trim()).toBe(createOptionMsg ?? default_msg)
  },
)

test(`disabled multiselect has disabled icon`, () => {
  new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], disabled: true },
  })

  expect(doc_query(`svg[data-name='disabled-icon']`)).toBeInstanceOf(
    SVGSVGElement,
  )
})

test(`can remove user-created selected option which is not in dropdown list`, async () => {
  // i.e. allowUserOptions=true, not 'append', meaning user options are only selected but
  // aren't added to dropdown list yet remove() should still be able to delete them
  new MultiSelect({
    target: document.body,
    props: { options: [`1`, `2`, `3`], allowUserOptions: true },
  })

  // add a new option created from user text input
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `foo`
  input.dispatchEvent(input_event)
  await tick()

  const li = doc_query(`ul.options li[title='Create this option...']`)
  li.dispatchEvent(mouseup)
  await tick()
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`foo`)

  // remove the new option
  const li_selected = doc_query(`ul.selected li button[title*='Remove']`)
  li_selected.dispatchEvent(mouseup)
  await tick()

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
      document.querySelectorAll(`ul.selected button[title*='Remove']`),
    ).toHaveLength(selected.length > minSelect ? selected.length : 0)
  },
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
  await tick()

  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`2 1 3`)

  // test swapping them back
  const li2 = doc_query(`ul.selected li:nth-child(2)`)
  dataTransfer.setData(`text/plain`, `0`)

  li2.dispatchEvent(new DragEvent(`drop`, { dataTransfer }))
  await tick()
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
        `MultiSelect's sortSelected and selectedOptionsDraggable should not be combined as any user` +
          ` re-orderings of selected options will be undone by sortSelected on component re-renders.`,
      )
    } else {
      expect(console.warn).toHaveBeenCalledTimes(0)
    }
  },
)

describe.each([[true], [false]])(`allowUserOptions=%s`, (allowUserOptions) => {
  test.each([[`create option`], [``], [null]])(
    `console.error when allowUserOptions is truthy but createOptionMsg is falsy`,
    async (createOptionMsg) => {
      console.error = vi.fn()

      new MultiSelect({
        target: document.body,
        props: { options: [1, 2, 3], createOptionMsg, allowUserOptions },
      })

      if (allowUserOptions && !createOptionMsg && createOptionMsg !== null) {
        expect(console.error).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledWith(
          `MultiSelect has allowUserOptions=${allowUserOptions} but createOptionMsg=${createOptionMsg} is falsy. ` +
            `This prevents the "Add option" <span> from showing up, resulting in a confusing user experience.`,
        )
      } else {
        expect(console.error).toHaveBeenCalledTimes(0)
      }
    },
  )
})

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
            `MultiSelect received no options`,
          )
        } else {
          expect(console.error).toHaveBeenCalledTimes(0)
        }
      },
    )
  })
})

test.each([[[1]], [[1, 2, 3]]])(
  `buttons to remove selected options have CSS class "remove"`,

  (selected) => {
    new MultiSelect({
      target: document.body,
      props: { options: selected, selected },
    })

    // every selected should have a remove button
    expect(document.querySelectorAll(`ul.selected button.remove`)).toHaveLength(
      selected.length,
    )

    // if more than 1 selected, there should be a remove-all button
    expect(document.querySelectorAll(`button.remove.remove-all`)).toHaveLength(
      selected.length > 1 ? 1 : 0,
    )
  },
)

test(`errors to console when option is an object but has no label key`, async () => {
  console.error = vi.fn()

  new MultiSelect({
    target: document.body,
    // @ts-expect-error test invalid option
    props: { options: [{ foo: 42 }] },
  })

  expect(console.error).toHaveBeenCalledWith(
    `MultiSelect option {"foo":42} is an object but has no label key`,
  )
})

test(`first matching option becomes active automatically on entering searchText`, async () => {
  new MultiSelect({
    target: document.body,
    props: { options: [`foo`, `bar`, `baz`] },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  // updates input value
  input.dispatchEvent(input_event)
  // triggers handle_keydown callback (which sets activeIndex)
  input.dispatchEvent(new KeyboardEvent(`keydown`))
  await tick()

  expect(doc_query(`ul.options li.active`).textContent?.trim()).toBe(`bar`)
})

test.each([
  [`add`, `ul.options li`, mouseup],
  [`change`, `ul.options li`, mouseup],
  [`remove`, `ul.selected button.remove`, mouseup],
  [`change`, `ul.selected button.remove`, mouseup],
  [`removeAll`, `button.remove-all`, mouseup],
  [`change`, `button.remove-all`, mouseup],
])(`bubbles <input> node DOM events`, async (event_name, selector, trigger) => {
  const select = new MultiSelect({
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2] },
  })

  const spy = vi.fn()
  select.$on(event_name as keyof MultiSelectEvents, spy)

  doc_query(selector).dispatchEvent(trigger)
  await tick()

  expect(spy, `event type '${event_name}'`).toHaveBeenCalledTimes(1)
})

describe.each([
  [true, (opt: Option) => opt],
  [false, (opt: Option) => opt],
  [true, JSON.stringify],
  [false, JSON.stringify],
])(`MultiSelect component`, (duplicates, key) => {
  test(`can select the same object option multiple times if duplicates=${duplicates}`, async () => {
    const options = [
      { label: `foo`, id: 1 },
      { label: `foo`, id: 2 },
    ]
    new MultiSelect({
      target: document.body,
      props: { options, selected: [{ ...options[0] }], duplicates, key },
    })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(arrow_down)
    await tick()
    input.dispatchEvent(enter)
    await tick()

    const options_equal = key(options[0]) === key(options[1])
    // 2 options can be selected if they're different or duplicates allowed
    const expected = duplicates || !options_equal ? `foo foo` : `foo`
    const actual = doc_query(`ul.selected`).textContent?.trim()
    const fail_msg = `duplicates=${duplicates}, options_equal=${options_equal}, key=${key.name}`
    expect(actual, fail_msg).toBe(expected)
  })
})

describe.each([[true], [false]])(`allowUserOptions=%s`, (allowUserOptions) => {
  describe.each([[``], [`no matches`]])(
    `noMatchingOptionsMsg=%s`,
    (noMatchingOptionsMsg) => {
      describe.each([[`make option`], [``]])(
        `createOptionMsg='%s'`,
        (createOptionMsg) => {
          test(`no .user-msg node is rendered if in a state where noMatchingOptionsMsg or createOptionMsg would be shown but are falsy`, async () => {
            new MultiSelect({
              target: document.body,
              props: {
                options: [`foo`],
                selected: [`foo`],
                noMatchingOptionsMsg,
                createOptionMsg,
                allowUserOptions,
              },
            })

            const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
            // create a state where no options match the search text
            input.value = `bar`
            input.dispatchEvent(input_event)

            await tick()

            if (allowUserOptions && createOptionMsg) {
              expect(doc_query(`.user-msg`).textContent?.trim()).toBe(
                createOptionMsg,
              )
            } else if (noMatchingOptionsMsg) {
              expect(doc_query(`.user-msg`).textContent?.trim()).toBe(
                noMatchingOptionsMsg,
              )
            } else {
              expect(document.querySelector(`.user-msg`)).toBeNull()
            }
          })
        },
      )
    },
  )
})

test.each([[0], [1], [2], [5], [undefined]])(
  `no more than maxOptions are rendered if a positive integer, all options are rendered undefined or 0`,
  async (maxOptions) => {
    const options = [`foo`, `bar`, `baz`]

    new MultiSelect({
      target: document.body,
      props: { options, maxOptions },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(input_event)

    await tick()

    expect(document.querySelectorAll(`ul.options li`)).toHaveLength(
      Math.min(options.length, maxOptions || options.length),
    )
  },
)

test.each([[true], [-1], [3.5], [`foo`], [{}]])(
  `console.error when maxOptions=%s is not a positive integer or undefined`,
  async (maxOptions) => {
    console.error = vi.fn()

    new MultiSelect({
      target: document.body,
      // @ts-expect-error test invalid maxOptions
      props: { options: [1, 2, 3], maxOptions },
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      `MultiSelect's maxOptions must be undefined or a positive integer, got ${maxOptions}`,
    )
  },
)

test(`headless=true to remove default classes`, async () => {
  new MultiSelect({
    target: document.body,
    props: {
      options: [`<a href="https://example.com">example.com</a>`],
      headless: true,
    },
  })
  for (const missingClass of [
    `multiselect`,
    `options`,
    `selected`,
    `max-select-msg`,
    `remove-all`,
  ]) {
    expect(
      document.querySelector(`.${missingClass}`),
      `when headless=true, the .multiselect node should not have the class .${missingClass}`,
    ).toBeNull()
  }
})
