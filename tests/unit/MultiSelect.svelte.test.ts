import MultiSelect, {
  type MultiSelectComponentEvents,
  type MultiSelectProps,
  type ObjectOption,
  type Option,
  type OptionStyle,
} from '$lib'
import { get_label, get_style } from '$lib/utils'
import { act, fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, test, vi } from 'vitest'
import Test2WayBind from './Test2WayBind.svelte'
import {
  DataTransfer,
  fireClick,
  fireDrop,
  fireFocus,
  fireInput,
  fireKeyDown,
  fireKeyDownArrowDown,
  fireKeyDownArrowUp,
  fireKeyDownEnter,
  fireKeyDownTab,
  fireMouseOver,
  fireMouseUp,
  query,
  queryAll,
  queryWithFail,
} from './utils'

test(`2-way binding of activeIndex`, async () => {
  let activeIndex: number = 0

  const { component } = render(Test2WayBind, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      onActiveIndexChanged: (data) => {
        activeIndex = data!
      },
    },
  })

  // test internal changes to activeIndex bind outwards
  for (const idx of [1, 2]) {
    const li = queryWithFail(`ul.options li:nth-child(${idx})`)
    await fireMouseOver(li)
    expect(activeIndex).toEqual(idx - 1)
  }

  // test external changes to activeIndex bind inwards
  await act(() => {
    activeIndex = 2
    component.activeIndex = activeIndex
  })

  expect(queryWithFail(`ul.options > li.active`).textContent?.trim()).toBe(`3`)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  // test internal change to activeOption binds outwards
  let activeOption: Option = 0
  const cb = vi.fn()

  render(Test2WayBind, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      onActiveOptionChanged: (data) => {
        activeOption = data!
        cb(data)
      },
    },
  })

  const first_option = queryWithFail(`ul.options > li`)
  await fireMouseOver(first_option)

  expect(activeOption).toBe(1)
  expect(cb).toBeCalledTimes(2) // initial call & change call
  expect(cb.mock.calls[1][0]).toBe(1)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  // test internal change to activeOption binds outwards
  let activeOption: Option = 0
  const cb = vi.fn()

  render(Test2WayBind, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      onActiveOptionChanged: (data) => {
        activeOption = data!
        cb()
      },
    },
  })

  const first_option = queryWithFail(`ul.options > li`)
  await fireMouseOver(first_option)

  expect(activeOption).toBe(1)
  expect(cb).toBeCalledTimes(2) // initial call & change call
})

test(`defaultDisabledTitle and custom per-option disabled titles are applied correctly`, () => {
  const defaultDisabledTitle = `Not selectable`
  const special_disabled_title = `Special disabled title`
  const options = [1, 2, 3].map<Option>((el) => ({
    label: el,
    disabled: true,
    disabledTitle: el > 1 ? undefined : special_disabled_title,
  }))

  render(MultiSelect, {
    target: document.body,
    props: { options, defaultDisabledTitle },
  })

  const lis = queryAll<HTMLLIElement>(`ul.options > li`)
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

  render(MultiSelect, {
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

  const lis = queryAll(`ul.options > li`)
  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  const form_input = queryWithFail<HTMLInputElement>(`input.form-control`)

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

  render(MultiSelect, {
    target: document.body,
    // select=[1] needed for selected list to show up
    // maxSelect={2} needed for maxSelectMsg to show up
    props: { options: [1, 2, 3], ...css_classes, selected: [1], maxSelect: 2 },
  })

  // make an option active hovering it so it gets the active class
  await fireMouseOver(queryWithFail(`ul.options > li`))

  for (const [class_name, elem_type] of Object.entries(prop_elem_map)) {
    const el = queryWithFail(`.${class_name}`)
    expect(el).toBeInstanceOf(elem_type)
  }
})

// https://github.com/janosh/svelte-multiselect/issues/111
test(`arrow down makes first option active`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], open: true },
  })

  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  await fireKeyDownArrowDown(input)

  const active_option = queryWithFail(`ul.options > li.active`)
  expect(active_option.textContent?.trim()).toBe(`1`)
})

// https://github.com/janosh/svelte-multiselect/issues/112
test(`can select 1st and last option with arrow and enter key`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  await fireKeyDownArrowDown(input)
  await fireKeyDownEnter(input)

  const selected = queryWithFail(`ul.selected`)
  expect(selected.textContent?.trim()).toBe(`1`)

  await fireKeyDownArrowUp(input)
  await fireKeyDownEnter(input)

  expect(selected.textContent?.trim()).toBe(`1 3`)
})

describe(`bubbles <input> node DOM events`, () => {
  // https://github.com/janosh/svelte-multiselect/issues/119
  test.each<[string, Event]>([
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
  ])(`bubbles <input> node "%s" event`, async (name, event) => {
    const options = [1, 2, 3]
    const spy = vi.fn()

    render(MultiSelect, {
      target: document.body,
      props: {
        options,
        [`on${name}`]: spy,
      },
    })

    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    await fireEvent(input, event)

    expect(spy, `event type '${name}'`).toHaveBeenCalledTimes(1)
    expect(spy, `event type '${name}'`).toHaveBeenCalledWith(event)
  })
})

describe.each([[null], [1]])(`value is `, (maxSelect) => {
  test.each([[[1, 2, 3]], [[`a`, `b`, `c`]]])(
    `${
      maxSelect == 1 ? `single` : `multiple`
    } options when maxSelect=${maxSelect}`,
    async (options) => {
      const { component: select } = render(Test2WayBind, {
        target: document.body,
        props: { options, maxSelect, selected: options },
      })

      // this also tests that only 1st option is pre-selected although all options are marked such, i.e. no more than maxSelect options can be pre-selected
      expect(select.value).toEqual(maxSelect == 1 ? options[0] : options)
    },
  )
})

test(`value is null when maxSelect=1 and no option is pre-selected`, async () => {
  const { component: select } = render(Test2WayBind, {
    target: document.body,
    props: { options: [1, 2, 3], maxSelect: 1 },
  })

  expect(select.value).toBe(null)
})

test.each([[null], [1]])(
  `2-way binding of value updates selected`,
  async (maxSelect) => {
    const { component: select } = render(Test2WayBind, {
      target: document.body,
      props: { options: [1, 2, 3], maxSelect },
    })

    expect(select.value).toEqual(maxSelect == 1 ? null : [])

    if (maxSelect == 1) {
      await act(() => {
        select.value = 2
      })

      expect(select.value).toEqual(2)
      expect(select.selected).toEqual([2])
    } else {
      await act(() => {
        select.value = [1, 2]
      })

      expect(select.value).toEqual([1, 2])
      expect(select.selected).toEqual([1, 2])
    }
  },
)

test(`selected is array of first two options when maxSelect=2`, async () => {
  // even though all options have preselected=true
  const options = [1, 2, 3].map<Option>((itm) => ({
    label: itm,
    preselected: true,
  }))

  const { component: select } = render(Test2WayBind, {
    target: document.body,
    props: { options, maxSelect: 2 },
  })

  expect(select.selected).toEqual(options.slice(0, 2))
})

describe.each([
  [false, []],
  [true, []],
  [1, [1]],
  [2, [1]],
  [2, [1, 2]],
])(`MultiSelect with required=%s, selected=%s`, (required, selected) => {
  test.each([1, 2, null])(`and maxSelect=%s form validation`, (maxSelect) => {
    // not passing validity check hopefully means form won't submit
    // maybe TODO: simulate form submission event and check
    // event.defaultPrevented == true seems closer to ground truth but harder to test

    const form = document.createElement(`form`)
    document.body.appendChild(form)

    render(MultiSelect, {
      target: form,
      props: { options: [1, 2, 3], required, selected, maxSelect },
    })

    // form should be valid if MultiSelect not required or n_selected >= n_required and <= maxSelect
    const form_valid =
      !required ||
      (selected.length >= Number(required) &&
        selected.length <= (maxSelect ?? Infinity))
    const msg = `form_valid=${form_valid}`

    expect(form.checkValidity(), msg).toBe(form_valid)
  })
})

test.each([
  [0, 1, 0],
  [1, 1, 0],
  [2, 1, 1],
  [1, 2, 0],
])(`console error if required > maxSelect`, (required, maxSelect, expected) => {
  console.error = vi.fn()

  render(MultiSelect, {
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

  render(MultiSelect, {
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
    form.onsubmit = (event) => event.preventDefault()
    document.body.appendChild(form)

    const field_name = `test form submission`
    // add multiselect to form
    render(MultiSelect, {
      target: form,
      props: { options, name: field_name, required: true },
    })
    expect(form.checkValidity()).toBe(false)

    // add submit button to form
    const btn = document.createElement(`button`)
    form.appendChild(btn)

    // select 3 options
    for (const _ of Array(3)) {
      const li = queryWithFail(`ul.options li`)
      await fireMouseUp(li)
    }
    expect(form.checkValidity()).toBe(true)

    await fireClick(btn) // submit form
    const form_data = new FormData(form)
    expect(form_data.get(field_name)).toEqual(JSON.stringify(options))
  },
)

test(`toggling required after invalid form submission allows submitting`, async () => {
  // https://github.com/janosh/svelte-multiselect/issues/285
  const form = document.createElement(`form`)
  document.body.appendChild(form)

  const props = $state({ options: [1, 2, 3], required: true })

  render(Test2WayBind, {
    target: form,
    props,
  })

  // form should not be submittable due to missing required input
  expect(form.checkValidity()).toBe(false)

  // toggle required to false
  await act(() => {
    props.required = false
  })

  // form should now be submittable
  expect(form.checkValidity()).toBe(true)
})

test(`invalid=true gives top-level div class 'invalid' and input attribute of 'aria-invalid'`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], invalid: true },
  })

  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  expect(input.getAttribute(`aria-invalid`)).toBe(`true`)

  const multiselect = queryWithFail(`div.multiselect`)
  expect(multiselect.classList.contains(`invalid`)).toBe(true)

  // assert aria-invalid attribute is removed on selecting a new option
  const option = queryWithFail(`ul.options > li`)
  await fireMouseUp(option)

  expect(input.getAttribute(`aria-invalid`)).toBe(null)

  // assert div.multiselect no longer has invalid class
  expect(multiselect.classList.contains(`invalid`)).toBe(false)
})

test(`parseLabelsAsHtml renders anchor tags as links`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: {
      options: [`<a href="https://example.com">example.com</a>`],
      parseLabelsAsHtml: true,
    },
  })

  const anchor = queryWithFail(`a[href='https://example.com']`)
  expect(anchor).toBeInstanceOf(HTMLAnchorElement)
})

test(`filters dropdown to show only matching options when entering text`, async () => {
  const options = [`foo`, `bar`, `baz`]

  render(MultiSelect, {
    target: document.body,
    props: { options },
  })

  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  await fireInput(input)

  const dropdown = queryWithFail(`ul.options`)
  expect(dropdown.textContent?.trim()).toBe(`barbaz`)
})

// test default case and custom message
test.each([undefined, `Custom no options message`])(
  `shows noMatchingOptionsMsg when no options match searchText`,
  async (noMatchingOptionsMsg) => {
    const { component: select } = render(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], noMatchingOptionsMsg },
    })

    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    input.value = `4`
    await fireInput(input)

    if (noMatchingOptionsMsg === undefined) {
      noMatchingOptionsMsg = select.noMatchingOptionsMsg
    }

    const dropdown = queryWithFail(`ul.options`)
    expect(dropdown.textContent?.trim()).toBe(noMatchingOptionsMsg)
  },
)

// https://github.com/janosh/svelte-multiselect/issues/183
test(`up/down arrow keys can traverse dropdown list even when user entered searchText into input`, async () => {
  const options = [`foo`, `bar`, `baz`]
  const { component: select } = render(MultiSelect, {
    target: document.body,
    props: { options, allowUserOptions: true },
  })

  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  await fireInput(input)

  const dropdown = queryWithFail(`ul.options`)
  expect(dropdown.textContent?.trim()).toBe(`barbaz ${select.createOptionMsg}`)

  // loop through the dropdown list twice
  for (const text of [`bar`, `baz`, `bar`, `baz`]) {
    // down arrow key
    await fireKeyDownArrowDown(input)

    const li_active = queryWithFail(`ul.options li.active`)
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
  render(MultiSelect, {
    target: document.body,
    props: { options, selected: [...options] },
  })

  await fireMouseUp(
    queryWithFail(
      `ul.selected button[title='Remove ${get_label(options[0])}']`,
    ),
  )

  const selected = queryWithFail(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(
    options.slice(1).map(get_label).join(` `),
  )
})

test(`remove all button removes all selected options and is visible only if more than 1 option is selected`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2, 3] },
  })
  let selected = queryWithFail(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(`1 2 3`)

  await fireMouseUp(queryWithFail(`button[title='Remove all']`))

  selected = queryWithFail(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(``)

  // select 2 options
  for (const _ of Array(2)) {
    expect(
      query(`button[title='Remove all']`),
      `remove all button should only appear if more than 1 option is selected`,
    ).toBeNull()

    const li = queryWithFail(`ul.options li`)
    await fireMouseUp(li)
  }

  expect(queryWithFail(`button[title='Remove all']`)).toBeInstanceOf(
    HTMLButtonElement,
  )
})

test(`removeAllTitle and removeBtnTitle are applied correctly`, () => {
  const removeAllTitle = `Custom remove all title`
  const removeBtnTitle = `Custom remove button title`
  const options = [1, 2, 3]

  render(MultiSelect, {
    target: document.body,
    props: { removeAllTitle, removeBtnTitle, options, selected: options },
  })

  const remove_all_btn = queryWithFail<HTMLButtonElement>(`button.remove-all`)
  const remove_btns = queryAll<HTMLButtonElement>(`ul.selected > li > button`)
  expect(remove_all_btn.title).toBe(removeAllTitle)
  expect([...remove_btns].map((btn) => btn.title)).toEqual(
    options.map((op) => `${removeBtnTitle} ${op}`),
  )
})

test(`can't select disabled options`, async () => {
  const options = [1, 2, 3].map<Option>((el) => ({
    label: el,
    disabled: el === 1,
  }))

  render(MultiSelect, {
    target: document.body,
    props: { options },
  })

  queryAll(`ul.options > li`)?.forEach((li) => fireMouseUp(li))
  await tick()

  const selected = queryWithFail(`ul.selected`)
  expect(selected.textContent?.trim()).toEqual(`2 3`)
})

test.each([2, 5, 10])(
  `can't select more than maxSelect options`,
  async (maxSelect: number) => {
    render(MultiSelect, {
      target: document.body,
      props: { options: [...Array(10).keys()], maxSelect },
    })

    queryAll(`ul.options > li`)?.forEach((li) => fireMouseUp(li))

    const selected = queryWithFail(`ul.selected`)
    await tick()

    expect(selected.textContent?.trim()).toEqual(
      [...Array(maxSelect).keys()].join(` `),
    )
  },
)

test(`closes dropdown on tab out`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3] },
  })
  // starts with closed dropdown
  expect(queryWithFail(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)

  // opens dropdown on focus
  await fireFocus(queryWithFail<HTMLInputElement>(`input[autocomplete]`))
  expect(query(`ul.options.hidden`)).toBeNull()

  // closes dropdown again on tab out
  await fireKeyDownTab(queryWithFail<HTMLInputElement>(`input[autocomplete]`))
  expect(queryWithFail(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)
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
        const { component: select } = render(MultiSelect, {
          target: document.body,
          props: {
            options,
            allowUserOptions: true,
            duplicates,
            duplicateOptionMsg,
            selected,
          },
        })

        const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
        input.value = `${selected[0]}`
        await fireInput(input)

        const dropdown = queryWithFail(`ul.options`)
        const fail_msg = `options=${options}, selected=${selected}, duplicates=${duplicates}, duplicateOptionMsg=${duplicateOptionMsg}`
        expect(dropdown.textContent?.trim(), fail_msg).toBe(
          duplicates
            ? `${selected[0]} ${select.createOptionMsg}`
            : duplicateOptionMsg,
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
    render(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], resetFilterOnAdd },
    })

    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    input.value = `1`
    await fireInput(input)

    const li = queryWithFail(`ul.options li`)
    await fireMouseUp(li)

    expect(input.value).toBe(expected)
  },
)

test(`2-way binding of selected`, async () => {
  let selected: Option[] = []

  const { component: binder } = render(Test2WayBind, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      onSelectedChanged: (data) => {
        selected = data!
      },
    },
  })

  // test internal changes to selected bind outwards
  for (const _ of Array(2)) {
    const li = queryWithFail(`ul.options li`)
    await fireMouseUp(li)
  }
  expect(selected).toEqual([1, 2])

  // test external changes to selected bind inwards
  await act(() => {
    selected = [3]
    binder.selected = selected
  })
  expect(queryWithFail(`ul.selected`).textContent?.trim()).toBe(`3`)
})

test.each([
  [null, [1, 2]],
  [1, 2],
  [2, [1, 2]],
])(
  `1-way (outward) binding of value works when maxSelect=%s, expected value=%s`,
  async (maxSelect, expected) => {
    let value: Option | Option[] | undefined

    render(Test2WayBind, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        maxSelect,
        onValueChanged: (data) => {
          value = data!
        },
      },
    })

    // test internal changes bind outwards
    for (const _ of [1, 2]) {
      const li = queryWithFail(`ul.options li`)
      await fireMouseUp(li)
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

    render(MultiSelect, {
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
    const props = $state<MultiSelectProps>({
      options: [],
      allowUserOptions: true,
      searchText: `foo`,
    })

    const { component: select } = render(MultiSelect, {
      target: document.body,
      props,
    })

    if (createOptionMsg) {
      props.createOptionMsg = createOptionMsg
    }

    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    await fireKeyDownArrowDown(input)

    const li_active = queryWithFail(`ul.options li.active`)

    const default_msg = select.createOptionMsg
    expect(li_active.textContent?.trim()).toBe(createOptionMsg ?? default_msg)
  },
)

test(`disabled multiselect has disabled icon`, () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], disabled: true },
  })

  expect(queryWithFail(`svg[data-name='disabled-icon']`)).toBeInstanceOf(
    SVGSVGElement,
  )
})

test(`can remove user-created selected option which is not in dropdown list`, async () => {
  // i.e. allowUserOptions=true, not 'append', meaning user options are only selected but
  // aren't added to dropdown list yet remove() should still be able to delete them
  render(MultiSelect, {
    target: document.body,
    props: { options: [`1`, `2`, `3`], allowUserOptions: true },
  })

  // add a new option created from user text input
  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  input.value = `foo`
  await fireInput(input)

  const li = queryWithFail(`ul.options li[title='Create this option...']`)
  await fireMouseUp(li)
  expect(queryWithFail(`ul.selected`).textContent?.trim()).toBe(`foo`)

  // remove the new option
  const li_selected = queryWithFail(`ul.selected li button[title*='Remove']`)
  await fireMouseUp(li_selected)
  expect(queryWithFail(`ul.selected`).textContent?.trim()).toBe(``)
})

test.each([[[1]], [[1, 2]], [[1, 2, 3]], [[1, 2, 3, 4]]])(
  `does not render remove buttons if selected.length <= minSelect`,
  async (selected) => {
    const minSelect = 2
    render(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3, 4], minSelect, selected },
    })

    expect(queryAll(`ul.selected button[title*='Remove']`)).toHaveLength(
      selected.length > minSelect ? selected.length : 0,
    )
  },
)

test(`dragging selected options across each other changes their order`, async () => {
  // https://github.com/janosh/svelte-multiselect/issues/176
  const options = [1, 2, 3]
  render(MultiSelect, {
    target: document.body,
    props: { options, selected: options },
  })
  expect(queryWithFail(`ul.selected`).textContent?.trim()).toBe(`1 2 3`)

  // test swapping selected options 1 and 2
  const li = queryWithFail(`ul.selected li`)

  const dataTransfer = new DataTransfer()
  dataTransfer.setData(`text/plain`, `1`)
  await fireDrop(li, dataTransfer)
  expect(queryWithFail(`ul.selected`).textContent?.trim()).toBe(`2 1 3`)

  // test swapping them back
  const li2 = queryWithFail(`ul.selected li:nth-child(2)`)
  dataTransfer.setData(`text/plain`, `0`)
  await fireDrop(li2, dataTransfer)
  expect(queryWithFail(`ul.selected`).textContent?.trim()).toBe(`1 2 3`)
})

test.each([[true], [false]])(
  `console warning when combining sortSelected=%s and selectedOptionsDraggable`,
  async (sortSelected) => {
    console.warn = vi.fn()

    render(MultiSelect, {
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

      render(MultiSelect, {
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

        render(MultiSelect, {
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
    render(MultiSelect, {
      target: document.body,
      props: { options: selected, selected },
    })

    // every selected should have a remove button
    expect(queryAll(`ul.selected button.remove`)).toHaveLength(selected.length)

    // if more than 1 selected, there should be a remove-all button
    expect(queryAll(`button.remove.remove-all`)).toHaveLength(
      selected.length > 1 ? 1 : 0,
    )
  },
)

test(`errors to console when option is an object but has no label key`, async () => {
  console.error = vi.fn()

  render(MultiSelect, {
    target: document.body,
    // @ts-expect-error test invalid option
    props: { options: [{ foo: 42 }] },
  })

  expect(console.error).toHaveBeenCalledWith(
    `MultiSelect option {"foo":42} is an object but has no label key`,
  )
})

test(`first matching option becomes active automatically on entering searchText`, async () => {
  render(MultiSelect, {
    target: document.body,
    props: { options: [`foo`, `bar`, `baz`] },
  })

  const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  // updates input value
  await fireInput(input)

  // triggers handle_keydown callback (which sets activeIndex)
  await fireKeyDown(input)

  expect(queryWithFail(`ul.options li.active`).textContent?.trim()).toBe(`bar`)
})

test.each<[keyof MultiSelectComponentEvents, string]>([
  [`onadd`, `ul.options li`],
  [`onchange`, `ul.options li`],
  [`onremove`, `ul.selected button.remove`],
  [`onchange`, `ul.selected button.remove`],
  [`onremoveAll`, `button.remove-all`],
  [`onchange`, `button.remove-all`],
])(
  `fires %s event with expected payload when clicking %s`,
  async (event_name, selector) => {
    const is_event = <T extends keyof MultiSelectComponentEvents>(
      name: T,
      event: Parameters<NonNullable<MultiSelectComponentEvents[T]>>[0],
    ): event is Parameters<NonNullable<MultiSelectComponentEvents[T]>>[0] =>
      name === event_name

    const spy = vi.fn((event) => {
      if (
        is_event(`onremoveAll`, event) ||
        (is_event(`onchange`, event) && event.type === `removeAll`)
      ) {
        expect(event.options).toEqual([1, 2])
      } else if (
        is_event(`onremove`, event) ||
        (is_event(`onchange`, event) && event.type === `remove`)
      ) {
        expect(event.option).toEqual(1)
      } else if (
        is_event(`onadd`, event) ||
        (is_event(`onchange`, event) && event.type === `add`)
      ) {
        expect(event.option).toEqual(3)
      }
    })

    render(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        selected: [1, 2],
        [event_name]: spy,
      },
    })

    await fireMouseUp(queryWithFail(selector))

    expect(spy, `event type '${event_name}'`).toHaveBeenCalledTimes(1)
  },
)

describe.each([
  [true, (opt: Option) => opt],
  [false, (opt: Option) => opt],
  [true, JSON.stringify],
  [false, JSON.stringify],
])(`MultiSelect component`, (duplicates, key) => {
  test(`can select the same object option multiple times if duplicates=${duplicates}`, async () => {
    const options: ObjectOption[] = [
      { label: `foo`, id: 1 },
      { label: `foo`, id: 2 },
    ]

    render(MultiSelect, {
      target: document.body,
      props: { options, selected: [{ ...options[0] }], duplicates, key },
    })

    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    await fireKeyDownArrowDown(input)
    await fireKeyDownEnter(input)

    const options_equal = key(options[0]) === key(options[1])
    // 2 options can be selected if they're different or duplicates allowed
    const expected = duplicates || !options_equal ? `foo foo` : `foo`
    const actual = queryWithFail(`ul.selected`).textContent?.trim()
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
            render(MultiSelect, {
              target: document.body,
              props: {
                options: [`foo`],
                selected: [`foo`],
                noMatchingOptionsMsg,
                createOptionMsg,
                allowUserOptions,
              },
            })

            const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
            // create a state where no options match the search text
            input.value = `bar`
            await fireInput(input)

            if (allowUserOptions && createOptionMsg) {
              expect(queryWithFail(`.user-msg`).textContent?.trim()).toBe(
                createOptionMsg,
              )
            } else if (noMatchingOptionsMsg) {
              expect(queryWithFail(`.user-msg`).textContent?.trim()).toBe(
                noMatchingOptionsMsg,
              )
            } else {
              expect(query(`.user-msg`)).toBeNull()
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

    render(MultiSelect, {
      target: document.body,
      props: { options, maxOptions },
    })

    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    await fireInput(input)

    expect(queryAll(`ul.options li`)).toHaveLength(
      Math.min(options.length, maxOptions || options.length),
    )
  },
)

test.each([[true], [-1], [3.5], [`foo`], [{}]])(
  `console.error when maxOptions=%s is not a positive integer or undefined`,
  async (maxOptions) => {
    console.error = vi.fn()

    render(MultiSelect, {
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

test.each([
  // Invalid key cases
  [
    `test-style`,
    `invalid`,
    `test-style;`,
    `MultiSelect: Invalid key=invalid for get_style`,
  ],
  // Valid key cases
  [`test-style`, `selected`, `test-style;`],
  [`test-style`, `option`, `test-style;`],
  [`test-style`, null, `test-style;`],
  // Object style cases
  [
    { selected: `selected-style`, option: `option-style` },
    `selected`,
    `selected-style`,
  ],
  [
    { selected: `selected-style`, option: `option-style` },
    `option`,
    `option-style`,
  ],
  // Invalid object style cases
  [
    { invalid: `invalid-style` },
    `selected`,
    ``,
    `Invalid style object for option=${JSON.stringify({
      style: { invalid: `invalid-style` },
    })}`,
  ],
])(
  `get_style returns and console.errors correctly (%s, %s, %s, %s)`,
  async (style, key, expected, err_msg = ``) => {
    console.error = vi.fn()

    // @ts-expect-error test invalid option
    const result = get_style({ style }, key)

    if (expected.startsWith(`Invalid`) || expected.startsWith(`MultiSelect`)) {
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(err_msg)
    }
    expect(result).toBe(expected)
  },
)

test.each<[OptionStyle, string | null, string]>([
  // Invalid key cases
  [`color: red;`, `invalid`, ``],
  // Valid key cases
  [`color: red;`, `selected`, `color: red;`],
  [`color: red;`, `option`, `color: red;`],
  [`color: red;`, null, `color: red;`],
  // Object style cases
  [
    { selected: `color: red;`, option: `color: blue;` },
    `selected`,
    `color: red;`,
  ],
  [
    { selected: `color: red;`, option: `color: blue;` },
    `option`,
    `color: blue;`,
  ],
  // Invalid object style cases
  [{ invalid: `color: green;` } as unknown as OptionStyle, `selected`, ``],
])(
  `MultiSelect applies correct styles to <li> elements for different option and key combinations`,
  async (style, key, expected_css) => {
    const options: Option[] = [{ label: `foo`, style }]

    render(MultiSelect, {
      target: document.body,
      props: { options, selected: key === `selected` ? options : [] },
    })

    if (key === `selected`) {
      const selected_li = queryWithFail(`ul.selected > li`)
      expect(selected_li.style.cssText).toBe(expected_css)
    } else if (key === `option`) {
      const option_li = queryWithFail(`ul.options > li`)
      expect(option_li.style.cssText).toBe(expected_css)
    }
  },
)

test.each([
  [`style`, `div.multiselect`],
  [`ulSelectedStyle`, `ul.selected`],
  [`ulOptionsStyle`, `ul.options`],
  [`liSelectedStyle`, `ul.selected > li`],
  [`liOptionStyle`, `ul.options > li`],
  [`inputStyle`, `input[autocomplete]`],
])(
  `MultiSelect applies style props to the correct element`,
  async (prop, css_selector) => {
    const css_str = `font-weight: bold; color: red;`

    render(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], [prop]: css_str, selected: [1] },
    })

    const err_msg = `${prop} (${css_selector})`
    const elem = queryWithFail(css_selector)

    expect(elem?.style.cssText, err_msg).toContain(css_str)
  },
)

test.each([true, false, `desktop`] as const)(
  `closeDropdownOnSelect=%s controls input focus and dropdown closing`,
  async (closeDropdownOnSelect) => {
    const { component: select } = render(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], closeDropdownOnSelect },
    })

    // simulate selecting an option
    const first_option = queryWithFail(`ul.options > li`)
    await fireMouseUp(first_option)

    const is_desktop = window.innerWidth > select.breakpoint
    const should_be_closed =
      closeDropdownOnSelect === true ||
      (closeDropdownOnSelect === `desktop` && !is_desktop)

    // check that dropdown is closed when closeDropdownOnSelect = false
    const dropdown = queryWithFail(`ul.options`)
    expect(dropdown.classList.contains(`hidden`)).toBe(should_be_closed)

    // check that input is focused (or not)
    const input = queryWithFail<HTMLInputElement>(`input[autocomplete]`)
    expect(document.activeElement === input).toBe(!should_be_closed)

    if (closeDropdownOnSelect === `desktop`) {
      // reduce window width to simulate mobile
      window.innerWidth = 400
      await fireEvent.resize(window)
      expect(window.innerWidth).toBeLessThan(select.breakpoint)

      // TODO: fix this test, not sure why input is still focused even on mobile
      // expect(document.activeElement === input).toBe(false)
    }
  },
)
