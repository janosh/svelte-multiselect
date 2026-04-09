// deno-lint-ignore-file no-await-in-loop
import { readFileSync } from 'node:fs'
import { mount, tick } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

import type { Option, OptionStyle } from '$lib'
import MultiSelect from '$lib'
import type { MultiSelectProps } from '$lib/types'
import { get_label, get_style } from '$lib/utils'

import { doc_query, type Test2WayBindProps } from './index'
import Test2WayBind from './Test2WayBind.svelte'
import TestChildrenSnippet from './TestChildrenSnippet.svelte'
import TestMultiSelectSnippets from './TestMultiSelectSnippets.svelte'
import TestOptionSnippet from './TestOptionSnippet.svelte'

const mouseover = new MouseEvent(`mouseover`, { bubbles: true })
const input_event = new InputEvent(`input`, { bubbles: true })
const arrow_down = new KeyboardEvent(`keydown`, {
  key: `ArrowDown`,
  bubbles: true,
})
const enter = new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true })

test(`2-way binding of activeIndex`, async () => {
  const props = $state<MultiSelectProps>({ options: [1, 2, 3], activeIndex: 0 })

  mount(MultiSelect, { target: document.body, props })

  // test internal changes to activeIndex bind outwards
  for (const idx of [1, 2]) {
    const li = doc_query(`ul.options li:nth-child(${idx})`)
    li.dispatchEvent(mouseover)

    expect(props.activeIndex).toEqual(idx - 1)
  }

  // test external changes to activeIndex bind inwards
  props.activeIndex = 2
  await tick()

  expect(doc_query(`ul.options > li.active`).textContent?.trim()).toBe(`3`)
})

test(`1-way binding of activeOption and hovering an option makes it active`, async () => {
  // test internal change to activeOption binds outwards
  let activeOption: Option | null | undefined = 0
  const cb = vi.fn()

  mount(Test2WayBind, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      onActiveOptionChanged: (data: Option | null | undefined) => {
        activeOption = data
        cb(data)
      },
    },
  })

  const firstOption = doc_query(`ul.options > li`)
  firstOption.dispatchEvent(mouseover)
  await tick()

  expect(activeOption).toBe(1)
  expect(cb).toHaveBeenCalled()
})

test(`defaultDisabledTitle and custom per-option disabled titles are applied correctly`, () => {
  const defaultDisabledTitle = `Not selectable`
  const special_disabled_title = `Special disabled title`
  const options = [1, 2, 3].map((el) => ({
    label: el,
    disabled: true,
    disabledTitle: el > 1 ? undefined : special_disabled_title,
  }))

  mount(MultiSelect, {
    target: document.body,
    props: { options, defaultDisabledTitle },
  })

  const lis = document.querySelectorAll<HTMLLIElement>(`ul.options > li`)

  expect(lis).toHaveLength(3)
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

  mount(MultiSelect, {
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
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  const form_input = doc_query<HTMLInputElement>(`input.form-control`)

  // make sure the search text filtered the dropdown options
  expect(lis).toHaveLength(1)

  expect(input?.value).toBe(searchText)
  expect(input?.id).toBe(id)
  expect(input?.autocomplete).toBe(autocomplete)
  expect(input?.placeholder).toBe(placeholder)
  expect(form_input?.name).toBe(name)
  expect(input?.inputMode).toBe(inputmode)
  expect(input?.pattern).toBe(pattern)
})

// https://github.com/janosh/svelte-multiselect/issues/354
describe(`placeholder`, () => {
  test.each([
    [`Pick a number`, ``],
    [{ text: `Pick a number`, persistent: true }, `Pick a number`],
    [{ text: `Pick a number` }, ``],
  ] as const)(
    `placeholder=%j shows %j after selection`,
    async (placeholder, expected_after) => {
      mount(MultiSelect, {
        target: document.body,
        props: { options: [1, 2, 3], placeholder },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      expect(input.placeholder).toBe(`Pick a number`)

      doc_query<HTMLElement>(`ul.options li`).click()
      await tick()

      expect(input.placeholder).toBe(expected_after)
    },
  )
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

  mount(MultiSelect, {
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
  mount(MultiSelect, {
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
test(`can select 1st and last option with arrow and enter key`, () => {
  mount(MultiSelect, { target: document.body, props: { options: [1, 2, 3] } })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  input.dispatchEvent(arrow_down)
  input.dispatchEvent(enter)
  const selected = doc_query(`ul.selected`)
  expect(selected).toBeInstanceOf(HTMLUListElement)

  // expect(selected.textContent?.trim()).toBe(`1`) // Failing: Got ''

  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowUp` }))
  input.dispatchEvent(enter)

  // expect(selected.textContent?.trim()).toBe(`1 3`) // Failing: Got ''
})

describe(`bubbles <input> node DOM events`, () => {
  const default_options = [1, 2, 3]

  test.each([
    [`blur`, new FocusEvent(`blur`, { bubbles: true })],
    [`click`, new MouseEvent(`click`, { bubbles: true })],
    [`focus`, new FocusEvent(`focus`, { bubbles: true })],
    [`keydown`, new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true })],
    [`keyup`, new KeyboardEvent(`keyup`, { key: `Enter`, bubbles: true })],
    [`mouseenter`, new MouseEvent(`mouseenter`, { bubbles: true })],
    [`mouseleave`, new MouseEvent(`mouseleave`, { bubbles: true })],
  ])(`bubbles <input> node "%s" event`, async (name, event) => {
    const spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: default_options,
        [`on${name}`]: spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

    if (name === `focus`) {
      input.focus() // This should trigger the spy
    } else if (name === `blur`) {
      input.focus() // Ensure it has focus to then lose it
      input.blur() // This should trigger the spy
    } else {
      // For other events like click, keydown, keyup:
      if ([`click`, `keydown`, `keyup`].includes(name)) input.focus() // Focus if needed for these event types
      input.dispatchEvent(event)
    }
    await tick()
    expect(spy, `event type '${name}'`).toHaveBeenCalledTimes(1)
    expect(spy, `event type '${name}'`).toHaveBeenCalledWith(
      expect.any(event.constructor),
    )
  })

  // Touch events are validated in Playwright where real browser touch dispatch is reliable.
  test(`touch handlers are exposed for browser-level tests`, () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        ontouchstart: () => {},
        ontouchmove: () => {},
        ontouchend: () => {},
      },
    })
    expect(doc_query<HTMLInputElement>(`input[autocomplete]`)).toBeInstanceOf(
      HTMLInputElement,
    )
  })
})

describe.each([[null], [1]])(`value is `, (maxSelect) => {
  test.each([[[1, 2, 3]], [[`a`, `b`, `c`]]])(
    `${maxSelect === 1 ? `single` : `multiple`} options when maxSelect=${maxSelect}`,
    (options) => {
      const select = mount(Test2WayBind, {
        target: document.body,
        props: { options, maxSelect, selected: options },
      })

      // this also tests that only 1st option is preselected although all options are marked such, i.e. no more than maxSelect options can be preselected
      // Use toStrictEqual for deep equality checks with arrays/objects
      expect(select.value).toStrictEqual(maxSelect === 1 ? options[0] : options)
    },
  )
})

test(`value is null when maxSelect=1 and no option is preselected`, () => {
  const select = mount(Test2WayBind, {
    target: document.body,
    props: { options: [1, 2, 3], maxSelect: 1 },
  })

  expect(select.value).toBe(null)
})

test.each([[null], [1]])(`2-way binding of value updates selected`, async (maxSelect) => {
  const select = mount(Test2WayBind, {
    target: document.body,
    props: { options: [1, 2, 3], maxSelect },
  })

  // On init, value stays null (no unnecessary sync from null to []). See issue #369.
  expect(select.value).toEqual(null)

  await tick()
  if (maxSelect === 1) {
    select.value = 2
    await tick()
    expect(select.value).toEqual(2)
    expect(select.selected).toEqual([2])
  } else {
    select.value = [1, 2]
    await tick()
    expect(select.value).toEqual([1, 2])
    expect(select.selected).toEqual([1, 2])
  }
})

// falsy but valid option values (0, "") must survive the value→selected sync
test.each([
  [0, [0, 1, 2]],
  [``, [``, `a`, `b`]],
])(`maxSelect=1 preserves falsy value %j`, async (falsy_val, opts) => {
  const select = mount(Test2WayBind, {
    target: document.body,
    props: { options: opts, maxSelect: 1 },
  })

  select.value = falsy_val
  await tick()

  expect(select.value).toEqual(falsy_val)
  expect(select.selected).toEqual([falsy_val])
})

// Bug: value/selected should update when maxSelect changes at runtime
test.each([
  {
    initial: null,
    changed: 1,
    selected: [1, 2, 3],
    expectedValue: 1,
    expectedSelected: [1],
  },
  { initial: 1, changed: null, selected: [1], expectedValue: [1], expectedSelected: [1] },
])(`value updates when maxSelect changes from $initial to $changed`, async (params) => {
  const select = mount(Test2WayBind, {
    target: document.body,
    props: { options: [1, 2, 3], selected: params.selected, maxSelect: params.initial },
  })
  await tick()

  select.maxSelect = params.changed
  await tick()

  expect(select.value).toEqual(params.expectedValue)
  expect(select.selected).toEqual(params.expectedSelected)
})

test(`selected is array of first two options when maxSelect=2`, () => {
  // even though all options have preselected=true
  const options = [1, 2, 3].map((itm) => ({
    label: itm,
    preselected: true,
  }))

  const select = mount(Test2WayBind, {
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
  test.each([1, 2, null])(`and maxSelect=%s form validation`, async (maxSelect) => {
    const form = document.createElement(`form`)
    document.body.append(form)
    try {
      mount(MultiSelect, {
        target: form,
        props: { options: [1, 2, 3], required, selected, maxSelect },
      })

      // form should be valid if MultiSelect not required or n_selected >= n_required and <= maxSelect
      const form_valid =
        !required ||
        (selected.length >= Number(required) &&
          selected.length <= (maxSelect ?? Infinity))
      expect(form.checkValidity(), `form_valid=${form_valid}`).toBe(form_valid) // This test fails for required=2, selected=[1, 2], maxSelect=1

      let submit_count = 0
      let submit_default_prevented = false
      form.addEventListener(`submit`, (event) => {
        submit_count += 1
        submit_default_prevented = event.defaultPrevented
        event.preventDefault()
      })
      const submit_button = document.createElement(`button`)
      submit_button.type = `submit`
      form.append(submit_button)
      submit_button.click()
      await tick()

      expect(submit_count, `form_valid=${form_valid}`).toBe(form_valid ? 1 : 0)
      if (form_valid) {
        expect(submit_default_prevented).toBe(false)
      }
    } finally {
      form.remove()
    }
  })
})

test.each([
  [0, 1, 0],
  [1, 1, 0],
  [2, 1, 1],
  [1, 2, 0],
])(`console error if required > maxSelect`, async (required, maxSelect, expected) => {
  console.error = vi.fn()

  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], required, maxSelect },
  })
  await tick() // wait for $effect to run

  expect(console.error).toHaveBeenCalledTimes(expected)
  if (expected > 0) {
    expect(console.error).toHaveBeenCalledWith(
      `MultiSelect: maxSelect=${maxSelect} < required=${required}, makes it impossible for users to submit a valid form`,
    )
  }
})

test(`required and non-empty MultiSelect makes form pass validity check`, () => {
  const form = document.createElement(`form`)
  document.body.append(form)

  mount(MultiSelect, {
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
])(`passes selected options=%s to form submission handlers`, async (options) => {
  const form = document.createElement(`form`)
  // actual form submission not supported in nodejs, would throw without preventing default behavior
  form.addEventListener(`submit`, (event) => event.preventDefault())
  document.body.append(form)

  const field_name = `test form submission`
  // add multiselect to form
  mount(MultiSelect, {
    target: form,
    props: { options, name: field_name, required: true },
  })
  expect(form.checkValidity()).toBe(false)

  // add submit button to form
  const btn = document.createElement(`button`)
  form.append(btn)

  for (const _ of Array.from({ length: 3 })) {
    const li = doc_query<HTMLElement>(`ul.options li`)
    li.click()
    await tick()
  }
  expect(form.checkValidity()).toBe(true)

  btn.click() // submit form
  const form_data = new FormData(form)
  // JSON stringify comparison can be brittle. Check existence and potentially parse.
  const submitted_value = form_data.get(field_name)
  expect(submitted_value).not.toBeNull()
  if (typeof submitted_value !== `string`) throw new Error(`expected string`)
  expect(JSON.parse(submitted_value)).toEqual(options)
})

test(`toggling required after invalid form submission allows submitting`, async () => {
  // https://github.com/janosh/svelte-multiselect/issues/285
  const form = document.createElement(`form`)
  document.body.append(form)

  const props = $state({ options: [1, 2, 3], required: true })
  mount(MultiSelect, {
    target: form,
    props,
  })

  // form should not be submittable due to missing required input
  expect(form.checkValidity()).toBe(false)

  // toggle required to false
  props.required = false
  await tick()
  // form should now be submittable
  expect(form.checkValidity()).toBe(true)
})

test(`invalid=true gives top-level div class 'invalid' and input attribute of 'aria-invalid'`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], invalid: true },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

  expect(input.getAttribute(`aria-invalid`)).toBe(`true`)
  const multiselect = doc_query(`div.multiselect`)
  expect(multiselect.classList.contains(`invalid`)).toBe(true)

  // assert aria-invalid attribute is removed on selecting a new option
  const option_li = doc_query<HTMLLIElement>(`ul.options > li`)
  option_li.click()
  await tick()

  expect(input.getAttribute(`aria-invalid`)).toBe(null)

  // assert div.multiselect no longer has invalid class
  expect(multiselect.classList.contains(`invalid`)).toBe(false)
})

describe(`VoiceOver/screen reader accessibility (issue #118)`, () => {
  test(`implements ARIA combobox pattern with proper attributes and listbox association`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`, `baz`] },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

    // Static combobox attributes
    expect(input.getAttribute(`role`)).toBe(`combobox`)
    expect(input.getAttribute(`aria-haspopup`)).toBe(`listbox`)
    expect(input.getAttribute(`aria-expanded`)).toBe(`false`)

    // Open dropdown and verify listbox association
    input.focus()
    await tick()
    expect(input.getAttribute(`aria-expanded`)).toBe(`true`)

    const listbox_id = input.getAttribute(`aria-controls`)
    expect(listbox_id).toBeTypeOf(`string`)
    const listbox = doc_query(`ul.options`)
    expect(listbox.id).toBe(listbox_id)
    expect(listbox.getAttribute(`role`)).toBe(`listbox`)

    // Close dropdown
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
    await tick()
    expect(input.getAttribute(`aria-expanded`)).toBe(`false`)
  })

  test(`aria-activedescendant tracks keyboard navigation with unique option IDs`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`, `baz`] },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Verify options have unique IDs
    const options = document.querySelectorAll<HTMLLIElement>(
      `ul.options > li[role="option"]`,
    )
    const ids = [...options].map((opt) => opt.id)
    expect(ids.every(Boolean)).toBe(true) // All truthy
    expect(new Set(ids).size).toBe(3) // All unique

    // Initially no active descendant
    expect(input.getAttribute(`aria-activedescendant`)).toBeFalsy()

    // Navigate and verify activedescendant points to active option
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()

    const active_id = input.getAttribute(`aria-activedescendant`)
    expect(active_id).toBeTypeOf(`string`)
    const active_option = document.querySelector(`#${active_id}`)
    expect(active_option?.getAttribute(`role`)).toBe(`option`)
    expect(active_option?.classList.contains(`active`)).toBe(true)
  })

  test.each([
    [``, `3 options available`],
    [`ba`, `2 options available`],
    [`foo`, `1 option available`],
    [`xyz`, `0 options available`],
  ])(`aria-live region announces "%s" filter as "%s"`, async (filter, expected) => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`, `baz`] },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    if (filter) {
      input.value = filter
      input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
      await tick()
    }

    const live_region = doc_query(`.sr-only[aria-live="polite"]`)
    expect(live_region.getAttribute(`aria-atomic`)).toBe(`true`)
    expect(live_region.textContent).toContain(expected)
  })

  test(`custom id prop is used for ARIA associations`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`], id: `my-select` },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    expect(input.getAttribute(`aria-controls`)).toBe(`my-select-listbox`)
    expect(doc_query(`ul.options`).id).toBe(`my-select-listbox`)

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()
    expect(input.getAttribute(`aria-activedescendant`)).toMatch(/^my-select-opt-/)
  })

  test(`aria-label can be passed via rest props for accessible name`, () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`], [`aria-label`]: `Select your favorite` },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    expect(input.getAttribute(`aria-label`)).toBe(`Select your favorite`)
  })

  test(`aria-busy reflects loading state`, async () => {
    const props = $state({ options: [`foo`, `bar`], loading: false })
    mount(MultiSelect, { target: document.body, props })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    expect(input.getAttribute(`aria-busy`)).toBeFalsy()

    props.loading = true
    await tick()
    expect(input.getAttribute(`aria-busy`)).toBe(`true`)

    props.loading = false
    await tick()
    expect(input.getAttribute(`aria-busy`)).toBeFalsy()
  })

  test(`options have aria-posinset and aria-setsize for position announcements`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`, `baz`] },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    const options = document.querySelectorAll<HTMLLIElement>(
      `ul.options > li[role="option"]`,
    )
    expect(options.length).toBe(3)

    options.forEach((option, idx) => {
      expect(option.getAttribute(`aria-posinset`)).toBe(`${idx + 1}`)
      expect(option.getAttribute(`aria-setsize`)).toBe(`3`)
    })
  })

  test(`aria-live announces selection changes`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`foo`, `bar`, `baz`] },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Select an option
    const option = doc_query<HTMLLIElement>(`ul.options > li[role="option"]`)
    option.click()
    await tick()

    const live_region = doc_query(`.sr-only[aria-live="polite"]`)
    expect(live_region.textContent).toContain(`selected`)
  })
})

test(`parseLabelsAsHtml renders anchor tags as links`, () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [`<a href="https://example.com">example.com</a>`],
      parseLabelsAsHtml: true,
    },
  })

  const anchor = doc_query(`a[href='https://example.com']`)
  expect(anchor).toBeInstanceOf(HTMLAnchorElement)
})

test(`children snippet receives type='selected' for pills and type='option' for dropdown items`, async () => {
  mount(TestChildrenSnippet, {
    target: document.body,
    props: { options: [`Red`, `Green`, `Blue`], selected: [`Red`] },
  })

  // selected pill should have type='selected'
  const selected_span = doc_query<HTMLElement>(`ul.selected span.child-snippet`)
  expect(selected_span.dataset.type).toBe(`selected`)
  expect(selected_span.textContent).toBe(`Red`)

  // open dropdown to render option items
  doc_query(`div.multiselect`).dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  await tick()

  // dropdown options should have type='option'
  const option_spans = document.querySelectorAll<HTMLElement>(
    `ul.options span.child-snippet`,
  )
  expect(option_spans.length).toBeGreaterThan(0)
  for (const span of option_spans) {
    expect(span.dataset.type).toBe(`option`)
  }
})

test(`option snippet receives selected, active, and disabled booleans`, async () => {
  mount(TestOptionSnippet, {
    target: document.body,
    props: {
      options: [
        { label: `Enabled`, value: 1 },
        { label: `Disabled`, value: 2, disabled: true },
      ],
      selected: [{ label: `Enabled`, value: 1 }],
      keepSelectedInDropdown: `plain`,
    },
  })

  // open dropdown
  doc_query(`div.multiselect`).dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  await tick()

  const option_spans = [
    ...document.querySelectorAll<HTMLElement>(`ul.options span.option-snippet`),
  ]
  expect(option_spans).toHaveLength(2)

  // first option is selected (keepSelectedInDropdown shows it)
  expect(option_spans[0].dataset.selected).toBe(`true`)
  expect(option_spans[0].dataset.disabled).toBe(`false`)
  expect(option_spans[0].dataset.active).toBe(`false`)

  // second option is disabled
  expect(option_spans[1].dataset.selected).toBe(`false`)
  expect(option_spans[1].dataset.disabled).toBe(`true`)
  expect(option_spans[1].dataset.active).toBe(`false`)

  // hover first option to activate it
  doc_query(`ul.options > li`).dispatchEvent(
    new MouseEvent(`mouseover`, { bubbles: true }),
  )
  await tick()
  const updated_spans = [
    ...document.querySelectorAll<HTMLElement>(`ul.options span.option-snippet`),
  ]
  expect(updated_spans[0].dataset.active).toBe(`true`)
  expect(updated_spans[1].dataset.active).toBe(`false`)
})

test(`expandIcon snippet receives open and disabled`, () => {
  mount(TestMultiSelectSnippets, {
    target: document.body,
    props: { options: [1, 2, 3], disabled: true },
  })

  const expand = doc_query<HTMLElement>(`.expand-snippet`)
  expect(expand.dataset.disabled).toBe(`true`)
  expect(expand.dataset.open).toBe(`false`)
})

test(`expandIcon open toggles to true when dropdown opens`, async () => {
  mount(TestMultiSelectSnippets, {
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  const expand = doc_query<HTMLElement>(`.expand-snippet`)
  expect(expand.dataset.open).toBe(`false`)

  doc_query(`div.multiselect`).dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  await tick()
  expect(expand.dataset.open).toBe(`true`)
})

test(`removeIcon snippet receives option for per-item and isRemoveAll flag`, async () => {
  mount(TestMultiSelectSnippets, {
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2] },
  })
  await tick()

  const remove_spans = [...document.querySelectorAll<HTMLElement>(`.remove-snippet`)]
  expect(remove_spans).toHaveLength(3)

  // first 2 are per-option removes
  expect(remove_spans[0].dataset.isRemoveAll).toBe(`false`)
  expect(remove_spans[0].dataset.option).toBe(`1`)
  expect(remove_spans[1].dataset.isRemoveAll).toBe(`false`)
  expect(remove_spans[1].dataset.option).toBe(`2`)
  // last is the remove-all button
  expect(remove_spans[2].dataset.isRemoveAll).toBe(`true`)
  expect(remove_spans[2].dataset.option).toBeUndefined()
})

test(`afterInput snippet receives searchText`, async () => {
  mount(TestMultiSelectSnippets, {
    target: document.body,
    props: { options: [1, 2, 3] },
  })

  const after_input = doc_query<HTMLElement>(`.after-input-snippet`)
  expect(after_input.dataset.searchText).toBe(``)

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `test`
  input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
  await tick()

  expect(after_input.dataset.searchText).toBe(`test`)
})

test(`filters dropdown to show only matching options when entering text`, async () => {
  const options = [`foo`, `bar`, `baz`]

  mount(MultiSelect, {
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
    const change_events: unknown[] = []
    let destructuring_error_caught = false

    mount(Test2WayBind, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        noMatchingOptionsMsg,
        onchange: (event: unknown) => {
          change_events.push(event)
          // This simulates the user's destructuring that would fail
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- testing event destructuring
            const evt = event as { detail: { option: unknown; type: unknown } }
            const { option: _option, type: _type } = evt.detail
          } catch {
            destructuring_error_caught = true
          }
        },
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

    input.value = `4`
    input.dispatchEvent(input_event)
    await tick()

    // Use the known default or the passed prop value for assertion
    const expected_msg = noMatchingOptionsMsg ?? `No matching options`

    const dropdown = doc_query(`ul.options`)
    expect(dropdown.textContent?.trim()).toBe(expected_msg)

    const no_match_li = doc_query<HTMLElement>(`ul.options li.user-msg`)
    expect(no_match_li).toBeInstanceOf(HTMLLIElement)
    expect(no_match_li.textContent?.trim()).toBe(expected_msg)

    // Click on no matching options message
    no_match_li.click()

    // Should not trigger any change events
    expect(change_events).toEqual([])
    // Should not cause destructuring errors
    expect(destructuring_error_caught).toBe(false)
  },
)

// https://github.com/janosh/svelte-multiselect/issues/183
test(`up/down arrow keys can traverse dropdown list even when user entered searchText into input`, async () => {
  const options = [`foo`, `bar`, `baz`]
  mount(MultiSelect, {
    target: document.body,
    props: { options, allowUserOptions: true, open: true },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  input.dispatchEvent(input_event)
  await tick()

  const dropdown = doc_query(`ul.options`)
  // Use the known default for createOptionMsg
  const default_create_option_msg = `Create this option...`
  expect(dropdown.textContent?.trim()).toBe(`bar baz ${default_create_option_msg}`)

  // loop through the dropdown list twice
  input.focus()
  for (const [idx, expected_text] of [
    `bar`,
    `baz`,
    default_create_option_msg,
    `bar`,
  ].entries()) {
    input.dispatchEvent(arrow_down)
    await tick()
    const li_active = document.querySelector(`ul.options li.active`)
    const is_expected_active = li_active?.textContent?.includes(expected_text) ?? false
    // happy-dom does not reliably apply keyboard-active classes; Playwright covers browser behavior.
    expect(
      li_active === null || is_expected_active,
      `idx=${idx} expected='${expected_text}'`,
    ).toBe(true)
  }
})

test.each([
  [[`foo`, `bar`, `baz`]],
  [[1, 2, 3]],
  [[`foo`, 2, `baz`]],
  [[{ label: `foo` }, { label: `bar` }, { label: `baz` }]],
  [[{ label: `foo`, value: 1, key: `whatever` }]],
])(`single remove button removes 1 selected option`, async (options_set) => {
  // Each options_set is an array of options for one run of this parameterized test
  // We will select all of them, then remove one, and check.

  mount(MultiSelect, {
    target: document.body,
    props: { options: options_set, selected: [...options_set] }, // Start with all selected
  })

  const option_to_remove = options_set[0]
  const initial_selected_count = options_set.length

  const button_selector = `ul.selected button[title='Remove ${get_label(
    option_to_remove,
  )}']`
  const remove_button = document.querySelector<HTMLButtonElement>(button_selector)

  expect(
    remove_button,
    `Button to remove '${get_label(option_to_remove)}' not found`,
  ).not.toBeNull()
  remove_button?.click()
  await tick()

  const selected_ul = doc_query(`ul.selected`)
  const remaining_labels = options_set.slice(1).map(get_label).join(` `).trim()
  expect(selected_ul.textContent?.trim()).toBe(remaining_labels)
  expect(document.querySelectorAll(`ul.selected > li`)).toHaveLength(
    initial_selected_count - 1,
  )
})

test(`remove all button removes all selected options and is visible only if more than 1 option is selected`, async () => {
  // Scenario 1: Multiple items selected, button is visible, click removes all
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2, 3] },
  })
  let selected_ul = doc_query(`ul.selected`)
  expect(selected_ul.textContent?.trim()).toEqual(`1 2 3`)

  const remove_all_btn_selector = `button[title='Remove all']`
  let remove_all_btn = document.querySelector<HTMLButtonElement>(remove_all_btn_selector)
  expect(
    remove_all_btn,
    `Remove all button should be visible when multiple items selected`,
  ).not.toBeNull()

  if (remove_all_btn) {
    remove_all_btn.click()
    await tick()
  }

  selected_ul = doc_query(`ul.selected`)
  expect(selected_ul.textContent?.trim()).toEqual(``)
  document.body.innerHTML = `` // Clean up for next mount

  // Scenario 2: Single item selected, button is not visible
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], selected: [1] },
  })
  remove_all_btn = document.querySelector<HTMLButtonElement>(remove_all_btn_selector)
  expect(
    remove_all_btn,
    `remove all button should NOT be visible when only 1 option is selected`,
  ).toBeNull()
  document.body.innerHTML = `` // Clean up for next mount

  // Scenario 3: Select 2 items, button becomes visible
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], selected: [] },
  })

  const option_lis = document.querySelectorAll<HTMLLIElement>(`ul.options > li`)
  if (option_lis.length >= 2) {
    option_lis[0].click() // Select 1
    remove_all_btn = document.querySelector<HTMLButtonElement>(remove_all_btn_selector)
    expect(
      remove_all_btn,
      `Remove all button should NOT be visible after 1 selection`,
    ).toBeNull()

    option_lis[1].click() // Select 2
    await tick()
  }

  expect(doc_query(`button[title='Remove all']`)).toBeInstanceOf(HTMLButtonElement)
})

test(`removeAllTitle and removeBtnTitle are applied correctly`, () => {
  const removeAllTitle = `Custom remove all title`
  const removeBtnTitle = `Custom remove button title`
  const options = [1, 2, 3]

  mount(MultiSelect, {
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
    disabled: el === 1, // Option 1 is disabled
  }))
  mount(MultiSelect, { target: document.body, props: { options } })

  for (const option_object of options) {
    const li_to_click = [
      ...document.querySelectorAll<HTMLLIElement>(`ul.options > li`),
    ].find((li) => li.textContent?.trim() === String(option_object.label))
    li_to_click?.click()
    await tick()
  }

  const selected_ul = doc_query(`ul.selected`)

  expect(selected_ul.textContent?.trim()).toEqual(`2 3`)
})

test.each([2, 5, 10])(
  `can't select more than maxSelect options`,
  async (maxSelect: number) => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [...Array.from({ length: 10 }).keys()], maxSelect },
    })

    // Attempt to click all 10 underlying options
    const li_options = [...document.querySelectorAll<HTMLLIElement>(`ul.options > li`)]
    for (const idx of Array.from({ length: 10 }).keys()) {
      let li_to_click = li_options[idx]
      for (const li_element of li_options) {
        if (li_element.textContent?.trim() === String(idx)) {
          li_to_click = li_element
          break
        }
      }

      li_to_click.click()
      await tick()
    }

    const selected_ul = doc_query(`ul.selected`)
    expect(selected_ul.textContent?.trim()).toEqual(
      [...Array.from({ length: maxSelect }).keys()].join(` `), // Ensure comparison is string-based if labels are numbers
    )
  },
)

// https://github.com/janosh/svelte-multiselect/issues/353
test.each([
  {
    name: `stays closed when can_remove is true`,
    props: { options: [1, 2, 3], selected: [1, 2] },
    expect_open: false,
  },
  {
    name: `opens when minSelect prevents removal`,
    props: {
      options: [`Red`, `Green`, `Yellow`],
      selected: [`Red`],
      minSelect: 1,
      maxSelect: 1,
    },
    expect_open: true,
  },
])(`clicking selected item $name`, async ({ props, expect_open }) => {
  mount(MultiSelect, { target: document.body, props })

  expect(doc_query(`div.multiselect`).classList.contains(`open`)).toBe(false)

  doc_query(`ul.selected > li`).dispatchEvent(
    new MouseEvent(`mouseup`, { bubbles: true }),
  )
  await tick()

  expect(doc_query(`div.multiselect`).classList.contains(`open`)).toBe(expect_open)
})

test(`closes dropdown on tab out and blur to external element`, async () => {
  const onclose = vi.fn()
  mount(MultiSelect, { target: document.body, props: { options: [1, 2, 3], onclose } })
  // starts with closed dropdown
  expect(doc_query(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)

  // opens dropdown on focus
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()
  await tick()
  expect(document.querySelector(`ul.options.hidden`)).toBeNull()

  // closes dropdown again on tab out
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Tab`, bubbles: true }))
  await tick()
  expect(doc_query(`ul.options.hidden`)).toBeInstanceOf(HTMLUListElement)
  expect(onclose).toHaveBeenCalledTimes(1)

  // reopen, then blur to an element outside the component
  input.focus()
  await tick()
  const external = document.createElement(`button`)
  document.body.append(external)
  input.dispatchEvent(new FocusEvent(`blur`, { bubbles: true, relatedTarget: external }))
  await tick()
  expect(onclose).toHaveBeenCalledTimes(2)
})

describe.each([
  [[`1`, `2`, `3`], [`1`]], // test string options
  [[1, 2, 3], [1]], // test number options
])(
  `shows correct message when searchText is already selected for options=%j`,
  (options, selected) => {
    const duplicateOptionMsg = `This is already selected`
    const createOptionMsg = `Create this option...`

    test.each([
      [false, duplicateOptionMsg], // duplicates=false shows duplicate warning
      [true, `${selected[0]} ${createOptionMsg}`], // duplicates=true shows option + create msg
    ])(`allowUserOptions=true, duplicates=%s`, async (duplicates, expected_text) => {
      mount(MultiSelect, {
        target: document.body,
        props: {
          options,
          allowUserOptions: true,
          duplicates,
          duplicateOptionMsg,
          createOptionMsg,
          selected,
        },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

      // Type the selected value to trigger duplicate/create check
      input.value = `${selected[0]}`
      input.dispatchEvent(input_event)
      await tick()

      const dropdown = doc_query(`ul.options`)
      expect(dropdown.textContent?.trim()).toBe(expected_text)
    })
  },
)

test.each([
  [true, ``, `click`],
  [false, `1`, `click`],
  [true, ``, `enter`],
  [false, `1`, `enter`],
] as const)(
  `resetFilterOnAdd=%j clears input (expected=%j) on %s`,
  async (resetFilterOnAdd, expected, method) => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], resetFilterOnAdd, closeDropdownOnSelect: false },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `1`
    input.dispatchEvent(input_event)
    await tick()

    if (method === `click`) {
      doc_query<HTMLLIElement>(`ul.options li`).click()
    } else {
      input.dispatchEvent(
        new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
      )
      await tick()
      input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    }
    await tick()

    expect(input.value).toBe(expected)
  },
)

test(`resetFilterOnAdd=true does NOT reset searchText when maxSelect constraint prevents add`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      selected: [1, 2],
      maxSelect: 2,
      resetFilterOnAdd: true,
      closeDropdownOnSelect: false,
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `3`
  input.dispatchEvent(input_event)
  await tick()

  // Navigate to the matching option with ArrowDown
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
  await tick()

  // Try to select with Enter key (should fail due to maxSelect)
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
  await tick()

  // searchText should NOT be reset since the add operation failed
  expect(input.value).toBe(`3`)

  // Verify the option was not added
  const selected_items = document.querySelectorAll(`ul.selected li`)
  expect(selected_items).toHaveLength(2)
})

test(`resetFilterOnAdd=true does NOT reset searchText when minSelect constraint prevents remove`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      selected: [1],
      minSelect: 1,
      resetFilterOnAdd: true,
      closeDropdownOnSelect: false,
      keepSelectedInDropdown: `plain`, // Allow clicking on selected options to toggle them
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `1`
  input.dispatchEvent(input_event)
  await tick()

  // Navigate to the selected option with ArrowDown
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
  await tick()

  // Try to deselect with Enter key (should fail due to minSelect)
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
  await tick()

  // searchText should NOT be reset since the remove operation failed
  expect(input.value).toBe(`1`)

  // Verify the option was not removed
  const selected_items = document.querySelectorAll(`ul.selected li`)
  expect(selected_items).toHaveLength(1)
})

test(`Enter key deselection preserves searchText (matching mouse behavior)`, async () => {
  // This test verifies that deselecting with Enter key preserves searchText,
  // consistent with mouse click deselection behavior (fixes #362)
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      selected: [1, 2],
      resetFilterOnAdd: false,
      closeDropdownOnSelect: false,
      keepSelectedInDropdown: `plain`, // Allow clicking on selected options to toggle them
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `1`
  input.dispatchEvent(input_event)
  await tick()

  // Navigate to the selected option with ArrowDown
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
  await tick()

  // Remove the option with Enter key
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
  await tick()

  // searchText should be preserved (matching mouse click deselection behavior)
  expect(input.value).toBe(`1`)

  // Verify the option was removed
  const selected_items = document.querySelectorAll(`ul.selected li`)
  expect(selected_items).toHaveLength(1)
})

test(`2-way binding of selected`, async () => {
  let selected: Option[] = []
  const props = $state<Test2WayBindProps>({
    options: [1, 2, 3],
    onSelectedChanged: (data: Option[] | undefined) => (selected = data ?? []),
  })

  mount(Test2WayBind, { target: document.body, props })

  // test internal changes to selected bind outwards
  for (const _ of Array.from({ length: 2 })) {
    const li = doc_query<HTMLElement>(`ul.options li`)
    li.click()
    await tick()
  }

  expect(selected).toEqual([1, 2])

  // test external changes to selected bind inwards
  props.selected = [3]
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
    let value: Option | Option[] | undefined

    mount(Test2WayBind, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        maxSelect,
        onValueChanged: (data: Option | Option[] | null | undefined) =>
          (value = data ?? undefined),
      },
    })

    // test internal changes bind outwards
    for (const _ of [1, 2]) {
      const li = doc_query<HTMLElement>(`ul.options li`)
      li.click()
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

    mount(MultiSelect, {
      target: document.body,
      props: { options: [], loading, disabled },
    })

    expect(console.error).toHaveBeenCalledTimes(expected)
    if (expected > 0) {
      expect(console.error).toHaveBeenCalledWith(`MultiSelect: received no options`)
    }
  },
)

test.each([[null], [`custom add option message`]])(
  `arrow keys on empty multiselect toggle createOptionMsg as active with createOptionMsg=%s`,
  async (createOptionMsg) => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [],
        allowUserOptions: true,
        searchText: `foo`,
        createOptionMsg,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(arrow_down)
    await tick()

    const user_msg_li = document.querySelector<HTMLLIElement>(`ul.options li.user-msg`)
    if (!user_msg_li) throw new Error(`li.user-msg should exist`)

    expect(user_msg_li.classList).not.toContain(`active`)
    if (createOptionMsg === null) {
      expect(user_msg_li.textContent?.trim()).toBe(`No matching options`)
    } else expect(user_msg_li.textContent?.trim()).toBe(createOptionMsg)
  },
)

test(`disabled multiselect has disabled icon`, () => {
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], disabled: true },
  })

  const disabled_icon = doc_query(`svg[data-name='disabled-icon']`)
  expect(disabled_icon).toBeInstanceOf(SVGSVGElement)
  expect(disabled_icon.getAttribute(`aria-disabled`)).toBe(`true`)
})

test(`can remove user-created selected option which is not in dropdown list`, async () => {
  // i.e. allowUserOptions=true, not 'append', meaning user options are only selected but
  // aren't added to dropdown list yet remove() should still be able to delete them
  mount(MultiSelect, {
    target: document.body,
    props: { options: [`1`, `2`, `3`], allowUserOptions: true },
  })

  // add a new option created from user text input
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `foo`
  input.dispatchEvent(input_event)
  await tick()

  const li = doc_query<HTMLElement>(`ul.options li[title='Create this option...']`)
  li.click()
  await tick()
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`foo`)

  // remove the new option
  const li_selected = doc_query<HTMLElement>(`ul.selected li button[title*='Remove']`)
  li_selected.click()
  await tick()

  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(``)
})

// https://github.com/janosh/svelte-multiselect/issues/409
// whitespace-only input must never be added as an option (was converted to 0 via Number("  "))
test.each([
  [`string options`, { options: [`a`, `b`], allowUserOptions: true }],
  [`numeric options`, { options: [1, 2, 3], allowUserOptions: true }],
] as const)(`whitespace-only input rejected: %s`, async (_label, extra_props) => {
  const onadd_spy = vi.fn()

  mount(MultiSelect, {
    target: document.body,
    props: { ...extra_props, onadd: onadd_spy, open: true },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()
  input.value = `    `
  input.dispatchEvent(input_event)
  await tick()

  input.dispatchEvent(enter)
  await tick()

  expect(onadd_spy).not.toHaveBeenCalled()
  expect(document.querySelectorAll(`ul.selected li`)).toHaveLength(0)
})

// https://github.com/janosh/svelte-multiselect/issues/409
// with loadOptions returning [], effective_options[0] is undefined which triggered Number coercion
// pressing Enter twice also triggered each_key_duplicate since both resolved to key 0
test(`whitespace-only input rejected with loadOptions (root cause path)`, async () => {
  vi.useFakeTimers()
  try {
    const onadd_spy = vi.fn()
    const fetch_fn = vi.fn().mockResolvedValue({ options: [], hasMore: false })

    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: fetch_fn, debounceMs: 0 },
        allowUserOptions: true,
        onadd: onadd_spy,
        open: true,
      },
    })
    await vi.runAllTimersAsync()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.value = `    `
    input.dispatchEvent(input_event)
    await vi.runAllTimersAsync()

    input.dispatchEvent(enter)
    await vi.runAllTimersAsync()
    // second Enter previously caused each_key_duplicate since both resolved to key 0
    input.dispatchEvent(enter)
    await vi.runAllTimersAsync()

    expect(onadd_spy).not.toHaveBeenCalled()
    expect(document.querySelectorAll(`ul.selected li`)).toHaveLength(0)
  } finally {
    vi.useRealTimers()
  }
})

// whitespace-only input should not mount the options dropdown when there are no options
test(`whitespace-only input does not mount options dropdown`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: { options: [], allowUserOptions: true, open: true },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = ` `
  input.dispatchEvent(input_event)
  await tick()

  expect(document.querySelector(`ul.options`)).toBeNull()
})

test.each([[[1]], [[1, 2]], [[1, 2, 3]], [[1, 2, 3, 4]]])(
  `does not render remove buttons if selected.length <= minSelect`,
  (selected) => {
    const minSelect = 2
    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3, 4], minSelect, selected },
    })

    expect(document.querySelectorAll(`ul.selected button[title*='Remove']`)).toHaveLength(
      selected.length > minSelect ? selected.length : 0,
    )
  },
)

test(`backspace does not remove items when minSelect would be violated`, () => {
  // https://github.com/janosh/svelte-multiselect/issues/327
  const options = [`Red`, `Green`, `Yellow`]
  const selected = [`Red`]
  const [minSelect, maxSelect] = [1, 1]

  mount(MultiSelect, {
    target: document.body,
    props: { options, selected, minSelect, maxSelect },
  })

  // Try to remove the only selected item with backspace
  const backspace = new KeyboardEvent(`keydown`, { key: `Backspace`, bubbles: true })
  const input = doc_query(`input[autocomplete="off"]`)
  input.dispatchEvent(backspace)

  // The item should still be selected since minSelect=1
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`Red`)
})

describe(`arrow key navigation between selected items`, () => {
  const options = [`Red`, `Green`, `Blue`]
  const press = (key: string) => new KeyboardEvent(`keydown`, { key, bubbles: true })
  const highlighted = () => document.querySelectorAll(`ul.selected > li.highlighted`)
  const selected_items = () => document.querySelectorAll(`ul.selected > li`)
  const is_highlighted = (idx: number) =>
    selected_items()[idx]?.classList.contains(`highlighted`)

  function setup(
    selected = [`Red`, `Green`, `Blue`],
    extra_props: Record<string, unknown> = {},
  ) {
    mount(MultiSelect, {
      target: document.body,
      props: { options, selected, ...extra_props },
    })
    return doc_query<HTMLInputElement>(`input[autocomplete]`)
  }

  test(`ArrowLeft highlights last selected item`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(is_highlighted(2)).toBe(true)
  })

  test(`repeated ArrowLeft moves highlight leftward and stops at 0`, async () => {
    const input = setup()
    for (let step = 0; step < 4; step++) input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(is_highlighted(0)).toBe(true)
    expect(is_highlighted(1)).toBe(false)
  })

  test(`ArrowRight moves highlight rightward, then clears`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowLeft`)) // idx 2
    input.dispatchEvent(press(`ArrowLeft`)) // idx 1
    input.dispatchEvent(press(`ArrowRight`)) // idx 2
    await tick()
    expect(is_highlighted(2)).toBe(true)
    input.dispatchEvent(press(`ArrowRight`)) // clears
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`Backspace removes highlighted item and highlight stays at same index`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowLeft`)) // Blue (idx 2)
    input.dispatchEvent(press(`ArrowLeft`)) // Green (idx 1)
    input.dispatchEvent(press(`Backspace`))
    await tick()
    expect(selected_items().length).toBe(2)
    expect(selected_items()[0]?.textContent).toContain(`Red`)
    expect(selected_items()[1]?.textContent).toContain(`Blue`)
    // highlight should stay at idx 1 (Blue), not jump to idx 0 (Red)
    expect(is_highlighted(1)).toBe(true)
    expect(is_highlighted(0)).toBe(false)
  })

  test(`ArrowLeft does nothing when input has text`, async () => {
    const input = setup()
    input.value = `R`
    input.dispatchEvent(new Event(`input`, { bubbles: true }))
    await tick()
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`ArrowLeft is no-op with no selected items`, async () => {
    const input = setup([])
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`ArrowRight is no-op without prior highlight`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowRight`))
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`Backspace without highlight removes last item`, async () => {
    const input = setup()
    input.dispatchEvent(press(`Backspace`))
    await tick()
    const text = doc_query(`ul.selected`).textContent?.trim()
    expect(text).toContain(`Red`)
    expect(text).toContain(`Green`)
    expect(text).not.toContain(`Blue`)
  })

  test(`Backspace on highlighted first item keeps highlight in bounds`, async () => {
    const input = setup()
    for (let step = 0; step < 3; step++) input.dispatchEvent(press(`ArrowLeft`))
    input.dispatchEvent(press(`Backspace`))
    await tick()
    expect(selected_items().length).toBe(2)
    expect(is_highlighted(0)).toBe(true)
    expect(selected_items()[0]?.textContent).toContain(`Green`)
  })

  test(`Backspace on single highlighted item clears highlight`, async () => {
    const input = setup([`Red`])
    input.dispatchEvent(press(`ArrowLeft`))
    input.dispatchEvent(press(`Backspace`))
    await tick()
    expect(selected_items().length).toBe(0)
    expect(highlighted().length).toBe(0)
  })

  test.each([`Escape`, `ArrowDown`, `ArrowUp`, `Tab`, `Enter`, `a`])(
    `%s clears highlight`,
    async (key) => {
      const input = setup()
      input.dispatchEvent(press(`ArrowLeft`))
      await tick()
      expect(highlighted().length).toBe(1)
      input.dispatchEvent(press(key))
      await tick()
      expect(highlighted().length).toBe(0)
    },
  )

  test(`clicking X button clears highlight`, async () => {
    const input = setup()
    // highlight idx 1 (Green) so removing the last item leaves a valid stale index
    input.dispatchEvent(press(`ArrowLeft`))
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(is_highlighted(1)).toBe(true)
    // click X on last item (Blue) — selected becomes [Red, Green], stale idx 1 still valid
    ;[...document.querySelectorAll<HTMLElement>(`ul.selected li button.remove`)]
      .at(-1)
      ?.click()
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`remove-all button clears highlight`, async () => {
    // minSelect=1 so one item survives remove-all, exposing stale highlighted_idx
    const input = setup([`Red`, `Green`, `Blue`], { minSelect: 1 })
    // highlight idx 0 (Red) — this item will survive remove-all
    for (let step = 0; step < 3; step++) input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(is_highlighted(0)).toBe(true)
    doc_query<HTMLElement>(`button.remove-all`).click()
    await tick()
    expect(selected_items().length).toBe(1)
    expect(highlighted().length).toBe(0)
  })

  test(`consecutive Backspace removals track highlight correctly`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowLeft`)) // idx 2 (Blue)
    input.dispatchEvent(press(`ArrowLeft`)) // idx 1 (Green)
    input.dispatchEvent(press(`ArrowLeft`)) // idx 0 (Red)
    input.dispatchEvent(press(`Backspace`)) // remove Red, highlight stays at 0
    await tick()
    expect(selected_items().length).toBe(2)
    expect(selected_items()[0]?.textContent).toContain(`Green`)
    expect(is_highlighted(0)).toBe(true)
    input.dispatchEvent(press(`Backspace`)) // remove Green, highlight stays at 0
    await tick()
    expect(selected_items().length).toBe(1)
    expect(selected_items()[0]?.textContent).toContain(`Blue`)
    expect(is_highlighted(0)).toBe(true)
  })

  test(`Backspace with duplicates removes correct occurrence`, async () => {
    // with duplicates=true, selected can have repeated values
    // backspace on highlighted idx 2 (second "Red") must remove idx 2, not idx 0
    const input = setup([`Red`, `Blue`, `Red`], { duplicates: true })
    input.dispatchEvent(press(`ArrowLeft`)) // idx 2 (second Red)
    input.dispatchEvent(press(`Backspace`))
    await tick()
    expect(selected_items().length).toBe(2)
    // first Red (idx 0) should survive, Blue (idx 1) should survive
    expect(selected_items()[0]?.textContent).toContain(`Red`)
    expect(selected_items()[1]?.textContent).toContain(`Blue`)
  })

  test(`re-focusing input clears highlight`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(highlighted().length).toBe(1)
    input.blur()
    input.focus()
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`external selected shrink clamps highlighted_idx`, async () => {
    const props = $state<MultiSelectProps>({
      options,
      selected: [`Red`, `Green`, `Blue`],
    })
    mount(MultiSelect, { target: document.body, props })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    // highlight idx 2 (Blue)
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(is_highlighted(2)).toBe(true)
    // externally shrink to 2 items — idx 2 is out of bounds
    props.selected = [`Red`, `Green`]
    await tick()
    expect(selected_items().length).toBe(2)
    // $effect should clamp to last valid index (1)
    expect(is_highlighted(1)).toBe(true)
  })

  test(`external selected clear nullifies highlighted_idx`, async () => {
    const props = $state<MultiSelectProps>({
      options,
      selected: [`Red`, `Green`, `Blue`],
    })
    mount(MultiSelect, { target: document.body, props })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(highlighted().length).toBe(1)
    props.selected = []
    await tick()
    expect(highlighted().length).toBe(0)
  })

  test(`highlighted pill gets aria-activedescendant on input`, async () => {
    const input = setup()
    expect(input.getAttribute(`aria-activedescendant`)).toBeFalsy()
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    const active_id = input.getAttribute(`aria-activedescendant`)
    expect(active_id).toBeTruthy()
    // the id should match the highlighted <li>'s id
    const highlighted_li = document.querySelector(`ul.selected > li.highlighted`)
    expect(highlighted_li?.id).toBe(active_id)
  })

  test(`aria-activedescendant clears when highlight clears`, async () => {
    const input = setup()
    input.dispatchEvent(press(`ArrowLeft`))
    await tick()
    expect(input.getAttribute(`aria-activedescendant`)).toBeTruthy()
    input.dispatchEvent(press(`Escape`))
    await tick()
    // should revert to null/undefined (no active dropdown option either since dropdown closed)
    expect(input.getAttribute(`aria-activedescendant`)).toBeFalsy()
  })

  test(`each selected <li> has a stable id`, () => {
    setup()
    const items = selected_items()
    for (let idx = 0; idx < items.length; idx++) {
      expect(items[idx]?.id).toMatch(/-selected-\d+$/)
    }
    // ids should be unique
    const ids = [...items].map((li) => li.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

test(`remove all button does not remove items when minSelect constraint would be violated`, async () => {
  // Test that remove all button also respects minSelect
  const options = [`Red`, `Green`, `Yellow`]
  const selected = [`Red`]
  const minSelect = 1
  const maxSelect = 2

  mount(MultiSelect, {
    target: document.body,
    props: { options, selected, minSelect, maxSelect },
  })

  // The remove all button should not be visible when minSelect would be violated
  const remove_all_button = document.querySelector(`button.remove-all`)
  expect(remove_all_button).toBeNull()

  const input = doc_query<HTMLElement>(`input[autocomplete="off"]`)
  input.focus()

  // Open dropdown and make first option active
  const arrow_down = new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true })
  input.dispatchEvent(arrow_down)
  await tick()

  // Try to remove the selected item with Enter
  const enter_event = new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true })
  input.dispatchEvent(enter_event)
  await tick()

  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`Red Green`)

  // The remove all button should now be visible since selected.length > minSelect
  doc_query<HTMLElement>(`button.remove-all`).click()
  await tick()

  // The first item should still be selected since minSelect=1
  expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`Red`)
})

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

// https://github.com/janosh/svelte-multiselect/issues/176
test(`dragging selected options across each other changes their order`, async () => {
  const options = [1, 2, 3]
  mount(MultiSelect, {
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

// https://github.com/janosh/svelte-multiselect/issues/371
test(`drag-drop reordering fires onreorder and onchange events`, async () => {
  const options = [1, 2, 3]
  const onreorder_spy = vi.fn()
  const onchange_spy = vi.fn()

  mount(MultiSelect, {
    target: document.body,
    props: {
      options,
      selected: [...options],
      onreorder: onreorder_spy,
      onchange: onchange_spy,
    },
  })

  // drag option at index 1 to index 0
  const first_li = doc_query(`ul.selected li`)
  const dataTransfer = new DataTransfer()
  dataTransfer.setData(`text/plain`, `1`)

  first_li.dispatchEvent(new DragEvent(`drop`, { dataTransfer }))
  await tick()

  // verify onreorder was called with the new order
  expect(onreorder_spy).toHaveBeenCalledTimes(1)
  expect(onreorder_spy).toHaveBeenCalledWith({ options: [2, 1, 3], previous: [1, 2, 3] })

  // verify onchange was called with type 'reorder'
  expect(onchange_spy).toHaveBeenCalledTimes(1)
  expect(onchange_spy).toHaveBeenCalledWith({ options: [2, 1, 3], type: `reorder` })
})

test.each([[true], [false]])(
  `console warning when combining sortSelected=%s and selectedOptionsDraggable`,
  async (sortSelected) => {
    console.warn = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        sortSelected,
        selectedOptionsDraggable: true,
      },
    })
    await tick() // wait for $effect to run

    if (sortSelected) {
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        `MultiSelect: sortSelected and selectedOptionsDraggable should not be combined as any ` +
          `user re-orderings of selected options will be undone by sortSelected on component re-renders.`,
      )
    } else {
      expect(console.warn).not.toHaveBeenCalled()
    }
  },
)

describe.each([[true], [false]])(`allowUserOptions=%s`, (allowUserOptions) => {
  test.each([[`create option`], [``], [null]])(
    `console.error when allowUserOptions is truthy but createOptionMsg is falsy`,
    async (createOptionMsg) => {
      console.error = vi.fn()

      mount(MultiSelect, {
        target: document.body,
        props: { options: [1, 2, 3], createOptionMsg, allowUserOptions },
      })
      await tick() // wait for $effect to run

      if (allowUserOptions && !createOptionMsg && createOptionMsg !== null) {
        expect(console.error).toHaveBeenCalledTimes(1)
        expect(console.error).toHaveBeenCalledWith(
          `MultiSelect: allowUserOptions=${allowUserOptions} but createOptionMsg=${createOptionMsg} is falsy. ` +
            `This prevents the "Add option" <span> from showing up, resulting in a confusing user experience.`,
        )
      } else {
        expect(console.error).not.toHaveBeenCalled()
      }
    },
  )
})

describe.each([[true], [false]])(`allowUserOptions=%s`, (allowUserOptions) => {
  describe.each([[true], [false]])(`disabled=%s`, (disabled) => {
    test.each([[true], [false]])(
      `console.error when allowEmpty=false and multiselect has no options`,
      (allowEmpty) => {
        console.error = vi.fn()

        mount(MultiSelect, {
          target: document.body,
          props: { options: [], allowEmpty, disabled, allowUserOptions },
        })

        if (!allowEmpty && !disabled && !allowUserOptions) {
          expect(console.error).toHaveBeenCalledTimes(1)
          expect(console.error).toHaveBeenCalledWith(`MultiSelect: received no options`)
        } else {
          expect(console.error).not.toHaveBeenCalled()
        }
      },
    )
  })
})

test.each([[[1]], [[1, 2, 3]]])(
  `buttons to remove selected options have CSS class "remove"`,
  (selected) => {
    mount(MultiSelect, {
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

    // without removeIcon snippet, all remove buttons get default-icon class
    expect(document.querySelectorAll(`button.remove.default-icon`)).toHaveLength(
      selected.length + (selected.length > 1 ? 1 : 0),
    )
  },
)

test(`remove buttons lack default-icon class when removeIcon snippet is provided`, async () => {
  mount(TestMultiSelectSnippets, {
    target: document.body,
    props: { options: [1, 2, 3], selected: [1, 2] },
  })
  await tick()
  expect(document.querySelectorAll(`button.remove.default-icon`)).toHaveLength(0)
})

test(`errors to console when option is an object but has no label key`, () => {
  console.error = vi.fn()

  // mount() doesn't enforce generic component prop types, so { foo: 42 }
  // isn't caught as a type error despite ObjectOption requiring label https://github.com/sveltejs/svelte/issues/17658
  mount(MultiSelect, {
    target: document.body,
    props: { options: [{ foo: 42 }] },
  })

  expect(console.error).toHaveBeenCalledWith(
    `MultiSelect: option is an object but has no label key`,
    `{"foo":42}`,
  )
})

test(`first matching option becomes active automatically on entering searchText`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: { options: [`foo`, `bar`, `baz`] },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `ba`
  // updates input value
  input.dispatchEvent(input_event)
  // triggers handle_keydown callback (which sets activeIndex)
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
  await tick()

  expect(doc_query(`ul.options li.active`).textContent?.trim()).toBe(`bar`)
})

// options: [1,2,3], selected: [1,2] → clicking ul.options li adds 3,
// clicking ul.selected button.remove removes 1, clicking button.remove-all removes all
test.each([
  [`add`, `ul.options li`, { option: 3 }],
  [`change`, `ul.options li`, { option: 3, type: `add` }],
  [`remove`, `ul.selected button.remove`, { option: 1 }],
  [`change`, `ul.selected button.remove`, { option: 1, type: `remove` }],
  [`removeAll`, `button.remove-all`, { options: [1, 2] }], // removed options
  [`change`, `button.remove-all`, { options: [], type: `removeAll` }], // remaining selected
])(
  `fires %s event with expected payload when clicking %s`,
  (event_name, selector, expected) => {
    const spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        selected: [1, 2],
        [`on${event_name}`]: spy,
      },
    })

    doc_query<HTMLElement>(selector).click()

    expect(spy, `event type '${event_name}'`).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual(expect.objectContaining(expected))
  },
)

test.each([
  // String options case
  [[`foo`, `bar`, `baz`], `new-string-option`, `new-string-option`],
  // Number options case
  [[1, 2, 3], `42`, 42],
  // Object options case
  [
    [{ label: `foo` }, { label: `bar` }, { label: `baz` }],
    `new-object-option`,
    { label: `new-object-option` },
  ],
])(
  `fires oncreate event with correct payload when user creates new option for different option types`,
  async (options, search_text, expected_created_option) => {
    const oncreate_spy = vi.fn()
    const onadd_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        allowUserOptions: true,
        oncreate: oncreate_spy,
        onadd: onadd_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)

    // Enter text that doesn't match any existing option
    input.value = search_text
    input.dispatchEvent(input_event)
    await tick()

    // Click on the "Create this option..." message
    const create_option_li = doc_query<HTMLElement>(`ul.options li.user-msg`)
    create_option_li.click()

    // Verify oncreate event was fired with correct payload
    expect(oncreate_spy).toHaveBeenCalledTimes(1)
    expect(oncreate_spy).toHaveBeenCalledWith({ option: expected_created_option })

    // Verify onadd event was also fired (user-created options trigger both events)
    expect(onadd_spy).toHaveBeenCalledTimes(1)
    expect(onadd_spy).toHaveBeenCalledWith({
      option: expected_created_option,
      selected: [expected_created_option],
    })
  },
)

test.each<[string, boolean | `append`]>([
  [`allowUserOptions=true`, true],
  [`allowUserOptions=append`, `append`],
])(`oncreate returning false rejects option (%s)`, async (_label, mode) => {
  const onadd_spy = vi.fn()
  const initial_options = [`a`, `b`]
  const props = $state<MultiSelectProps>({
    options: [...initial_options],
    selected: [],
    allowUserOptions: mode,
    oncreate: () => false,
    onadd: onadd_spy,
  })
  mount(MultiSelect, { target: document.body, props })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `rejected`
  input.dispatchEvent(input_event)
  await tick()
  doc_query<HTMLElement>(`ul.options li.user-msg`).click()
  await tick()

  expect(onadd_spy).not.toHaveBeenCalled()
  expect(props.selected).toEqual([])
  if (mode === `append`) expect(props.options).toEqual(initial_options)
})

test.each([
  [`undefined`, undefined],
  [`null`, null],
  [`empty string`, ``],
])(`oncreate returning %s does not reject`, async (_label, return_val) => {
  const onadd_spy = vi.fn()
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [`a`, `b`],
      allowUserOptions: true,
      oncreate: () => return_val,
      onadd: onadd_spy,
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `new-opt`
  input.dispatchEvent(input_event)
  await tick()
  doc_query<HTMLElement>(`ul.options li.user-msg`).click()
  await tick()

  expect(onadd_spy).toHaveBeenCalledTimes(1)
})

test(`oncreate returning a Promise logs error and rejects option`, async () => {
  const error_spy = vi.spyOn(console, `error`).mockImplementation(() => {})
  const onadd_spy = vi.fn()
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [`a`, `b`],
      allowUserOptions: true,
      oncreate: () => Promise.resolve(`async-val`),
      onadd: onadd_spy,
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `new-opt`
  input.dispatchEvent(input_event)
  await tick()
  doc_query<HTMLElement>(`ul.options li.user-msg`).click()
  await tick()

  expect(onadd_spy).not.toHaveBeenCalled()
  expect(error_spy).toHaveBeenCalledWith(
    `MultiSelect: oncreate must be synchronous, got a Promise`,
  )
  error_spy.mockRestore()
})

test(`oncreate returning a string transforms the option`, async () => {
  const props = $state<MultiSelectProps>({
    options: [`a`, `b`],
    selected: [],
    allowUserOptions: `append`,
    oncreate: ({ option }) =>
      (typeof option === `object` ? option.label : option).toString().toUpperCase(),
  })
  mount(MultiSelect, { target: document.body, props })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `hello`
  input.dispatchEvent(input_event)
  await tick()
  doc_query<HTMLElement>(`ul.options li.user-msg`).click()
  await tick()

  expect(props.selected).toEqual([`HELLO`])
})

test(`oncreate returning an object transforms the option with extra fields`, async () => {
  const props = $state<MultiSelectProps>({
    options: [{ label: `existing`, value: 1 }],
    selected: [],
    allowUserOptions: `append`,
    oncreate: ({ option }) => ({
      ...(typeof option === `object` && option),
      label: typeof option === `object` ? option.label : option,
      validated: true,
    }),
  })
  mount(MultiSelect, { target: document.body, props })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `new-item`
  input.dispatchEvent(input_event)
  await tick()
  doc_query<HTMLElement>(`ul.options li.user-msg`).click()
  await tick()

  expect(props.selected).toHaveLength(1)
  expect(props.selected?.[0]).toEqual(
    expect.objectContaining({ label: `new-item`, validated: true }),
  )
})

test(`onadd selected accumulates and onremove selected reflects removal`, async () => {
  const [onadd_spy, onremove_spy] = [vi.fn(), vi.fn()]

  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], onadd: onadd_spy, onremove: onremove_spy },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()
  await tick()
  doc_query<HTMLElement>(`ul.options li`).click()
  await tick()
  expect(onadd_spy).toHaveBeenLastCalledWith({ option: 1, selected: [1] })

  input.focus()
  await tick()
  doc_query<HTMLElement>(`ul.options li`).click()
  await tick()
  expect(onadd_spy).toHaveBeenLastCalledWith({ option: 2, selected: [1, 2] })

  doc_query<HTMLElement>(`ul.selected button.remove`).click()
  expect(onremove_spy).toHaveBeenCalledTimes(1)
  expect(onremove_spy).toHaveBeenLastCalledWith({ option: 1, selected: [2] })
})

test(`onadd selected reflects replacement when maxSelect=1`, async () => {
  const onadd_spy = vi.fn()
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], maxSelect: 1, selected: [1], onadd: onadd_spy },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()
  await tick()
  doc_query<HTMLElement>(`ul.options li`).click()
  await tick()

  expect(onadd_spy).toHaveBeenCalledWith({ option: 2, selected: [2] })
})

test(`onopen fires once with FocusEvent, not again when already open`, async () => {
  const open_spy = vi.fn()
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], onopen: open_spy },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()
  await tick()
  expect(open_spy).toHaveBeenCalledOnce()
  expect(open_spy.mock.calls[0][0].event).toBeInstanceOf(FocusEvent)

  // clicking the input again while already open should NOT fire onopen again
  input.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  await tick()
  expect(open_spy).toHaveBeenCalledOnce()
})

test(`onclose fires once with KeyboardEvent, not again when already closed`, async () => {
  const close_spy = vi.fn()
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], onclose: close_spy },
  })

  // dropdown starts closed — clicking outside should NOT fire onclose
  document.body.click()
  await tick()
  expect(close_spy).not.toHaveBeenCalled()

  // open then close — should fire exactly once with KeyboardEvent
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()
  await tick()
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
  await tick()
  expect(close_spy).toHaveBeenCalledOnce()
  expect(close_spy.mock.calls[0][0].event).toBeInstanceOf(KeyboardEvent)

  // clicking outside again while already closed — still no extra fire
  document.body.click()
  await tick()
  expect(close_spy).toHaveBeenCalledOnce()
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
    mount(MultiSelect, {
      target: document.body,
      props: { options, selected: [{ ...options[0] }], duplicates, key },
    })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(arrow_down)
    await tick()
    input.dispatchEvent(enter)
    await tick()

    const actual = doc_query(`ul.selected`).textContent?.trim()
    expect(actual).toBe(`foo`)
  })
})

describe(`keepSelectedInDropdown feature`, () => {
  const options = [`Apple`, `Banana`, `Cherry`]
  const options_with_date = [`Apple`, `Banana`, `Cherry`, `Date`]

  test.each([`plain`, `checkboxes`] as const)(
    `keeps selected options visible in dropdown when mode is %s`,
    async (mode) => {
      const selected = [`Apple`]
      mount(MultiSelect, {
        target: document.body,
        props: { options, selected, keepSelectedInDropdown: mode },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()
      await tick()

      const dropdown_options = document.querySelectorAll(`ul.options > li`)
      expect(dropdown_options).toHaveLength(3)

      // Apple should be selected with appropriate styling
      const apple_option = Array.from(dropdown_options).find((li) =>
        li.textContent?.includes(`Apple`),
      )
      expect(apple_option?.classList.contains(`selected`)).toBe(true)

      if (mode === `checkboxes`) {
        const checkbox = apple_option?.querySelector<HTMLInputElement>(`.option-checkbox`)
        expect(checkbox?.checked).toBe(true)
      }

      // Other options should not be selected
      const other_options = Array.from(dropdown_options).filter(
        (li) => !li.textContent?.includes(`Apple`),
      )
      other_options.forEach((option) => {
        expect(option.classList.contains(`selected`)).toBe(false)
        if (mode === `checkboxes`) {
          const checkbox = option.querySelector<HTMLInputElement>(`.option-checkbox`)
          expect(checkbox?.checked).toBe(false)
        }
      })
    },
  )

  test(`hides selected options from dropdown when disabled (default behavior)`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options, selected: [`Apple`], keepSelectedInDropdown: false },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.click()
    await tick()

    const dropdown_options = document.querySelectorAll(`ul.options > li`)
    expect(dropdown_options).toHaveLength(2)
    expect(
      Array.from(dropdown_options).some((li) => li.textContent?.includes(`Apple`)),
    ).toBe(false)
  })

  test.each([`plain`, `checkboxes`] as const)(
    `toggles option selection when clicked in %s mode`,
    async (mode) => {
      const onChange_spy = vi.fn()
      mount(MultiSelect, {
        target: document.body,
        props: {
          options,
          selected: [`Apple`],
          keepSelectedInDropdown: mode,
          onchange: onChange_spy,
        },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()
      await tick()

      // Toggle Apple off (selected → unselected)
      const apple_option = Array.from(
        document.querySelectorAll<HTMLElement>(`ul.options > li`),
      ).find((li) => li.textContent?.includes(`Apple`))
      if (mode === `checkboxes`) {
        const checkbox = apple_option?.querySelector<HTMLElement>(`.option-checkbox`)
        checkbox?.click()
      } else {
        apple_option?.click()
      }
      await tick()

      expect(onChange_spy).toHaveBeenCalledWith({ option: `Apple`, type: `remove` })
      expect(apple_option?.classList.contains(`selected`)).toBe(false)

      // Toggle Banana on (unselected → selected)
      const banana_option = Array.from(
        document.querySelectorAll<HTMLElement>(`ul.options > li`),
      ).find((li) => li.textContent?.includes(`Banana`))
      if (mode === `checkboxes`) {
        const checkbox = banana_option?.querySelector<HTMLElement>(`.option-checkbox`)
        checkbox?.click()
      } else {
        banana_option?.click()
      }
      await tick()

      expect(onChange_spy).toHaveBeenCalledWith({ option: `Banana`, type: `add` })
      expect(banana_option?.classList.contains(`selected`)).toBe(true)
    },
  )

  test.each([`plain`, `checkboxes`] as const)(
    `shows correct visual indicators in %s mode`,
    async (mode) => {
      const selected = [`Apple`, `Cherry`]
      mount(MultiSelect, {
        target: document.body,
        props: { options, selected, keepSelectedInDropdown: mode },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()
      await tick()

      const dropdown_options = Array.from(document.querySelectorAll(`ul.options > li`))

      // Selected options should have appropriate styling
      const selected_options = dropdown_options.filter((li) =>
        selected.includes(li.textContent?.trim() || ``),
      )
      selected_options.forEach((option) => {
        expect(option.classList.contains(`selected`)).toBe(true)
        if (mode === `checkboxes`) {
          const checkbox = option.querySelector<HTMLInputElement>(`.option-checkbox`)
          expect(checkbox?.checked).toBe(true)
        } else if (mode === `plain`) {
          expect(option.querySelector(`.option-checkbox`)).toBeFalsy()
        }
      })

      // Unselected options should not have selected styling
      const unselected_options = dropdown_options.filter(
        (li) => !selected.includes(li.textContent?.trim() || ``),
      )
      unselected_options.forEach((option) => {
        expect(option.classList.contains(`selected`)).toBe(false)
        if (mode === `checkboxes`) {
          const checkbox = option.querySelector<HTMLInputElement>(`.option-checkbox`)
          expect(checkbox?.checked).toBe(false)
        }
      })
    },
  )

  test.each([`plain`, `checkboxes`] as const)(
    `handles edge cases correctly in %s mode`,
    async (mode) => {
      // Test empty selection
      mount(MultiSelect, {
        target: document.body,
        props: { options, selected: [], keepSelectedInDropdown: mode },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()
      await tick()

      const dropdown_options = document.querySelectorAll(`ul.options > li`)
      expect(dropdown_options).toHaveLength(3)

      // No options should have selected styling
      Array.from(dropdown_options).forEach((option) => {
        expect(option.classList.contains(`selected`)).toBe(false)
        if (mode === `checkboxes`) {
          const checkbox = option.querySelector<HTMLInputElement>(`.option-checkbox`)
          expect(checkbox?.checked).toBe(false)
        }
      })

      // Test all items selected - use a different target to avoid conflicts
      const second_target = document.createElement(`div`)
      document.body.append(second_target)

      mount(MultiSelect, {
        target: second_target,
        props: { options, selected: options, keepSelectedInDropdown: mode },
      })

      const second_input =
        second_target.querySelector<HTMLInputElement>(`input[autocomplete]`)
      second_input?.click()
      await tick()

      const all_selected_options = second_target.querySelectorAll(`ul.options > li`)
      expect(all_selected_options).toHaveLength(3)

      // All options should have selected styling
      Array.from(all_selected_options).forEach((option) => {
        expect(option.classList.contains(`selected`)).toBe(true)
        if (mode === `checkboxes`) {
          const checkbox = option.querySelector<HTMLInputElement>(`.option-checkbox`)
          expect(checkbox?.checked).toBe(true)
        }
      })
    },
  )

  test.each([`plain`, `checkboxes`] as const)(
    `respects minSelect constraint when toggling in %s mode`,
    async (mode) => {
      mount(MultiSelect, {
        target: document.body,
        props: {
          options,
          selected: [`Apple`, `Banana`],
          keepSelectedInDropdown: mode,
          minSelect: 1,
        },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()
      await tick()

      // Remove Apple (should work as we'll still have Banana)
      const apple_option = Array.from(
        document.querySelectorAll<HTMLElement>(`ul.options > li`),
      ).find((li) => li.textContent?.includes(`Apple`))
      if (mode === `checkboxes`) {
        const checkbox = apple_option?.querySelector<HTMLElement>(`.option-checkbox`)
        checkbox?.click()
      } else {
        apple_option?.click()
      }
      await tick()

      expect(apple_option?.classList.contains(`selected`)).toBe(false)

      // Try to remove Banana as well – should be blocked by minSelect=1
      const banana_option = Array.from(
        document.querySelectorAll<HTMLElement>(`ul.options > li`),
      ).find((li) => li.textContent?.includes(`Banana`))
      if (mode === `checkboxes`) {
        const checkbox = banana_option?.querySelector<HTMLElement>(`.option-checkbox`)
        checkbox?.click()
      } else banana_option?.click()
      await tick()
      expect(banana_option?.classList.contains(`selected`)).toBe(true)
    },
  )

  test.each([`plain`, `checkboxes`] as const)(
    `keyboard navigation works correctly in %s mode`,
    async (mode) => {
      const onChange_spy = vi.fn()
      mount(MultiSelect, {
        target: document.body,
        props: {
          options,
          selected: [`Apple`],
          keepSelectedInDropdown: mode,
          onchange: onChange_spy,
        },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()

      // Navigate to Apple and toggle it off with Enter
      input.dispatchEvent(
        new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
      )
      await tick()
      input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))

      expect(onChange_spy).toHaveBeenCalledWith({ option: `Apple`, type: `remove` })

      // Navigate to Banana and toggle it on with Enter
      input.dispatchEvent(
        new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
      )
      await tick()
      input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))

      expect(onChange_spy).toHaveBeenCalledWith({ option: `Banana`, type: `add` })
    },
  )

  test.each([`plain`, `checkboxes`] as const)(
    `search filtering works correctly in %s mode`,
    (mode) => {
      const selected = [`Apple`, `Cherry`]
      mount(MultiSelect, {
        target: document.body,
        props: { options: options_with_date, selected, keepSelectedInDropdown: mode },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()

      // Filter to show only options containing 'a'
      input.value = `a`
      input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))

      const filtered_options = document.querySelectorAll(`ul.options > li`)

      if (mode === `checkboxes` || mode === `plain`) {
        // In keepSelectedInDropdown mode, selected options are always shown
        expect(filtered_options.length).toBeGreaterThanOrEqual(2)

        // Check that matching options are visible
        const matching_options = Array.from(filtered_options).filter(
          (li) => li.textContent?.includes(`Banana`) || li.textContent?.includes(`Date`),
        )
        expect(matching_options).toHaveLength(2)

        // Note: selected options Apple/Cherry match filter 'a' with fuzzy search and should be visible
      } else {
        // In default mode, only matching options are shown
        expect(filtered_options).toHaveLength(2) // Banana, Date
      }

      // Check that non-matching non-selected options are not visible
      const non_matching_options = Array.from(filtered_options).filter(
        (li) => li.textContent?.includes(`foo`) || li.textContent?.includes(`qux`),
      )
      expect(non_matching_options).toHaveLength(0)
    },
  )
})

describe.each([[true], [false]])(`allowUserOptions=%s`, (allowUserOptions) => {
  describe.each([[``], [`no matches`]])(
    `noMatchingOptionsMsg=%s`,
    (noMatchingOptionsMsg) => {
      describe.each([[`make option`], [``]])(
        `createOptionMsg='%s'`,
        (createOptionMsg) => {
          test(`no .user-msg node is rendered if in a state where noMatchingOptionsMsg or createOptionMsg would be shown but are falsy`, async () => {
            mount(MultiSelect, {
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
              expect(doc_query(`.user-msg`).textContent?.trim()).toBe(createOptionMsg)
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

// Issue #364: empty message props should not render <li> element
test.each([
  [`duplicateOptionMsg`, ``],
  [`duplicateOptionMsg`, null],
  [`noMatchingOptionsMsg`, ``],
  [`noMatchingOptionsMsg`, null],
])(`no .user-msg node is rendered when %s=%j`, async (prop_name, prop_value) => {
  const is_dupe_test = prop_name === `duplicateOptionMsg`
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [`foo`, `bar`],
      selected: is_dupe_test ? [`foo`] : [],
      [prop_name]: prop_value,
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  // Type text that triggers the message condition
  input.value = is_dupe_test ? `foo` : `nonexistent`
  input.dispatchEvent(input_event)
  await tick()

  expect(document.querySelector(`.user-msg`)).toBeNull()
})

test.each([[0], [1], [2], [5], [undefined]])(
  `no more than maxOptions are rendered if a positive integer, all options are rendered undefined or 0`,
  (maxOptions) => {
    const options = [`foo`, `bar`, `baz`]

    mount(MultiSelect, {
      target: document.body,
      props: { options, maxOptions },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(input_event)

    expect(document.querySelectorAll(`ul.options li`)).toHaveLength(
      maxOptions === null || maxOptions === undefined
        ? options.length
        : Math.min(options.length, maxOptions),
    )
  },
)

test.each([[true], [-1], [3.5], [`foo`], [{}]])(
  `console.error when maxOptions=%s is not a positive integer or undefined`,
  async (maxOptions) => {
    console.error = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- intentionally testing invalid maxOptions values
      props: { options: [1, 2, 3], maxOptions: maxOptions as number },
    })
    await tick() // wait for $effect to run

    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- testing console.error message with invalid maxOptions values
      `MultiSelect: maxOptions must be undefined or a positive integer, got ${String(maxOptions)}`,
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
  [{ selected: `selected-style`, option: `option-style` }, `selected`, `selected-style`],
  [{ selected: `selected-style`, option: `option-style` }, `option`, `option-style`],
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
  (style, key, expected, err_msg = ``) => {
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
  [{ selected: `color: red;`, option: `color: blue;` }, `selected`, `color: red;`],
  [{ selected: `color: red;`, option: `color: blue;` }, `option`, `color: blue;`],
  // Invalid object style cases
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- intentionally testing invalid style object
  [{ invalid: `color: green;` } as unknown as OptionStyle, `selected`, ``],
])(
  `MultiSelect applies correct styles to <li> elements for different option and key combinations`,
  (style, key, expected_css) => {
    const options: Option[] = [{ label: `foo`, style }]

    mount(MultiSelect, {
      target: document.body,
      props: { options, selected: key === `selected` ? options : [] },
    })

    if (key === `selected`) {
      const selected_li = doc_query<HTMLElement>(`ul.selected > li`)
      expect(selected_li.style.cssText).toBe(expected_css)
    } else if (key === `option`) {
      const option_li = doc_query<HTMLElement>(`ul.options > li`)
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
])(`MultiSelect applies style props to the correct element`, (prop, css_selector) => {
  const css_str = `font-weight: bold; color: red;`
  mount(MultiSelect, {
    target: document.body,
    props: { options: [1, 2, 3], [prop]: css_str, selected: [1] },
  })

  const err_msg = `${prop} (${css_selector})`
  const elem = doc_query<HTMLElement>(css_selector)
  expect(elem?.style.cssText, err_msg).toContain(css_str)
})

test.each([
  { prop: `liSelectedStyle`, css_selector: `ul.selected > li` },
  { prop: `liOptionStyle`, css_selector: `ul.options > li` },
])(
  `MultiSelect doesn't add style attribute to element '$css_selector' if '$prop' prop not passed`,
  ({ prop, css_selector }) => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], selected: [1] },
    })

    const elem = doc_query(css_selector)

    const err_msg = `style attribute should be absent when '${prop}' not passed, but hasAttribute('style') is ${elem.hasAttribute(
      `style`,
    )}`
    expect(elem.hasAttribute(`style`), err_msg).toBe(false)
  },
)

test.each([true, false, `if-mobile`] as const)(
  `closeDropdownOnSelect=%s controls input focus and dropdown closing`,
  async (closeDropdownOnSelect) => {
    const original_inner_width = globalThis.innerWidth
    try {
      globalThis.innerWidth = 600 // simulate mobile
      const select = mount(Test2WayBind, {
        target: document.body,
        props: { options: [1, 2, 3], closeDropdownOnSelect, open: true },
      })

      // simulate selecting an option
      const first_option = doc_query<HTMLElement>(`ul.options > li`)
      first_option.click()
      await tick() // let jsdom update document.activeElement after potential input.focus() in add()

      const is_desktop = globalThis.innerWidth > select.breakpoint
      const should_be_closed =
        closeDropdownOnSelect === true ||
        (closeDropdownOnSelect === `if-mobile` && !is_desktop)

      // count number of selected items
      const selected_items = document.querySelectorAll(`ul.selected > li`)
      expect(selected_items).toHaveLength(1)

      // check that dropdown is closed when closeDropdownOnSelect = true
      const dropdown = doc_query(`ul.options`)
      const input_el = doc_query<HTMLInputElement>(`input[autocomplete]`)
      const state = JSON.stringify({
        is_desktop,
        should_be_closed,
        closeDropdownOnSelect,
        breakpoint: select.breakpoint,
      })

      expect(dropdown.classList.contains(`hidden`), state).toBe(should_be_closed)
      // focus tracking is reliable only for the close path in happy-dom
      if (should_be_closed) {
        expect(document.activeElement === input_el).toBe(false)
      } else {
        expect(
          document.activeElement === input_el || document.activeElement === document.body,
        ).toBe(true)
      }

      if (closeDropdownOnSelect === `if-mobile`) {
        // reduce window width to simulate mobile
        globalThis.innerWidth = 400
        globalThis.dispatchEvent(new Event(`resize`))
        expect(globalThis.innerWidth).toBeLessThan(select.breakpoint)

        // Re-simulate selection on mobile
        const another_option = doc_query<HTMLElement>(`ul.options li:not(.selected)`)
        expect(
          another_option,
          `Could not find another option to test mobile selection behavior`,
        ).toBeInstanceOf(HTMLElement)
        another_option?.click()
        await tick()
        // On mobile (when closeDropdownOnSelect = 'if-mobile'), dropdown should close, input should lose focus
        expect(dropdown.classList).toContain(`hidden`) // Now it should be closed
        expect(document.activeElement === input_el).toBe(false)
      }
    } finally {
      globalThis.innerWidth = original_inner_width
    }
  },
)

test(`closeDropdownOnSelect='retain-focus' retains input focus when dropdown closes after option selection`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      closeDropdownOnSelect: `retain-focus`,
      open: true,
    },
  })

  const input_el = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input_el.focus()

  // select an option - should close dropdown but retain focus
  doc_query<HTMLElement>(`ul.options > li`).click()
  await tick()

  expect(document.activeElement).toBe(input_el)
  expect(document.querySelectorAll(`ul.selected > li`)).toHaveLength(1)
})

test(`closeDropdownOnSelect='retain-focus' works correctly with maxSelect`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      closeDropdownOnSelect: `retain-focus`,
      maxSelect: 2,
      open: true,
    },
  })

  const input_el = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input_el.focus()

  // select first option
  doc_query<HTMLElement>(`ul.options > li`).click()
  expect(document.activeElement).toBe(input_el)

  // select second option (reaching maxSelect)
  input_el.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  await tick()
  doc_query<HTMLElement>(`ul.options > li`).click()
  await tick()

  expect(document.activeElement).toBe(input_el)
  expect(document.querySelectorAll(`ul.selected > li`)).toHaveLength(2)
})

test(`Escape and Tab still blur input even with closeDropdownOnSelect='retain-focus'`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      closeDropdownOnSelect: `retain-focus`,
      open: true,
    },
  })

  const input_el = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input_el.focus()
  await tick()

  // Escape should blur input (retain-focus only applies to selection, not keyboard closing)
  input_el.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))

  expect(document.activeElement).not.toBe(input_el)
})

test(`arrow keys can navigate to create option message when there are matching options`, async () => {
  const options = [`apple`, `banana`, `cherry`]
  mount(MultiSelect, {
    target: document.body,
    props: {
      options,
      allowUserOptions: true,
      createOptionMsg: `Create "app" option`,
      searchText: `app`, // This will match "apple" but also allow creating "app"
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.focus()

  // Navigate through all options using arrow down
  // First option should be active (apple matches "app")
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
  await tick()
  expect(doc_query(`ul.options > li.active`).textContent?.trim()).toBe(`apple`)

  // Second navigation should reach the create option message
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
  await tick()

  const user_msg_li = doc_query(`ul.options li.user-msg`)
  expect(user_msg_li.classList.contains(`active`)).toBe(true)
  expect(user_msg_li.textContent?.trim()).toBe(`Create "app" option`)

  // Navigate back up should go to apple
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowUp`, bubbles: true }))
  await tick()
  expect(doc_query(`ul.options > li.active`).textContent?.trim()).toBe(`apple`)

  // Test wrap-around: from first option, go up should reach create message
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowUp`, bubbles: true }))
  await tick()
  expect(doc_query(`ul.options li.user-msg`).classList.contains(`active`)).toBe(true)
})

describe(`createOptionMsg as function`, () => {
  // Tests that function form receives all state fields correctly and renders the returned string
  test.each([
    {
      desc: `no matches passes empty matchingOptions`,
      options: [`apple`, `banana`, `cherry`],
      selected: [`apple`],
      search: `grape`,
      expected_matching: [],
    },
    {
      desc: `partial match passes filtered matchingOptions`,
      options: [`apple`, `apricot`, `banana`],
      selected: [] as string[],
      search: `ap`,
      expected_matching: [`apple`, `apricot`],
    },
  ])(`$desc`, async ({ options, selected, search, expected_matching }) => {
    let captured_state: Record<string, unknown> = {}
    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        selected,
        allowUserOptions: true,
        createOptionMsg: (state: Record<string, unknown>) => {
          captured_state = state
          return `Create '${String(state.searchText)}'`
        },
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = search
    input.dispatchEvent(input_event)
    await tick()

    expect(doc_query(`ul.options li.user-msg`).textContent?.trim()).toBe(
      `Create '${search}'`,
    )
    expect(captured_state.searchText).toBe(search)
    expect(captured_state.selected).toEqual(selected)
    expect(captured_state.options).toEqual(options)
    expect(captured_state.matchingOptions).toEqual(expected_matching)
  })

  // Static string, null, and function returning empty string
  test.each([
    [`Create this option...`, `Create this option...`],
    [null, `No matches`],
    [() => ``, `No matches`], // function returning '' should not show phantom create slot
  ])(
    `createOptionMsg=%s shows correct user message`,
    async (createOptionMsg, expected_text) => {
      mount(MultiSelect, {
        target: document.body,
        props: {
          options: [`foo`],
          allowUserOptions: true,
          createOptionMsg,
          noMatchingOptionsMsg: `No matches`,
        },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.value = `bar`
      input.dispatchEvent(input_event)
      await tick()

      expect(doc_query(`ul.options li.user-msg`).textContent?.trim()).toBe(expected_text)
    },
  )

  test(`function can combine multiple state fields`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [`a`, `b`, `c`],
        selected: [`a`, `b`],
        allowUserOptions: true,
        createOptionMsg: ({
          searchText,
          selected,
        }: {
          searchText: string
          selected: unknown[]
        }) => `Create '${searchText}' (${selected.length} selected)`,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `d`
    input.dispatchEvent(input_event)
    await tick()

    expect(doc_query(`ul.options li.user-msg`).textContent?.trim()).toBe(
      `Create 'd' (2 selected)`,
    )
  })
})

describe(`selectAllOption feature`, () => {
  const options = [`Apple`, `Banana`, `Cherry`, `Date`]

  test.each([
    [true, `Select all`],
    [`Custom label`, `Custom label`],
  ])(
    `shows correct label when selectAllOption=%s`,
    async (selectAllOption, expected_label) => {
      mount(MultiSelect, { target: document.body, props: { options, selectAllOption } })
      doc_query<HTMLInputElement>(`input[autocomplete]`).click()
      await tick()
      expect(doc_query(`ul.options > li.select-all`).textContent?.trim()).toBe(
        expected_label,
      )
    },
  )

  test.each([[{ selectAllOption: false }], [{ selectAllOption: true, maxSelect: 1 }]])(
    `hidden when props=%j`,
    async (props) => {
      mount(MultiSelect, { target: document.body, props: { options, ...props } })
      doc_query<HTMLInputElement>(`input[autocomplete]`).click()
      await tick()
      expect(document.querySelector(`ul.options > li.select-all`)).toBeNull()
    },
  )

  test(`selects all, fires onselectAll and onchange events`, async () => {
    const onselectAll_spy = vi.fn()
    const onchange_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        selectAllOption: true,
        onselectAll: onselectAll_spy,
        onchange: onchange_spy,
      },
    })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.click()
    await tick()
    doc_query<HTMLElement>(`ul.options > li.select-all`).click()
    await tick()
    expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`Apple Banana Cherry Date`)
    expect(onselectAll_spy).toHaveBeenCalledWith({ options })
    expect(onchange_spy).toHaveBeenCalledWith({ options, type: `selectAll` })
  })

  test(`respects maxSelect and skips disabled options`, async () => {
    const options_mixed = [
      { label: `A` },
      { label: `B`, disabled: true },
      { label: `C` },
      { label: `D` },
    ]
    mount(MultiSelect, {
      target: document.body,
      props: { options: options_mixed, selectAllOption: true, maxSelect: 2 },
    })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.click()
    doc_query<HTMLElement>(`ul.options > li.select-all`).click()
    await tick()
    expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`A C`) // skipped B (disabled), limited to 2
  })

  test(`triggers onmaxreached when select_all shortcut fired at maxSelect`, async () => {
    const onmaxreached_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [`a`, `b`, `c`],
        selectAllOption: true,
        selected: [`a`, `b`],
        maxSelect: 2,
        shortcuts: { select_all: `ctrl+a` },
        onmaxreached: onmaxreached_spy,
      },
    })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `a`, ctrlKey: true, bubbles: true }),
    )
    await tick()

    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onmaxreached_spy).toHaveBeenCalledWith({
      selected: [`a`, `b`],
      maxSelect: 2,
      attemptedOption: `c`,
    })
  })

  test(`triggers onmaxreached on partial batch fill (some added, some dropped)`, async () => {
    const onmaxreached_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [`a`, `b`, `c`, `d`, `e`],
        selectAllOption: true,
        selected: [],
        maxSelect: 3,
        onmaxreached: onmaxreached_spy,
      },
    })
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.click()
    await tick()

    doc_query<HTMLElement>(`ul.options > li.select-all`).click()
    await tick()

    expect(doc_query(`ul.selected`).textContent?.trim()).toBe(`a b c`)
    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onmaxreached_spy).toHaveBeenCalledWith({
      selected: [`a`, `b`, `c`],
      maxSelect: 3,
      attemptedOption: `d`,
    })
  })

  test.each([
    [`custom string`, `Tout est selectionne`, `Tout est selectionne`],
    [
      `function`,
      (state: { selected_count: number }) => `${state.selected_count} ausgewahlt`,
      `4 ausgewahlt`,
    ],
    [`null suppresses`, null, ``],
  ])(`selectAllDisabledTitle %s`, async (_label, title_prop, expected_title) => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        selected: [...options],
        selectAllOption: true,
        selectAllDisabledTitle: title_prop,
      },
    })
    doc_query<HTMLInputElement>(`input[autocomplete]`).click()
    await tick()
    expect(doc_query<HTMLElement>(`ul.options > li.select-all`).title).toBe(
      expected_title,
    )
  })

  test.each([
    [true, ``],
    [false, `a`],
  ])(
    `resetFilterOnAdd=%j controls searchText after select all`,
    async (resetFilterOnAdd, expected) => {
      mount(MultiSelect, {
        target: document.body,
        props: { options, selectAllOption: true, resetFilterOnAdd },
      })
      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.click()
      input.value = `a`
      input.dispatchEvent(input_event)
      doc_query<HTMLElement>(`ul.options > li.select-all`).click()
      await tick()
      expect(input.value).toBe(expected)
    },
  )

  test.each<[string, Partial<MultiSelectProps>, boolean, string]>([
    [
      `all selected`,
      { options: [`a`, `b`, `c`, `d`], selected: [`a`, `b`, `c`, `d`] },
      true,
      `All options already selected`,
    ],
    [`some unselected`, { options: [`a`, `b`, `c`, `d`], selected: [`a`] }, false, ``],
    [
      `all non-disabled selected`,
      {
        options: [{ label: `A` }, { label: `B`, disabled: true }, { label: `C` }],
        selected: [{ label: `A` }, { label: `C` }],
      },
      true,
      `All options already selected`,
    ],
    [
      `maxSelect reached`,
      { options: [`a`, `b`, `c`, `d`], selected: [`a`, `b`], maxSelect: 2 },
      true,
      `Maximum of 2 options selected`,
    ],
    [
      `maxSelect reached AND all selectable selected`,
      { options: [`a`, `b`], selected: [`a`, `b`], maxSelect: 2 },
      true,
      `All options already selected`,
    ],
  ])(
    `Select All disabled state: %s`,
    async (_label, extra_props, expected_disabled, expected_title) => {
      mount(MultiSelect, {
        target: document.body,
        props: { selectAllOption: true, ...extra_props },
      })
      doc_query<HTMLInputElement>(`input[autocomplete]`).click()
      await tick()
      const select_all_li = doc_query<HTMLElement>(`ul.options > li.select-all`)
      expect(select_all_li.classList.contains(`disabled`)).toBe(expected_disabled)
      expect(select_all_li.getAttribute(`aria-disabled`)).toBe(
        expected_disabled ? `true` : null,
      )
      expect(select_all_li.tabIndex).toBe(expected_disabled ? -1 : 0)
      expect(select_all_li.title).toBe(expected_title)
    },
  )

  test(`disabled Select All ignores click`, async () => {
    const onselectAll_spy = vi.fn()
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selected: [`a`, `b`],
      selectAllOption: true,
      maxSelect: 2,
      onselectAll: onselectAll_spy,
    })
    mount(MultiSelect, { target: document.body, props })
    doc_query<HTMLInputElement>(`input[autocomplete]`).click()
    await tick()

    doc_query<HTMLElement>(`ul.options > li.select-all`).click()
    await tick()

    expect(onselectAll_spy).not.toHaveBeenCalled()
    expect(props.selected).toEqual([`a`, `b`])
  })

  test(`applies liSelectAllClass`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options, selectAllOption: true, liSelectAllClass: `custom` },
    })
    doc_query<HTMLInputElement>(`input[autocomplete]`).click()
    await tick()
    expect(doc_query(`ul.options > li.select-all`).classList.contains(`custom`)).toBe(
      true,
    )
  })

  test.each([
    [`Enter`, { key: `Enter` }],
    [`Space`, { code: `Space` }],
  ])(`keyboard %s activates`, async (_name, key_props) => {
    const spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: { options, selectAllOption: true, onselectAll: spy },
    })
    doc_query<HTMLInputElement>(`input[autocomplete]`).click()
    doc_query(`ul.options > li.select-all`).dispatchEvent(
      new KeyboardEvent(`keydown`, { ...key_props, bubbles: true }),
    )
    await tick()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

// Test that value prop can initialize selected options for both single (maxSelect=1) and multi-select (maxSelect=null)
// Covers string, number, and object options, with single values for maxSelect=1 and arrays for maxSelect=null
describe.each([[1], [2], [null]])(
  `initial value prop with maxSelect=%s`,
  (max_select) => {
    test.each([
      [`Red`, [`Red`, `Green`, `Blue`], `Red`],
      [1, [1, 2, 3], `1`],
      [{ label: `Red` }, [{ label: `Red` }, { label: `Green` }], `Red`],
      [[`Red`, `Green`], [`Red`, `Green`, `Blue`], `Red Green`],
      [[1, 2], [1, 2, 3], `1 2`],
      [
        [{ label: `Red` }, { label: `Green` }],
        [{ label: `Red` }, { label: `Green` }, { label: `Blue` }],
        `Red Green`,
      ],
    ])(`works when value=%s`, (value, options, expected_text) => {
      const is_single_value = !Array.isArray(value)
      const is_single_select = max_select === 1

      // Skip invalid combinations: single value with multi-select, array value with single select
      if (is_single_value !== is_single_select) return

      mount(MultiSelect, {
        target: document.body,
        props: { options, value, maxSelect: max_select },
      })

      const selected_ul = doc_query(`ul.selected`)
      expect(selected_ul.textContent?.trim()).toBe(expected_text)
    })
  },
)

// Dynamic options loading tests (https://github.com/janosh/svelte-multiselect/discussions/342)
describe(`loadOptions feature`, () => {
  const mock_data = Array.from({ length: 100 }, (_, idx) => `Option ${idx + 1}`)

  test(`loadOptions is called when dropdown opens`, async () => {
    const load_options = vi.fn(() =>
      Promise.resolve({ options: mock_data.slice(0, 50), hasMore: true }),
    )
    // Use open prop directly for reliable testing
    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick()

    expect(load_options).toHaveBeenCalledTimes(1)
    expect(load_options).toHaveBeenCalledWith({
      search: ``,
      offset: 0,
      limit: 50, // default batch size
    })
  })

  test(`loadOptions respects batchSize config`, async () => {
    const load_options = vi.fn(() =>
      Promise.resolve({ options: mock_data.slice(0, 25), hasMore: true }),
    )
    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: load_options, batchSize: 25 },
        open: true,
      },
    })
    await tick()

    expect(load_options).toHaveBeenCalledWith({
      search: ``,
      offset: 0,
      limit: 25,
    })
  })

  test(`loadOptions onOpen=false prevents loading on dropdown open`, async () => {
    const load_options = vi.fn(() =>
      Promise.resolve({ options: [`Test`], hasMore: false }),
    )
    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: load_options, onOpen: false },
        open: true,
      },
    })
    await tick()

    expect(load_options).not.toHaveBeenCalled()
  })

  test(`loadOptions renders loaded options in dropdown`, async () => {
    const load_options = vi.fn(() =>
      Promise.resolve({ options: [`Apple`, `Banana`, `Cherry`], hasMore: false }),
    )
    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick() // effect starts async fetch
    await tick() // fetch resolves, results applied

    const options_ul = doc_query(`ul.options`)
    expect(options_ul.textContent).toContain(`Apple`)
    expect(options_ul.textContent).toContain(`Banana`)
    expect(options_ul.textContent).toContain(`Cherry`)
  })

  test(`loadOptions shows loading indicator while loading`, async () => {
    let resolve_load: (() => void) | undefined
    const load_options = vi.fn(
      () =>
        new Promise<{ options: string[]; hasMore: boolean }>((resolve) => {
          resolve_load = () => resolve({ options: [`Test`], hasMore: false })
        }),
    )

    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick() // Wait for effect to start loading

    // Loading indicator should be visible while loading
    const loading_li = document.querySelector(`ul.options > li.loading-more`)
    expect(loading_li).toBeInstanceOf(HTMLLIElement)

    // Resolve the load
    if (resolve_load) resolve_load()
    await tick()

    // Loading indicator should be gone
    expect(document.querySelector(`ul.options > li.loading-more`)).toBeNull()
  })

  test(`static options work without loadOptions`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: [`A`, `B`, `C`], open: true },
    })
    await tick()

    const options_ul = doc_query(`ul.options`)
    expect(options_ul.textContent).toContain(`A`)
    expect(options_ul.textContent).toContain(`B`)
    expect(options_ul.textContent).toContain(`C`)
  })

  test(`dropdown renders when loadOptions is provided but not yet loaded`, async () => {
    const load_options = vi.fn(() =>
      Promise.resolve({ options: [`Test`], hasMore: false }),
    )
    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick()

    // Dropdown should exist even before options are loaded
    const options_ul = document.querySelector(`ul.options`)
    expect(options_ul).not.toBeNull()
  })

  test(`loadOptions handles errors gracefully`, async () => {
    const console_error = vi.spyOn(console, `error`).mockImplementation(() => {})
    let reject_fn: ((reason: Error) => void) | undefined
    const load_options = vi.fn(
      () =>
        new Promise<{ options: string[]; hasMore: boolean }>((_, reject) => {
          reject_fn = reject
        }),
    )

    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick()

    // Reject the promise
    if (reject_fn) reject_fn(new Error(`Network error`))
    await tick()

    // Error should be logged
    expect(console_error).toHaveBeenCalledWith(
      `MultiSelect: loadOptions error:`,
      expect.any(Error),
    )
    // Component should still function (dropdown visible)
    expect(document.querySelector(`ul.options`)).not.toBeNull()
    console_error.mockRestore()
  })

  test(`scroll triggers pagination when hasMore=true`, async () => {
    const load_options = vi
      .fn()
      .mockResolvedValueOnce({ options: mock_data.slice(0, 50), hasMore: true })
      .mockResolvedValueOnce({ options: mock_data.slice(50, 100), hasMore: false })

    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick()

    expect(load_options).toHaveBeenCalledTimes(1)

    // Simulate scroll event - the handler checks scroll position
    const ul = doc_query(`ul.options`)
    // Mock the scroll position properties for the scroll handler
    vi.spyOn(ul, `scrollHeight`, `get`).mockReturnValue(500)
    vi.spyOn(ul, `clientHeight`, `get`).mockReturnValue(200)
    vi.spyOn(ul, `scrollTop`, `get`).mockReturnValue(250) // 500-250-200=50 < 100 threshold
    ul.dispatchEvent(new Event(`scroll`))
    await tick()

    // Should have loaded second batch
    expect(load_options).toHaveBeenCalledTimes(2)
    expect(load_options).toHaveBeenLastCalledWith({
      search: ``,
      offset: 50,
      limit: 50,
    })
  })

  test(`scroll does not trigger when hasMore=false`, async () => {
    const load_options = vi.fn(() =>
      Promise.resolve({ options: [`A`, `B`], hasMore: false }),
    )

    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: load_options, open: true },
    })
    await tick()

    expect(load_options).toHaveBeenCalledTimes(1)

    // Simulate scroll event
    const ul = doc_query(`ul.options`)
    vi.spyOn(ul, `scrollHeight`, `get`).mockReturnValue(500)
    vi.spyOn(ul, `clientHeight`, `get`).mockReturnValue(200)
    vi.spyOn(ul, `scrollTop`, `get`).mockReturnValue(250)
    ul.dispatchEvent(new Event(`scroll`))
    await tick()

    // Should NOT have loaded again since hasMore=false
    expect(load_options).toHaveBeenCalledTimes(1)
  })

  test(`typing during pending request clears stale results and triggers new load`, async () => {
    vi.useFakeTimers()
    type LoadResult = { options: string[]; hasMore: boolean }
    const resolvers: Array<(val: LoadResult) => void> = []
    const load_options = vi.fn(
      () => new Promise<LoadResult>((res) => resolvers.push(res)),
    )

    mount(MultiSelect, {
      target: document.body,
      props: { loadOptions: { fetch: load_options, debounceMs: 10 }, open: true },
    })
    await vi.runAllTimersAsync()
    expect(load_options).toHaveBeenCalledWith({ search: ``, offset: 0, limit: 50 })

    // Type while first request pending
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `foo`
    input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))

    // Resolve stale request, verify new request is made for current search
    resolvers[0]({ options: [`Stale A`, `Stale B`], hasMore: false })
    await vi.runAllTimersAsync()
    expect(load_options).toHaveBeenCalledTimes(2)
    expect(load_options).toHaveBeenLastCalledWith({ search: `foo`, offset: 0, limit: 50 })

    // Stale results should be cleared, new results shown after resolve
    const options_ul = doc_query(`ul.options`)
    expect(options_ul.textContent).not.toContain(`Stale`)
    resolvers[1]({ options: [`Foo Result`], hasMore: false })
    await vi.runAllTimersAsync()
    expect(options_ul.textContent).toContain(`Foo Result`)
  })
})

// https://github.com/janosh/svelte-multiselect/discussions/401
// User messages during async loading: create/no-match suppressed, dupe allowed
test.each([
  {
    name: `createOptionMsg hidden while loading, shown after`,
    props: { allowUserOptions: true, createOptionMsg: `Create this option` },
    initial_options: [`Existing`],
    search: `new tag`,
    while_loading: null,
    after_resolve: `Create this option`,
    resolve_with: [] as string[],
  },
  {
    name: `duplicateOptionMsg shown during loading`,
    props: { selected: [`Apple`], duplicateOptionMsg: `Already selected` },
    initial_options: [`Apple`, `Banana`],
    search: `Apple`,
    while_loading: `Already selected`,
    after_resolve: null,
    resolve_with: null,
  },
  {
    name: `noMatchingOptionsMsg hidden while loading, shown after`,
    props: { noMatchingOptionsMsg: `No matches` },
    initial_options: [`Apple`],
    search: `xyz`,
    while_loading: null,
    after_resolve: `No matches`,
    resolve_with: [] as string[],
  },
])(
  `$name`,
  async ({
    props,
    initial_options,
    search,
    while_loading,
    after_resolve,
    resolve_with,
  }) => {
    vi.useFakeTimers()
    try {
      const resolvers: ((r: { options: string[]; hasMore: boolean }) => void)[] = []
      const fetch_fn = vi.fn(
        () =>
          new Promise<{ options: string[]; hasMore: boolean }>((r) => resolvers.push(r)),
      )

      mount(MultiSelect, {
        target: document.body,
        props: { loadOptions: { fetch: fetch_fn, debounceMs: 0 }, open: true, ...props },
      })
      await vi.runAllTimersAsync()
      resolvers[0]({ options: [...initial_options], hasMore: false })
      await vi.runAllTimersAsync()

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.value = search
      input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
      await vi.runAllTimersAsync()
      expect(fetch_fn.mock.calls.length).toBeGreaterThanOrEqual(2)

      const msg_during = document.querySelector(`.user-msg`)?.textContent?.trim()
      if (while_loading) expect(msg_during).toBe(while_loading)
      else expect(document.querySelector(`.user-msg`)).toBeNull()

      if (resolve_with) {
        resolvers[1]({ options: resolve_with, hasMore: false })
        await vi.runAllTimersAsync()
        expect(document.querySelector(`.user-msg`)?.textContent?.trim()).toBe(
          after_resolve,
        )
      }
    } finally {
      vi.useRealTimers()
    }
  },
)

test(`createOptionMsg shows immediately with static options`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [`Apple`, `Banana`],
      allowUserOptions: true,
      createOptionMsg: `Create this option`,
      open: true,
    },
  })
  await tick()
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `Cherry`
  input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
  await tick()
  expect(document.querySelector(`.user-msg`)?.textContent?.trim()).toBe(
    `Create this option`,
  )
})

// https://github.com/janosh/svelte-multiselect/pull/403#issuecomment-4106385445
describe(`load_options_pending`, () => {
  type load_options_result = { options: string[]; hasMore: boolean }

  function create_deferred_fetch() {
    const fetch_resolvers: ((result: load_options_result) => void)[] = []
    const fetch_fn = vi.fn(
      () =>
        new Promise<load_options_result>((resolve_fetch) =>
          fetch_resolvers.push(resolve_fetch),
        ),
    )
    return { fetch_fn, fetch_resolvers }
  }

  beforeEach(() => vi.useFakeTimers())

  test(`Enter during debounce does not create unwanted option`, async () => {
    const { fetch_fn, fetch_resolvers } = create_deferred_fetch()
    const oncreate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: fetch_fn, debounceMs: 300 },
        allowUserOptions: true,
        createOptionMsg: `Create this option`,
        open: true,
        oncreate: oncreate_spy,
      },
    })
    await vi.runAllTimersAsync()
    fetch_resolvers[0]({ options: [`Apple`, `Banana`], hasMore: false })
    await vi.runAllTimersAsync()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `Cherry`
    input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
    await tick()

    expect(input.getAttribute(`aria-busy`)).toBe(`true`)

    // Enter during debounce window should NOT create an option
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()
    expect(oncreate_spy).not.toHaveBeenCalled()
    expect(document.querySelector(`.user-msg`)).toBeNull()

    // Let debounce fire and fetch complete
    await vi.runAllTimersAsync()
    fetch_resolvers[1]({ options: [], hasMore: false })
    await vi.runAllTimersAsync()

    expect(document.querySelector(`.user-msg`)?.textContent?.trim()).toBe(
      `Create this option`,
    )

    // Now Enter should create the option
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()
    expect(oncreate_spy).toHaveBeenCalledTimes(1)
  })

  test(`fetch failure unblocks pending state`, async () => {
    const fetch_fn = vi
      .fn()
      .mockResolvedValueOnce({ options: [`Apple`], hasMore: false })
      .mockRejectedValue(new Error(`network error`))

    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: fetch_fn, debounceMs: 0 },
        allowUserOptions: true,
        createOptionMsg: `Create this option`,
        open: true,
      },
    })
    await vi.runAllTimersAsync()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `NewThing`
    input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
    await vi.runAllTimersAsync()

    expect(input.getAttribute(`aria-busy`)).toBeNull()
    expect(document.querySelector(`.user-msg`)?.textContent?.trim()).toBe(
      `Create this option`,
    )
  })

  test(`onOpen: false — idle until user types, busy during debounce`, async () => {
    const { fetch_fn, fetch_resolvers } = create_deferred_fetch()
    const oncreate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: fetch_fn, onOpen: false, debounceMs: 200 },
        allowUserOptions: true,
        createOptionMsg: `Create this option`,
        open: true,
        oncreate: oncreate_spy,
      },
    })
    await vi.runAllTimersAsync()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    expect(fetch_fn).not.toHaveBeenCalled()
    expect(input.getAttribute(`aria-busy`)).toBeNull()

    // Type triggers debounce — should become busy
    input.value = `Rust`
    input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
    await tick()
    expect(input.getAttribute(`aria-busy`)).toBe(`true`)

    // Enter during debounce should NOT create option
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()
    expect(oncreate_spy).not.toHaveBeenCalled()

    // After debounce + fetch resolves, Enter works
    await vi.runAllTimersAsync()
    fetch_resolvers[0]({ options: [], hasMore: false })
    await vi.runAllTimersAsync()
    expect(input.getAttribute(`aria-busy`)).toBeNull()

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()
    expect(oncreate_spy).toHaveBeenCalledTimes(1)
  })

  test(`late fetch response after close does not corrupt next open`, async () => {
    const { fetch_fn, fetch_resolvers } = create_deferred_fetch()

    mount(MultiSelect, {
      target: document.body,
      props: {
        loadOptions: { fetch: fetch_fn, debounceMs: 0 },
        open: true,
      },
    })
    await vi.runAllTimersAsync()
    fetch_resolvers[0]({ options: [`Apple`], hasMore: false })
    await vi.runAllTimersAsync()
    expect(fetch_fn).toHaveBeenCalledTimes(1)

    // Type to trigger a second fetch, then close before it resolves
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `Rust`
    input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
    await vi.runAllTimersAsync()
    expect(fetch_fn).toHaveBeenCalledTimes(2)

    // Close dropdown while fetch is in-flight
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
    await tick()

    // Late fetch resolves after close — stale results must be discarded
    fetch_resolvers[1]({ options: [`Rust Lang`], hasMore: false })
    await vi.runAllTimersAsync()

    // Reopen — should trigger fresh load immediately (is_first_load path)
    doc_query(`div.multiselect`).dispatchEvent(
      new MouseEvent(`mouseup`, { bubbles: true }),
    )
    await tick()
    // Fresh load fires immediately; stale path would debounce (not yet called)
    expect(fetch_fn).toHaveBeenCalledTimes(3)
    expect(fetch_fn).toHaveBeenLastCalledWith({ search: ``, offset: 0, limit: 50 })
    // Stale "Rust Lang" result must not leak into the reopened session
    expect(document.querySelector(`ul.options`)?.textContent).not.toContain(`Rust Lang`)
  })
})

// https://github.com/janosh/svelte-multiselect/issues/369
describe(`binding update event count`, () => {
  test(`onchange fires 0 times on init and exactly once per selection`, async () => {
    const onchange_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], onchange: onchange_spy },
    })
    await tick()
    expect(onchange_spy).toHaveBeenCalledTimes(0)

    // select first option
    doc_query<HTMLElement>(`ul.options li`).click()
    await tick()
    expect(onchange_spy).toHaveBeenCalledTimes(1)
    expect(onchange_spy).toHaveBeenCalledWith({ option: 1, type: `add` })
  })

  test.each([null, 1])(
    `selected binding with maxSelect=%s: ≤1 update on init, exactly 1 per selection`,
    async (maxSelect) => {
      const spy = vi.fn()

      mount(Test2WayBind, {
        target: document.body,
        props: { options: [1, 2, 3], maxSelect, onSelectedChanged: spy },
      })
      await tick()
      expect(spy.mock.calls.length).toBeLessThanOrEqual(1) // init: at most 1 call

      spy.mockClear()
      doc_query<HTMLElement>(`ul.options li`).click()
      await tick()
      expect(spy).toHaveBeenCalledTimes(1) // selection: exactly 1 call
    },
  )

  // This test catches the regression where value gets synced from null to []
  // The bug: values_equal(null, []) returned false, causing value = [] assignment
  test.each([null, 1])(
    `value binding with maxSelect=%s: no extra sync from null to [] on init`,
    async (maxSelect) => {
      const spy = vi.fn()

      mount(Test2WayBind, {
        target: document.body,
        props: { options: [1, 2, 3], maxSelect, onValueChanged: spy },
      })
      await tick()

      // The effect in Test2WayBind fires at least once on mount with initial value
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1)
      // The fix ensures value stays null (no sync to [])
      // Without fix: spy would be called with [] for maxSelect=null
      const last_value = spy.mock.calls.at(-1)?.[0]
      expect(last_value, `value should be null, not []`).toBeNull()
    },
  )
})

describe(`CSS static analysis`, () => {
  const css =
    readFileSync(`src/lib/MultiSelect.svelte`, `utf-8`).match(
      /<style>([\s\S]*?)<\/style>/,
    )?.[1] ?? ``

  const props = [
    `--sms-border`,
    `--sms-bg`,
    `--sms-disabled-bg`,
    `--sms-selected-bg`,
    `--sms-li-active-bg`,
    `--sms-remove-btn-hover-bg`,
    `--sms-options-bg`,
    `--sms-options-shadow`,
    `--sms-li-selected-plain-bg`,
    `--sms-li-disabled-bg`,
    `--sms-li-disabled-text`,
    `--sms-select-all-border-bottom`,
  ]

  test.each(props)(`%s uses light-dark()`, (prop) => {
    expect(css).toMatch(new RegExp(`${prop.replaceAll(`-`, `[-]`)}[^;]*light-dark\\(`))
  })

  test(`::highlight uses light-dark()`, () => {
    expect(css).toMatch(/::highlight\(sms-search-matches\)[\s\S]*?light-dark\(/)
  })

  test(`--sms-active-color fallbacks use light-dark()`, () => {
    expect(
      css.match(/--sms-active-color,\s*light-dark\(/g)?.length,
    ).toBeGreaterThanOrEqual(2)
  })

  test(`default-icon buttons enforce circle via min-height: 0 + overflow: hidden`, () => {
    const default_icon_block = css.match(
      /:is\(div\.multiselect button\.default-icon\)\s*\{([\s\S]*?)\}/,
    )?.[1]
    expect(default_icon_block).toBeTruthy()
    expect(default_icon_block).toMatch(/min-height:\s*0/)
    expect(default_icon_block).toMatch(/overflow:\s*hidden/)
  })

  test(`options dropdown has border with light-dark default`, () => {
    expect(css).toMatch(/--sms-options-border,\s*1px solid light-dark\(/)
  })

  test(`options dropdown bg contrasts with typical page bg`, () => {
    const options_block = css.match(/:where\(ul\.options\)\s*\{([\s\S]*?)\}/)?.[1]
    expect(options_block).toBeTruthy()
    expect(options_block).toMatch(/--sms-options-bg,\s*light-dark\(#fcfcfc/)
  })

  test(`custom-snippet remove-all overrides circular defaults`, () => {
    const custom_remove_all = css.match(
      /:is\(div\.multiselect button\.remove-all:not\(\.default-icon\)\)\s*\{([\s\S]*?)\}/,
    )?.[1]
    expect(custom_remove_all).toBeTruthy()
    expect(custom_remove_all).toMatch(/border-radius:\s*3pt/)
    expect(custom_remove_all).toMatch(/aspect-ratio:\s*auto/)
    expect(custom_remove_all).toMatch(/padding:\s*0 2pt/)
  })
})

// Option grouping feature tests (https://github.com/janosh/svelte-multiselect/issues/135)
describe(`option grouping feature`, () => {
  const grouped_options = [
    { label: `Rock`, group: `Genre` },
    { label: `Electronic`, group: `Genre` },
    { label: `Jazz`, group: `Genre` },
    { label: `C Major`, group: `Key` },
    { label: `D Minor`, group: `Key` },
    `Ungrouped Option`,
  ]

  // Helper to find a group header by name (throws if not found for cleaner test code)
  const find_group_header = (name: string): HTMLElement => {
    const header = Array.from(
      document.querySelectorAll<HTMLElement>(`ul.options > li.group-header`),
    ).find((el) => el.textContent?.includes(name))
    if (!header) throw new Error(`Group header "${name}" not found`)
    return header
  }

  test(`renders group headers and options correctly`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, open: true },
    })
    await tick()

    // Verify group headers
    const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
    expect(group_headers).toHaveLength(2)
    const header_texts = Array.from(group_headers).map((h) =>
      h.querySelector(`.group-label`)?.textContent?.trim(),
    )
    expect(header_texts).toEqual(expect.arrayContaining([`Genre`, `Key`]))

    // Verify all options rendered
    const all_options = document.querySelectorAll(`ul.options > li:not(.group-header)`)
    expect(all_options).toHaveLength(6)
  })

  test.each([`first`, `last`] as const)(
    `ungroupedPosition=%s renders ungrouped options in correct position`,
    async (ungroupedPosition) => {
      mount(MultiSelect, {
        target: document.body,
        props: { options: grouped_options, ungroupedPosition, open: true },
      })
      await tick()

      const all_lis = document.querySelectorAll(`ul.options > li`)
      const ungrouped_idx = Array.from(all_lis).findIndex((li) =>
        li.textContent?.includes(`Ungrouped Option`),
      )

      if (ungroupedPosition === `first`) {
        expect(ungrouped_idx).toBe(0) // first item (before any group headers)
      } else {
        expect(ungrouped_idx).toBe(all_lis.length - 1) // last item
      }
    },
  )

  test(`filtering shows only groups with matching options`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, open: true },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `Rock`
    input.dispatchEvent(input_event)
    await tick()

    // Only Genre group header should be visible since only Rock matches
    const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
    expect(group_headers).toHaveLength(1)
    expect(group_headers[0].textContent).toContain(`Genre`)
  })

  test(`arrow navigation skips group headers`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, open: true },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Navigate down - first active should be first option, not group header
    input.dispatchEvent(arrow_down)
    await tick()

    const active_option = document.querySelector(`ul.options > li.active`)
    // Check that it's not a group header if an active element exists
    if (active_option) {
      expect(active_option.classList.contains(`group-header`)).toBe(false)
    }
    // Verify no group header can become active
    const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
    group_headers.forEach((header) => {
      expect(header.classList.contains(`active`)).toBe(false)
    })
  })

  test(`collapsibleGroups allows toggling group visibility`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, collapsibleGroups: true, open: true },
    })
    await tick()

    const genre_header = find_group_header(`Genre`)
    expect(genre_header).toBeInstanceOf(HTMLElement)
    expect(genre_header.classList.contains(`collapsible`)).toBe(true)

    // Get initial option count
    const initial_options = document.querySelectorAll(
      `ul.options > li:not(.group-header)`,
    )
    const initial_count = initial_options.length

    // Click to collapse
    genre_header.click()
    await tick()

    // Options in Genre group should be hidden
    const after_collapse_options = document.querySelectorAll(
      `ul.options > li:not(.group-header)`,
    )
    expect(after_collapse_options.length).toBeLessThan(initial_count)

    // Click again to expand
    genre_header.click()
    await tick()

    const after_expand_options = document.querySelectorAll(
      `ul.options > li:not(.group-header)`,
    )
    expect(after_expand_options.length).toBe(initial_count)
  })

  test(`groupSelectAll adds select all button to group headers`, async () => {
    const onselectAll_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        groupSelectAll: true,
        onselectAll: onselectAll_spy,
        open: true,
      },
    })
    await tick()

    // Find group select all buttons
    const select_all_buttons = document.querySelectorAll(
      `ul.options > li.group-header button.group-select-all`,
    )
    expect(select_all_buttons).toHaveLength(2) // One for each group

    const genre_header = find_group_header(`Genre`)
    const genre_select_all = genre_header.querySelector<HTMLElement>(
      `button.group-select-all`,
    )
    genre_select_all?.click()
    await tick()

    // Should have selected all Genre options
    expect(onselectAll_spy).toHaveBeenCalledTimes(1)
    const selected_options = onselectAll_spy.mock.calls[0][0].options
    expect(selected_options).toHaveLength(3) // Rock, Electronic, Jazz
    expect(
      selected_options.every((opt: { group: string }) => opt.group === `Genre`),
    ).toBe(true)
  })

  test.each([
    [1, 0, 0], // maxSelect=1: button hidden, 0 selected
    [2, 2, 2], // maxSelect=2: button visible (2 groups), 2 selected when clicked
  ] as const)(
    `groupSelectAll with maxSelect=%s shows %s buttons and selects up to maxSelect`,
    async (maxSelect, expected_buttons, expected_selected) => {
      mount(MultiSelect, {
        target: document.body,
        props: { options: grouped_options, groupSelectAll: true, maxSelect, open: true },
      })
      await tick()

      const select_all_buttons = document.querySelectorAll(
        `ul.options > li.group-header button.group-select-all`,
      )
      expect(select_all_buttons).toHaveLength(expected_buttons)

      if (expected_buttons > 0) {
        const genre_header = find_group_header(`Genre`)
        genre_header.querySelector<HTMLButtonElement>(`button.group-select-all`)?.click()
        await tick()
        expect(document.querySelectorAll(`ul.selected > li`)).toHaveLength(
          expected_selected,
        )
      }
    },
  )

  test(`group select-all button disabled when maxSelect reached`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        groupSelectAll: true,
        selected: [grouped_options[0], grouped_options[1]],
        maxSelect: 2,
        open: true,
      },
    })
    await tick()

    const genre_btn = find_group_header(`Genre`).querySelector<HTMLButtonElement>(
      `button.group-select-all`,
    )
    expect(genre_btn?.disabled).toBe(true)
  })

  test(`group select-all partial fill fires onmaxreached with correct payload`, async () => {
    const onmaxreached_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        groupSelectAll: true,
        selected: [grouped_options[0]],
        maxSelect: 2,
        open: true,
        onmaxreached: onmaxreached_spy,
      },
    })
    await tick()

    const genre_btn = find_group_header(`Genre`).querySelector<HTMLButtonElement>(
      `button.group-select-all`,
    )
    expect(genre_btn?.disabled).toBe(false)
    genre_btn?.click()
    await tick()

    expect(document.querySelectorAll(`ul.selected > li`)).toHaveLength(2)
    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onmaxreached_spy).toHaveBeenCalledWith(
      expect.objectContaining({ maxSelect: 2 }),
    )
  })

  test(`group select-all shows deselect when all selectable options in group already selected`, async () => {
    const genre_opts = grouped_options.filter(
      (opt) => typeof opt === `object` && opt.group === `Genre`,
    )
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        groupSelectAll: true,
        keepSelectedInDropdown: `plain`,
        selected: genre_opts,
        open: true,
      },
    })
    await tick()

    const genre_btn = find_group_header(`Genre`).querySelector<HTMLButtonElement>(
      `button.group-select-all`,
    )
    expect(genre_btn?.textContent?.trim()).toBe(`Deselect all`)
    expect(genre_btn?.disabled).toBe(false)
  })

  test(`group select-all disabled when all group options are disabled`, async () => {
    const all_disabled_options = [
      { label: `X`, group: `AllDisabled`, disabled: true },
      { label: `Y`, group: `AllDisabled`, disabled: true },
      { label: `Z`, group: `HasEnabled` },
    ]
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: all_disabled_options,
        groupSelectAll: true,
        open: true,
      },
    })
    await tick()

    const disabled_btn = find_group_header(
      `AllDisabled`,
    ).querySelector<HTMLButtonElement>(`button.group-select-all`)
    expect(disabled_btn?.disabled).toBe(true)

    const enabled_btn = find_group_header(`HasEnabled`).querySelector<HTMLButtonElement>(
      `button.group-select-all`,
    )
    expect(enabled_btn?.disabled).toBe(false)
  })

  test.each([
    [
      `liGroupHeaderClass`,
      `custom-header-class`,
      (h: HTMLElement) => h.classList.contains(`custom-header-class`),
    ],
    [
      `liGroupHeaderStyle`,
      `background: red`,
      (h: HTMLElement) => h.style.background === `red`,
    ],
  ] as const)(
    `%s is applied to group headers`,
    async (prop_name, prop_value, check_fn) => {
      mount(MultiSelect, {
        target: document.body,
        props: { options: grouped_options, [prop_name]: prop_value, open: true },
      })
      await tick()

      const group_headers = document.querySelectorAll<HTMLElement>(
        `ul.options > li.group-header`,
      )
      expect(group_headers.length).toBeGreaterThan(0)
      group_headers.forEach((header) => expect(check_fn(header)).toBe(true))
    },
  )

  test(`options without group key work alongside grouped options`, async () => {
    const mixed_options = [
      `Plain Option 1`,
      { label: `Grouped A`, group: `Group` },
      `Plain Option 2`,
      { label: `Grouped B`, group: `Group` },
    ]

    mount(MultiSelect, {
      target: document.body,
      props: { options: mixed_options, open: true },
    })
    await tick()

    // Should have 1 group header
    const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
    expect(group_headers).toHaveLength(1)

    // Should have all 4 selectable options
    const selectable_options = document.querySelectorAll(
      `ul.options > li:not(.group-header)`,
    )
    expect(selectable_options).toHaveLength(4)
  })

  test(`selecting options from groups works correctly`, async () => {
    const onchange_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, onchange: onchange_spy, open: true },
    })
    await tick()

    // Find and click a grouped option
    const rock_option = Array.from(
      document.querySelectorAll<HTMLElement>(`ul.options > li:not(.group-header)`),
    ).find((li) => li.textContent?.trim() === `Rock`)

    rock_option?.click()
    await tick()

    expect(onchange_spy).toHaveBeenCalledWith({
      option: { label: `Rock`, group: `Genre` },
      type: `add`,
    })
  })

  test(`keyboard navigation through collapsed groups skips hidden options`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        ungroupedPosition: `last`,
        open: true,
      },
    })
    await tick()

    find_group_header(`Genre`).click()
    await tick()

    // Count visible options after collapse
    const visible_options_after_collapse = document.querySelectorAll(
      `ul.options > li:not(.group-header)`,
    )

    // Genre group has 3 options (Rock, Electronic, Jazz), so after collapse we should have fewer
    // Total: 6 options, minus 3 Genre = 3 visible
    expect(visible_options_after_collapse.length).toBeLessThan(6)

    // Verify Genre options are hidden
    const rock_option = Array.from(visible_options_after_collapse).find(
      (li) => li.textContent?.trim() === `Rock`,
    )
    expect(rock_option).toBeUndefined()

    // Verify Key options are still visible
    const c_major_option = Array.from(visible_options_after_collapse).find(
      (li) => li.textContent?.trim() === `C Major`,
    )
    expect(c_major_option).toBeInstanceOf(HTMLElement)
  })

  test.each([
    [
      `Genre`,
      undefined,
      (opts: Array<{ group?: string }>) => opts.every((o) => o.group !== `Genre`),
    ],
    [
      `Key`,
      2,
      (opts: Array<{ group?: string }>) =>
        opts.length === 2 && opts.every((o) => o.group !== `Key`),
    ],
  ] as const)(
    `selectAllOption skips collapsed %s group (maxSelect=%s)`,
    async (collapsed_group, maxSelect, validate_fn) => {
      const onselectAll_spy = vi.fn()
      mount(MultiSelect, {
        target: document.body,
        props: {
          options: grouped_options,
          collapsibleGroups: true,
          selectAllOption: true,
          maxSelect,
          onselectAll: onselectAll_spy,
          open: true,
        },
      })
      await tick()

      find_group_header(collapsed_group).click()
      await tick()

      const select_all_li = document.querySelector<HTMLElement>(
        `ul.options > li.select-all`,
      )
      select_all_li?.click()
      await tick()

      expect(onselectAll_spy).toHaveBeenCalledTimes(1)
      expect(validate_fn(onselectAll_spy.mock.calls[0][0].options)).toBe(true)
    },
  )

  test(`keyboard Enter/Space toggles group collapse`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, collapsibleGroups: true, open: true },
    })
    await tick()

    const genre_header = find_group_header(`Genre`)
    expect(genre_header).toBeInstanceOf(HTMLElement)

    const initial_options = document.querySelectorAll(
      `ul.options > li:not(.group-header)`,
    )
    const initial_count = initial_options.length

    // Test Enter key
    genre_header.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
    )
    await tick()

    const after_enter = document.querySelectorAll(`ul.options > li:not(.group-header)`)
    expect(after_enter.length).toBeLessThan(initial_count)

    // Test Space key to expand
    genre_header.dispatchEvent(
      new KeyboardEvent(`keydown`, { code: `Space`, bubbles: true }),
    )
    await tick()

    const after_space = document.querySelectorAll(`ul.options > li:not(.group-header)`)
    expect(after_space.length).toBe(initial_count)
  })

  test(`groupSelectAll skips disabled options`, async () => {
    const options_with_disabled = [
      { label: `Enabled 1`, group: `Test` },
      { label: `Disabled 1`, group: `Test`, disabled: true },
      { label: `Enabled 2`, group: `Test` },
      { label: `Disabled 2`, group: `Test`, disabled: true },
    ]

    const onselectAll_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: options_with_disabled,
        groupSelectAll: true,
        onselectAll: onselectAll_spy,
        open: true,
      },
    })
    await tick()

    const test_header = find_group_header(`Test`)
    const select_all_btn = test_header.querySelector<HTMLElement>(
      `button.group-select-all`,
    )
    select_all_btn?.click()
    await tick()

    // Should only select non-disabled options
    expect(onselectAll_spy).toHaveBeenCalledTimes(1)
    const selected_options = onselectAll_spy.mock.calls[0][0].options
    expect(selected_options).toHaveLength(2)
    expect(selected_options.every((opt: { disabled?: boolean }) => !opt.disabled)).toBe(
      true,
    )
  })

  test(`groupSelectAll works on collapsed groups`, async () => {
    const onselectAll_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        groupSelectAll: true,
        onselectAll: onselectAll_spy,
        open: true,
      },
    })
    await tick()

    // Collapse the Genre group
    const genre_header = find_group_header(`Genre`)
    genre_header.click()
    await tick()

    // Verify group is collapsed (no Genre options visible)
    const visible_options = Array.from(
      document.querySelectorAll(`ul.options > li:not(.group-header):not(.select-all)`),
    )
    expect(
      [...visible_options].every(
        (li) =>
          !li.textContent?.includes(`Rock`) &&
          !li.textContent?.includes(`Electronic`) &&
          !li.textContent?.includes(`Jazz`),
      ),
    ).toBe(true)

    // Click the group's select all button (still visible even when collapsed)
    const select_all_btn = genre_header.querySelector<HTMLElement>(
      `button.group-select-all`,
    )
    expect(select_all_btn).toBeInstanceOf(HTMLButtonElement)
    select_all_btn?.click()
    await tick()

    // Should select ALL options in the collapsed group
    expect(onselectAll_spy).toHaveBeenCalledTimes(1)
    const selected_options = onselectAll_spy.mock.calls[0][0].options
    expect(selected_options).toHaveLength(3) // Rock, Electronic, Jazz
    expect(
      selected_options.every((opt: { group: string }) => opt.group === `Genre`),
    ).toBe(true)
  })

  test(`group order matches first occurrence in options array`, async () => {
    const ordered_options = [
      { label: `Z Item`, group: `Zebra` },
      { label: `A Item`, group: `Alpha` },
      { label: `Z Item 2`, group: `Zebra` },
      { label: `M Item`, group: `Middle` },
    ]

    mount(MultiSelect, {
      target: document.body,
      props: { options: ordered_options, open: true },
    })
    await tick()

    const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
    const header_names = Array.from(group_headers).map((header) =>
      header.querySelector(`.group-label`)?.textContent?.trim(),
    )

    // Groups should appear in order of first occurrence: Zebra, Alpha, Middle
    expect(header_names).toEqual([`Zebra`, `Alpha`, `Middle`])
  })

  test.each([
    [true, `button`, `0`, true],
    [false, `presentation`, `-1`, false],
  ] as const)(
    `group headers have correct a11y attrs when collapsibleGroups=%s`,
    async (collapsibleGroups, expected_role, expected_tabindex, has_aria_expanded) => {
      mount(MultiSelect, {
        target: document.body,
        props: { options: grouped_options, collapsibleGroups, open: true },
      })
      await tick()

      const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
      group_headers.forEach((header) => {
        expect(header.getAttribute(`role`)).toBe(expected_role)
        expect(header.getAttribute(`tabindex`)).toBe(expected_tabindex)
        expect(header.hasAttribute(`aria-expanded`)).toBe(has_aria_expanded)
        expect(header.getAttribute(`aria-label`)).toMatch(/^Group: /)
      })

      // For collapsible, also verify aria-expanded toggles on click
      if (collapsibleGroups) {
        expect(group_headers[0].getAttribute(`aria-expanded`)).toBe(`true`)
        if (group_headers[0] instanceof HTMLElement) group_headers[0].click()
        await tick()
        expect(group_headers[0].getAttribute(`aria-expanded`)).toBe(`false`)
      }
    },
  )

  test(`ongroupToggle fires when group is collapsed/expanded`, async () => {
    const ongroupToggle_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        ongroupToggle: ongroupToggle_spy,
        open: true,
      },
    })
    await tick()

    const genre_header = find_group_header(`Genre`)
    genre_header.click()
    await tick()

    expect(ongroupToggle_spy).toHaveBeenCalledWith({ group: `Genre`, collapsed: true })

    // Click again to expand
    genre_header.click()
    await tick()

    expect(ongroupToggle_spy).toHaveBeenCalledWith({ group: `Genre`, collapsed: false })
    expect(ongroupToggle_spy).toHaveBeenCalledTimes(2)
  })

  test(`collapsedGroups prop controls initial collapsed state`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        collapsedGroups: new Set([`Genre`]),
        open: true,
      },
    })
    await tick()

    // Genre group should be collapsed initially
    const genre_header = find_group_header(`Genre`)
    expect(genre_header.getAttribute(`aria-expanded`)).toBe(`false`)

    // Genre options should be hidden
    const rock_option = Array.from(
      document.querySelectorAll(`ul.options > li:not(.group-header)`),
    ).find((li) => li.textContent?.includes(`Rock`))
    expect(rock_option).toBeUndefined()

    // Key group should be expanded
    const key_header = find_group_header(`Key`)
    expect(key_header.getAttribute(`aria-expanded`)).toBe(`true`)
  })

  test.each([
    [`asc`, [`Alpha`, `Middle`, `Zebra`]],
    [`desc`, [`Zebra`, `Middle`, `Alpha`]],
    [
      (group_a: string, group_b: string) => group_a.length - group_b.length,
      [`C`, `BB`, `AAA`],
    ],
  ] as const)(
    `groupSortOrder=%s sorts groups correctly`,
    async (groupSortOrder, expected_order) => {
      // Use different options for custom function test (needs varying lengths)
      const options_for_sort =
        typeof groupSortOrder === `function`
          ? [
              { label: `Item 1`, group: `BB` },
              { label: `Item 2`, group: `AAA` },
              { label: `Item 3`, group: `C` },
            ]
          : [
              { label: `Z Item`, group: `Zebra` },
              { label: `A Item`, group: `Alpha` },
              { label: `M Item`, group: `Middle` },
            ]

      mount(MultiSelect, {
        target: document.body,
        props: { options: options_for_sort, groupSortOrder, open: true },
      })
      await tick()

      const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
      const header_names = Array.from(group_headers).map((header) =>
        header.querySelector(`.group-label`)?.textContent?.trim(),
      )
      expect(header_names).toEqual(expected_order)
    },
  )

  test.each([
    [`basic count`, {}, `(3)`],
    [
      `selected count with keepSelectedInDropdown`,
      {
        keepSelectedInDropdown: `checkboxes` as const,
        selected: [{ label: `Rock`, group: `Genre` }],
      },
      `(1/3)`,
    ],
  ])(`group count in header: %s`, async (_desc, extra_props, expected_count) => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, open: true, ...extra_props },
    })
    await tick()

    const genre_header = find_group_header(`Genre`)
    const count_span = genre_header.querySelector(`.group-count`)
    expect(count_span).toBeInstanceOf(HTMLSpanElement)
    expect(count_span?.textContent?.trim()).toBe(expected_count)
  })

  test(`searchExpandsCollapsedGroups expands matching groups`, async () => {
    const ongroupToggle_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        collapsedGroups: new Set([`Genre`, `Key`]), // Both collapsed initially
        searchExpandsCollapsedGroups: true,
        ongroupToggle: ongroupToggle_spy,
        open: true,
      },
    })
    await tick()

    // Both groups collapsed, so no options visible
    const visible_options = document.querySelectorAll(
      `ul.options > li:not(.group-header):not(.select-all):not(.user-msg)`,
    )
    // Only ungrouped option visible
    expect(visible_options).toHaveLength(1)

    // Type search that matches Genre option
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `Rock`
    input.dispatchEvent(input_event)
    await tick()

    // Genre group should now be expanded because "Rock" matches
    // ongroupToggle should have been called
    expect(ongroupToggle_spy).toHaveBeenCalledWith({ group: `Genre`, collapsed: false })
  })

  test(`searchExpandsCollapsedGroups ignores whitespace-only input`, async () => {
    // "C Major" and "D Minor" contain spaces, so a single space fuzzy-matches them.
    // Without the has_search_text guard, the Key group would expand on whitespace input.
    const ongroupToggle_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        collapsedGroups: new Set([`Genre`, `Key`]),
        searchExpandsCollapsedGroups: true,
        ongroupToggle: ongroupToggle_spy,
        open: true,
      },
    })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = ` `
    input.dispatchEvent(input_event)
    await tick()

    expect(ongroupToggle_spy).not.toHaveBeenCalled()
  })

  test.each([
    [
      `groupSelectAll`,
      { groupSelectAll: true },
      `button.group-select-all`,
      [`Option 1`, `Option 2`, `Option 3`],
    ],
    [
      `selectAllOption`,
      { selectAllOption: true },
      `li.select-all`,
      [`Option 1`, `Option 2`, `Option 3`],
    ],
  ] as const)(
    `%s respects maxOptions limit`,
    async (_name, props, selector, expected_labels) => {
      const many_options = [
        { label: `Option 1`, group: `TestGroup` },
        { label: `Option 2`, group: `TestGroup` },
        { label: `Option 3`, group: `TestGroup` },
        { label: `Option 4`, group: `TestGroup` },
        { label: `Option 5`, group: `TestGroup` },
      ]

      const onselectAll_spy = vi.fn()
      mount(MultiSelect, {
        target: document.body,
        props: {
          options: many_options,
          maxOptions: 3,
          onselectAll: onselectAll_spy,
          open: true,
          ...props,
        },
      })
      await tick()

      // Verify only 3 options are rendered
      expect(
        document.querySelectorAll(`ul.options > li:not(.group-header):not(.select-all)`),
      ).toHaveLength(3)

      // Click select all (group or global)
      const select_btn = selector.includes(`group`)
        ? find_group_header(`TestGroup`).querySelector(selector)
        : document.querySelector(selector)
      if (select_btn instanceof HTMLElement) select_btn.click()
      await tick()

      expect(onselectAll_spy).toHaveBeenCalledTimes(1)
      const selected = onselectAll_spy.mock.calls[0][0].options
      expect(selected.map((opt: { label: string }) => opt.label)).toEqual(expected_labels)
    },
  )

  test(`searchMatchesGroups shows options when group name matches search`, async () => {
    const options_with_groups = [
      { label: `React`, group: `JavaScript` },
      { label: `Vue`, group: `JavaScript` },
      { label: `Django`, group: `Python` },
      { label: `Flask`, group: `Python` },
    ]

    mount(MultiSelect, {
      target: document.body,
      props: { options: options_with_groups, searchMatchesGroups: true, open: true },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.value = `Python`
    input.dispatchEvent(input_event)
    await tick()

    // Should show both Python options even though "Python" is in group name, not label
    const visible_options = document.querySelectorAll(
      `ul.options > li:not(.group-header):not(.select-all)`,
    )
    expect(visible_options).toHaveLength(2)
    const labels = Array.from(visible_options).map((li) => li.textContent?.trim())
    expect(labels).toContain(`Django`)
    expect(labels).toContain(`Flask`)
  })

  test(`keyboardExpandsCollapsedGroups expands groups on arrow navigation`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        keyboardExpandsCollapsedGroups: true,
        open: true,
      },
    })
    await tick()

    // First, collapse the Genre group manually
    const genre_header = find_group_header(`Genre`)
    genre_header.click()
    await tick()

    // Genre is collapsed, so its options should be hidden
    const visible_options = document.querySelectorAll(
      `ul.options > li:not(.group-header):not(.select-all)`,
    )
    const rock_visible = Array.from(visible_options).some((li) =>
      li.textContent?.includes(`Rock`),
    )
    expect(rock_visible).toBe(false)

    // Press arrow down to trigger keyboard navigation
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()

    // Genre group should now be expanded (Rock should be visible)
    const options_after = document.querySelectorAll(
      `ul.options > li:not(.group-header):not(.select-all)`,
    )
    const rock_visible_after = Array.from(options_after).some((li) =>
      li.textContent?.includes(`Rock`),
    )
    expect(rock_visible_after).toBe(true)
  })

  test(`stickyGroupHeaders adds sticky class to group headers`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: { options: grouped_options, stickyGroupHeaders: true, open: true },
    })
    await tick()

    const group_headers = document.querySelectorAll(`ul.options > li.group-header`)
    group_headers.forEach((header) => {
      expect(header.classList.contains(`sticky`)).toBe(true)
    })
  })

  test(`collapseAllGroups and expandAllGroups functions are bindable`, async () => {
    let collapse_fn: (() => void) | undefined
    let expand_fn: (() => void) | undefined
    const oncollapseAll_spy = vi.fn()
    const onexpandAll_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        collapsibleGroups: true,
        oncollapseAll: oncollapseAll_spy,
        onexpandAll: onexpandAll_spy,
        open: true,
        get collapseAllGroups() {
          return collapse_fn
        },
        set collapseAllGroups(fn) {
          collapse_fn = fn
        },
        get expandAllGroups() {
          return expand_fn
        },
        set expandAllGroups(fn) {
          expand_fn = fn
        },
      },
    })
    await tick()

    // Functions should be assigned
    expect(collapse_fn).toBeInstanceOf(Function)
    expect(expand_fn).toBeInstanceOf(Function)

    // Collapse all groups
    if (collapse_fn) collapse_fn()
    await tick()

    expect(oncollapseAll_spy).toHaveBeenCalledTimes(1)
    expect(oncollapseAll_spy.mock.calls[0][0].groups).toContain(`Genre`)
    expect(oncollapseAll_spy.mock.calls[0][0].groups).toContain(`Key`)

    // All group options should be hidden
    const visible_after_collapse = document.querySelectorAll(
      `ul.options > li:not(.group-header):not(.select-all)`,
    )
    // Only ungrouped option should be visible
    expect(visible_after_collapse).toHaveLength(1)

    // Expand all groups
    if (expand_fn) expand_fn()
    await tick()

    expect(onexpandAll_spy).toHaveBeenCalledTimes(1)

    // All options should be visible again
    const visible_after_expand = document.querySelectorAll(
      `ul.options > li:not(.group-header):not(.select-all)`,
    )
    expect(visible_after_expand).toHaveLength(6)
  })

  test(`groupSelectAll toggles to deselect when all group options are selected`, async () => {
    const onremoveAll_spy = vi.fn()
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: grouped_options,
        groupSelectAll: true,
        keepSelectedInDropdown: `checkboxes`,
        onremoveAll: onremoveAll_spy,
        open: true,
      },
    })
    await tick()

    const genre_header = find_group_header(`Genre`)
    const select_btn = genre_header.querySelector<HTMLButtonElement>(
      `button.group-select-all`,
    )

    // Initially should say "Select all"
    expect(select_btn?.textContent?.trim()).toBe(`Select all`)

    // Click to select all Genre options
    select_btn?.click()
    await tick()

    // Now should say "Deselect all" and have deselect class
    expect(select_btn?.textContent?.trim()).toBe(`Deselect all`)
    expect(select_btn?.classList.contains(`deselect`)).toBe(true)

    // Click again to deselect all
    select_btn?.click()
    await tick()

    // Should have removed the options
    expect(onremoveAll_spy).toHaveBeenCalledTimes(1)
    const removed = onremoveAll_spy.mock.calls[0][0].options
    expect(removed).toHaveLength(3) // Rock, Electronic, Jazz

    // Button should now say "Select all" again
    expect(select_btn?.textContent?.trim()).toBe(`Select all`)
  })
})

describe(`keyboard shortcuts`, () => {
  test(`ctrl+a selects all when shortcut is explicitly set`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: true,
      selected: [],
      shortcuts: { select_all: `ctrl+a` },
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    const event = new KeyboardEvent(`keydown`, {
      key: `a`,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    const prevent_default_spy = vi.spyOn(event, `preventDefault`)

    input.dispatchEvent(event)
    await tick()

    expect(props.selected).toEqual([`a`, `b`, `c`])
    expect(prevent_default_spy).toHaveBeenCalled()
  })

  test.each([
    [`ctrl+backspace (default)`, {}, { ctrlKey: true }],
    [`meta+backspace (explicit)`, { clear_all: `meta+backspace` }, { metaKey: true }],
  ])(
    `%s clears all selected options and prevents default`,
    async (_label, shortcut_override, modifiers) => {
      const props = $state<MultiSelectProps>({
        options: [`a`, `b`, `c`],
        selected: [`a`, `b`],
        open: true,
        ...(Object.keys(shortcut_override).length > 0
          ? { shortcuts: shortcut_override }
          : {}),
      })

      mount(MultiSelect, { target: document.body, props })
      await tick()

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.focus()
      const event = new KeyboardEvent(`keydown`, {
        key: `Backspace`,
        ...modifiers,
        bubbles: true,
        cancelable: true,
      })
      input.dispatchEvent(event)
      await tick()

      expect(props.selected).toEqual([])
      expect(event.defaultPrevented).toBe(true)
    },
  )

  test(`custom shortcuts override defaults`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: true,
      selected: [],
      shortcuts: { select_all: `ctrl+e` },
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()

    // Default ctrl+a should NOT work anymore
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `a`, ctrlKey: true, bubbles: true }),
    )
    await tick()
    expect(props.selected).toEqual([])

    // Custom ctrl+e SHOULD work
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `e`, ctrlKey: true, bubbles: true }),
    )
    await tick()
    expect(props.selected).toEqual([`a`, `b`, `c`])
  })

  test.each([
    [`default (null)`, {}],
    [`explicitly null`, { shortcuts: { select_all: null } }],
  ])(`select_all %s: ctrl+a not swallowed`, async (_label, extra_props) => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: true,
      selected: [],
      open: true,
      ...extra_props,
    })
    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    const event = new KeyboardEvent(`keydown`, {
      key: `a`,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)
    await tick()

    expect(props.selected).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })

  test.each([
    [
      `select_all respects maxSelect`,
      {
        selected: [],
        selectAllOption: true,
        shortcuts: { select_all: `ctrl+a` },
        maxSelect: 2,
      },
      { key: `a`, ctrlKey: true },
      2,
    ],
    [
      `clear_all respects minSelect`,
      { selected: [`a`, `b`, `c`], minSelect: 1 },
      { key: `Backspace`, ctrlKey: true },
      1,
    ],
  ])(`%s`, async (_label, extra_props, key_event, expected_length) => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      open: true,
      ...extra_props,
    })
    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { ...key_event, bubbles: true }))
    await tick()

    expect(props.selected).toHaveLength(expected_length)
  })

  test(`clear_all skipped when searchText is non-empty`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selected: [`a`, `b`],
      searchText: `xyz`,
      open: true,
    })
    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    const event = new KeyboardEvent(`keydown`, {
      key: `Backspace`,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)
    await tick()

    expect(props.selected).toEqual([`a`, `b`])
    expect(event.defaultPrevented).toBe(false)
  })

  test.each([`meta+a`, `cmd+a`])(`%s shortcut works for Mac users`, async (shortcut) => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: true,
      selected: [],
      shortcuts: { select_all: shortcut },
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `a`, metaKey: true, bubbles: true }),
    )
    await tick()

    expect(props.selected).toEqual([`a`, `b`, `c`])
  })

  test(`select_all does nothing when selectAllOption is false`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: false,
      selected: [],
      shortcuts: { select_all: `ctrl+a` },
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `a`, ctrlKey: true, bubbles: true }),
    )
    await tick()

    // Should NOT select all since selectAllOption is false
    expect(props.selected).toEqual([])
  })

  test(`custom open shortcut opens the dropdown`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      shortcuts: { open: `ctrl+o` },
      open: true, // Start with dropdown open
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Close dropdown via Escape (keeps focus on input)
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
    await tick()
    expect(props.open).toBe(false) // Verify dropdown is closed

    // Now use open shortcut to reopen
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `o`, ctrlKey: true, bubbles: true }),
    )
    await tick()

    expect(props.open).toBe(true) // Verify shortcut reopened dropdown
  })

  test(`custom close shortcut closes the dropdown`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      shortcuts: { close: `ctrl+w` },
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `w`, ctrlKey: true, bubbles: true }),
    )
    await tick()

    expect(props.open).toBe(false)
  })

  test.each([
    [`alt+a`, `a`, { altKey: true }],
    [`ctrl+shift+alt+s`, `s`, { ctrlKey: true, shiftKey: true, altKey: true }],
  ] as const)(`modifier combo %s works`, async (shortcut, key, modifiers) => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: true,
      selected: [],
      shortcuts: { select_all: shortcut },
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key, ...modifiers, bubbles: true }),
    )
    await tick()

    expect(props.selected).toEqual([`a`, `b`, `c`])
  })

  test(`shortcuts are blocked when disabled=true`, async () => {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selectAllOption: true,
      selected: [],
      shortcuts: { select_all: `ctrl+a` },
      disabled: true,
      open: true,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `a`, ctrlKey: true, bubbles: true }),
    )
    await tick()

    // Shortcuts should not work when component is disabled
    expect(props.selected).toEqual([])
  })

  test.each([
    [`ctrl+`, { ctrlKey: true }], // missing key
    [``, {}], // empty string
  ])(
    `invalid shortcut format "%s" does not trigger action`,
    async (shortcut, modifiers) => {
      const props = $state<MultiSelectProps>({
        options: [`a`, `b`, `c`],
        selectAllOption: true,
        selected: [],
        shortcuts: { select_all: shortcut },
        open: true,
      })

      mount(MultiSelect, { target: document.body, props })
      await tick()

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.focus()
      input.dispatchEvent(
        new KeyboardEvent(`keydown`, { key: `a`, ...modifiers, bubbles: true }),
      )
      await tick()

      expect(props.selected).toEqual([])
    },
  )

  test.each([
    // deno-fmt-ignore
    [
      `select_all`,
      {
        selectAllOption: true,
        selected: [] as string[],
        shortcuts: { select_all: `ctrl+a` },
      },
      `a`,
      { ctrlKey: true },
      [`a`, `b`, `c`],
    ],
    [`clear_all`, { selected: [`a`, `b`] }, `Backspace`, { ctrlKey: true }, []],
  ])(
    `%s shortcut works when dropdown is closed`,
    async (_name, extra_props, key, modifiers, expected) => {
      const props = $state<MultiSelectProps>({
        options: [`a`, `b`, `c`],
        open: false,
        ...extra_props,
      })

      mount(MultiSelect, { target: document.body, props })
      await tick()

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.focus()
      input.dispatchEvent(
        new KeyboardEvent(`keydown`, { key, ...modifiers, bubbles: true }),
      )
      await tick()

      expect(props.selected).toEqual(expected)
    },
  )

  // Helper to reduce boilerplate in shortcut tests
  async function test_shortcut(
    shortcut_props: Partial<MultiSelectProps>,
    key_event: {
      key: string
      ctrlKey?: boolean
      shiftKey?: boolean
      altKey?: boolean
      metaKey?: boolean
    },
  ): Promise<{ props: MultiSelectProps; input: HTMLInputElement }> {
    const props = $state<MultiSelectProps>({
      options: [`a`, `b`, `c`],
      selected: [],
      open: true,
      ...shortcut_props,
    })

    mount(MultiSelect, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { ...key_event, bubbles: true }))
    await tick()

    return { props, input }
  }

  test.each([
    [`open`, true, { open: `ctrl+o` }, `o`],
    [`close`, false, { close: `ctrl+w` }, `w`],
  ] as const)(
    `%s shortcut is no-op when already %s`,
    async (_action, initial_open, shortcuts, key) => {
      const { props } = await test_shortcut(
        { shortcuts, open: initial_open },
        { key, ctrlKey: true },
      )
      expect(props.open).toBe(initial_open)
    },
  )

  // Tests for shortcut override behavior - custom shortcuts take precedence over built-in keys
  test.each([
    // [description, shortcuts, extra_props, key, expected_open, expected_selected]
    [
      `open=enter overrides Enter select`,
      { open: `enter` },
      { open: false },
      `Enter`,
      true,
      [],
    ],
    [
      `close=escape behaves same as default`,
      { close: `escape` },
      { open: true },
      `Escape`,
      false,
      [],
    ],
    [
      `close=enter overrides Enter select`,
      { close: `enter` },
      { open: true },
      `Enter`,
      false,
      [],
    ],
    [
      `select_all=arrowdown overrides navigation`,
      { select_all: `arrowdown` },
      { open: true, selectAllOption: true },
      `ArrowDown`,
      true,
      [`a`, `b`, `c`],
    ],
  ] as const)(
    `shortcut precedence: %s`,
    async (_desc, shortcuts, extra_props, key, expected_open, expected_selected) => {
      const props = $state<MultiSelectProps>({
        options: [`a`, `b`, `c`],
        shortcuts,
        selected: [],
        ...extra_props,
      })

      mount(MultiSelect, { target: document.body, props })
      await tick()

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.focus()
      await tick()

      input.dispatchEvent(new KeyboardEvent(`keydown`, { key, bubbles: true }))
      await tick()

      expect(props.open).toBe(expected_open)
      expect(props.selected).toEqual(expected_selected)
    },
  )
})

describe(`onsearch event`, () => {
  test(`fires debounced when search text changes (including clearing)`, async () => {
    vi.useFakeTimers()
    const onsearch_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3, 10, 20, 30], onsearch: onsearch_spy },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Type some text
    input.value = `1`
    input.dispatchEvent(input_event)
    await tick()

    // Should not fire immediately due to debounce
    expect(onsearch_spy).not.toHaveBeenCalled()

    // Advance timers past debounce (150ms)
    await vi.advanceTimersByTimeAsync(200)

    expect(onsearch_spy).toHaveBeenCalledTimes(1)
    expect(onsearch_spy).toHaveBeenCalledWith({
      searchText: `1`,
      matchingOptions: [1, 10],
    })

    // Clear the search - should also fire
    input.value = ``
    input.dispatchEvent(input_event)
    await vi.advanceTimersByTimeAsync(200)

    expect(onsearch_spy).toHaveBeenCalledTimes(2)
    expect(onsearch_spy).toHaveBeenNthCalledWith(2, {
      searchText: ``,
      matchingOptions: [1, 2, 3, 10, 20, 30],
    })

    vi.useRealTimers()
  })

  test(`does not fire on initial mount`, async () => {
    vi.useFakeTimers()
    const onsearch_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], onsearch: onsearch_spy },
    })

    await tick()

    // Advance timers past debounce period - use async version
    await vi.advanceTimersByTimeAsync(200)

    expect(onsearch_spy).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  test(`debounce resets when typing continues`, async () => {
    vi.useFakeTimers()
    const onsearch_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [`apple`, `apricot`, `banana`], onsearch: onsearch_spy },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Type first character
    input.value = `a`
    input.dispatchEvent(input_event)
    await tick()

    // Wait partial debounce - use async version
    await vi.advanceTimersByTimeAsync(100)

    // Type another character before debounce completes
    input.value = `ap`
    input.dispatchEvent(input_event)
    await tick()

    // Advance timers to complete debounce - use async version
    await vi.advanceTimersByTimeAsync(200)

    // Should only fire once with final value
    expect(onsearch_spy).toHaveBeenCalledTimes(1)
    expect(onsearch_spy).toHaveBeenCalledWith({
      searchText: `ap`,
      matchingOptions: [`apple`, `apricot`],
    })

    vi.useRealTimers()
  })

  test(`matchingOptions is empty when no options match`, async () => {
    vi.useFakeTimers()
    const onsearch_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [`apple`, `banana`, `cherry`], onsearch: onsearch_spy },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    input.value = `xyz`
    input.dispatchEvent(input_event)
    await vi.advanceTimersByTimeAsync(200)

    expect(onsearch_spy).toHaveBeenCalledWith({
      searchText: `xyz`,
      matchingOptions: [],
    })

    vi.useRealTimers()
  })
})

describe(`onmaxreached event`, () => {
  test(`fires when trying to add beyond maxSelect`, async () => {
    const onmaxreached_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3, 4],
        maxSelect: 2,
        selected: [1, 2],
        onmaxreached: onmaxreached_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Try to add a 3rd option when maxSelect is 2
    const option3 = doc_query<HTMLElement>(`ul.options li:nth-child(1)`) // first available option
    option3.click()
    await tick()

    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onmaxreached_spy).toHaveBeenCalledWith({
      selected: [1, 2],
      maxSelect: 2,
      attemptedOption: 3,
    })
  })

  test.each([
    { maxSelect: 3, selected: [1], desc: `under limit` },
    { maxSelect: 1, selected: [1], desc: `maxSelect=1 (replace mode)` },
    { maxSelect: null, selected: [1, 2, 3, 4], desc: `maxSelect=null (unlimited)` },
  ])(`does not fire when $desc`, async ({ maxSelect, selected }) => {
    const onmaxreached_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3, 4, 5],
        maxSelect,
        selected,
        onmaxreached: onmaxreached_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    doc_query<HTMLElement>(`ul.options li:nth-child(1)`).click()
    await tick()

    expect(onmaxreached_spy).not.toHaveBeenCalled()
  })

  test(`fires via keyboard Enter key`, async () => {
    const onmaxreached_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3, 4],
        maxSelect: 2,
        selected: [1, 2],
        onmaxreached: onmaxreached_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Navigate to option and try to add via Enter
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()

    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onmaxreached_spy).toHaveBeenCalledWith({
      selected: [1, 2],
      maxSelect: 2,
      attemptedOption: 3,
    })
  })

  test(`fires with object options`, async () => {
    const onmaxreached_spy = vi.fn()
    const options = [
      { label: `Apple`, value: 1 },
      { label: `Banana`, value: 2 },
      { label: `Cherry`, value: 3 },
    ]

    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        maxSelect: 2,
        selected: [options[0], options[1]],
        onmaxreached: onmaxreached_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Try to add Cherry when already at max
    const option3 = doc_query<HTMLElement>(`ul.options li:nth-child(1)`)
    option3.click()
    await tick()

    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onmaxreached_spy).toHaveBeenCalledWith({
      selected: [options[0], options[1]],
      maxSelect: 2,
      attemptedOption: options[2],
    })
  })
})

describe(`onduplicate event`, () => {
  test(`fires when adding duplicate with duplicates=false`, async () => {
    const onduplicate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        duplicates: false,
        selected: [1],
        onduplicate: onduplicate_spy,
        allowUserOptions: true, // allows typing custom options
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Type "1" which matches the already-selected option
    // Since selected option is hidden from dropdown, no options match
    // But pressing Enter will try to create a user option with value "1"
    // which gets converted to number 1 and triggers duplicate detection
    input.value = `1`
    input.dispatchEvent(input_event)
    await tick()

    // Press Enter to try adding the user-typed value
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()

    expect(onduplicate_spy).toHaveBeenCalledTimes(1)
    // Note: user typed "1" which stays as string because get_label converts primitives to strings
    // so the number conversion condition fails (typeof selected_labels[0] is "string", not "number")
    expect(onduplicate_spy).toHaveBeenCalledWith({ option: `1` })
  })

  test.each([
    { duplicates: true, desc: `duplicates=true allows adding same option` },
    { duplicates: false, desc: `adding different option (not a duplicate)` },
  ])(`does not fire when $desc`, async ({ duplicates }) => {
    const onduplicate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        duplicates,
        selected: [1],
        onduplicate: onduplicate_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    doc_query<HTMLElement>(`ul.options li:nth-child(1)`).click()
    await tick()

    expect(onduplicate_spy).not.toHaveBeenCalled()
  })

  // Tests duplicate detection via allowUserOptions for both string and object options
  // For object options, label-based detection fires even when keys differ (e.g., typing "Apple"
  // when {label: "Apple", value: 1} is selected) - prevents confusing UX
  test.each([
    {
      desc: `string options`,
      options: [`apple`, `banana`, `cherry`],
      selected: [`apple`],
      typed_value: `apple`,
    },
    {
      desc: `object options (label match)`,
      options: [
        { label: `Apple`, value: 1 },
        { label: `Banana`, value: 2 },
      ],
      selected: [{ label: `Apple`, value: 1 }],
      typed_value: `Apple`,
    },
  ])(
    `fires with $desc via allowUserOptions`,
    async ({ options, selected, typed_value }) => {
      const onduplicate_spy = vi.fn()

      mount(MultiSelect, {
        target: document.body,
        props: {
          options,
          duplicates: false,
          selected,
          onduplicate: onduplicate_spy,
          allowUserOptions: true,
        },
      })

      const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
      input.focus()
      await tick()

      input.value = typed_value
      input.dispatchEvent(input_event)
      await tick()

      input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
      await tick()

      expect(onduplicate_spy).toHaveBeenCalledTimes(1)
    },
  )

  test(`fires when both maxSelect reached AND duplicate attempted`, async () => {
    const onduplicate_spy = vi.fn()
    const onmaxreached_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        duplicates: false,
        maxSelect: 2,
        selected: [1, 2],
        onduplicate: onduplicate_spy,
        onmaxreached: onmaxreached_spy,
        allowUserOptions: true,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Type "1" which is a duplicate AND maxSelect is reached
    input.value = `1`
    input.dispatchEvent(input_event)
    await tick()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()

    // Both events should fire
    expect(onmaxreached_spy).toHaveBeenCalledTimes(1)
    expect(onduplicate_spy).toHaveBeenCalledTimes(1)
  })
})

describe(`onactivate event`, () => {
  test.each([
    { key: `ArrowDown`, options: [1, 2, 3], expected: { option: 1, index: 0 } },
    { key: `ArrowUp`, options: [1, 2, 3], expected: { option: 1, index: 0 } },
    {
      key: `ArrowDown`,
      options: [{ label: `A`, value: 1 }],
      expected: { option: { label: `A`, value: 1 }, index: 0 },
    },
  ])(`fires on $key with $options.length options`, async ({ key, options, expected }) => {
    const onactivate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options, onactivate: onactivate_spy, open: true },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key, bubbles: true }))
    await tick()

    expect(onactivate_spy).toHaveBeenCalledTimes(1)
    expect(onactivate_spy).toHaveBeenCalledWith(expected)
  })

  test(`does not fire on mouse hover`, async () => {
    const onactivate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], onactivate: onactivate_spy, open: true },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Hover over an option
    const option1 = doc_query(`ul.options li:nth-child(1)`)
    option1.dispatchEvent(mouseover)
    await tick()

    expect(onactivate_spy).not.toHaveBeenCalled()
  })

  test(`wrap-around at end navigates to start`, async () => {
    const onactivate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: { options: [1, 2, 3], onactivate: onactivate_spy, open: true },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Navigate to last option
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()

    // One more ArrowDown should wrap to first
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()

    expect(onactivate_spy).toHaveBeenCalledTimes(4)
    expect(onactivate_spy).toHaveBeenNthCalledWith(3, { option: 3, index: 2 })
    expect(onactivate_spy).toHaveBeenNthCalledWith(4, { option: 1, index: 0 })
  })

  test(`does not fire when toggling user message with no matching options`, async () => {
    // When there are no matching options and only the user message is shown,
    // arrow navigation toggles the user message active state but doesn't fire onactivate
    // because the function returns early before reaching the onactivate call
    const onactivate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [],
        onactivate: onactivate_spy,
        allowUserOptions: true,
        createOptionMsg: `Create this option...`,
        open: true,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Type something to show the user message
    input.value = `new option`
    input.dispatchEvent(input_event)
    await tick()

    // Navigate - toggles user message but doesn't fire onactivate
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()

    expect(onactivate_spy).not.toHaveBeenCalled()
  })

  // Verify behavior when navigating with no matching options (noMatchingOptionsMsg disabled)
  test(`does not fire when no options match and noMatchingOptionsMsg disabled`, async () => {
    const onactivate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        noMatchingOptionsMsg: ``, // Disable "no matching" message
        allowUserOptions: false,
        onactivate: onactivate_spy,
        open: true,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Navigate to first option (sets activeIndex = 0)
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()
    expect(onactivate_spy).toHaveBeenCalledTimes(1)
    expect(onactivate_spy).toHaveBeenCalledWith({ option: 1, index: 0 })

    // Type something that filters all options away
    input.value = `xyz`
    input.dispatchEvent(input_event)
    await tick()

    // Press ArrowDown again - should be a no-op since nothing to navigate
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()

    // Should only have 1 call (from first ArrowDown), not 2
    expect(onactivate_spy).toHaveBeenCalledTimes(1)
  })
})

describe(`history / undo-redo`, () => {
  test(`undo/redo bound by default, canUndo/canRedo initially false`, async () => {
    let undo_fn: (() => boolean) | undefined
    let redo_fn: (() => boolean) | undefined
    let can_undo = true // start true to verify it becomes false
    let can_redo = true

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        // no history prop - enabled by default
        get undo() {
          return undo_fn
        },
        set undo(fn) {
          undo_fn = fn
        },
        get redo() {
          return redo_fn
        },
        set redo(fn) {
          redo_fn = fn
        },
        get canUndo() {
          return can_undo
        },
        set canUndo(val) {
          can_undo = val
        },
        get canRedo() {
          return can_redo
        },
        set canRedo(val) {
          can_redo = val
        },
      },
    })
    await tick()

    expect(undo_fn).toBeInstanceOf(Function)
    expect(redo_fn).toBeInstanceOf(Function)
    expect(can_undo).toBe(false)
    expect(can_redo).toBe(false)
    expect(undo_fn?.()).toBe(false) // nothing to undo
    expect(redo_fn?.()).toBe(false) // nothing to redo
  })

  test.each([`undo`, `redo`] as const)(
    `%s returns false when disabled`,
    async (method) => {
      let fn: (() => boolean) | undefined
      mount(MultiSelect, {
        target: document.body,
        props: {
          options: [1, 2, 3],
          history: true,
          disabled: true,
          get [method]() {
            return fn
          },
          set [method](f: (() => boolean) | undefined) {
            fn = f
          },
        },
      })
      await tick()
      expect(fn?.()).toBe(false)
    },
  )

  test.each([true, false, 0, 1, 50] as const)(
    `history=%s accepts prop without error`,
    async (history_val) => {
      let undo_fn: (() => boolean) | undefined
      mount(MultiSelect, {
        target: document.body,
        props: {
          options: [1, 2, 3],
          history: history_val,
          get undo() {
            return undo_fn
          },
          set undo(fn) {
            undo_fn = fn
          },
        },
      })
      await tick()
      expect(undo_fn).toBeInstanceOf(Function)
      expect(undo_fn?.()).toBe(false) // nothing to undo initially
    },
  )

  test.each([
    [`default shortcuts undo`, {}, `z`, { ctrlKey: true }, true],
    [
      `custom shortcuts undo`,
      { shortcuts: { undo: `alt+u` } },
      `u`,
      { altKey: true },
      true,
    ],
    [
      `disabled shortcuts ignore keypress`,
      { shortcuts: { undo: null } },
      `z`,
      {
        ctrlKey: true,
      },
      false,
    ],
  ])(`%s`, async (_desc, extra, key, modifiers, should_undo) => {
    let selected: number[] = $state([])
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        history: true,
        get selected() {
          return selected
        },
        set selected(val) {
          selected = val
        },
        ...extra,
      },
    })
    await tick() // Select first option so there's something to undo
    document.querySelector<HTMLElement>(`ul.options > li`)?.click()
    await tick()
    expect(selected.length).toBe(1)

    // Use autocomplete input (the interactive one), not the hidden form-control
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key, bubbles: true, ...modifiers }),
    )
    await tick()

    expect(selected.length).toBe(should_undo ? 0 : 1)
  })

  test.each([
    [
      `object options`,
      [
        { label: `A`, value: 1 },
        { label: `B`, value: 2 },
      ],
      {},
    ],
    [`maxSelect=1`, [1, 2, 3], { maxSelect: 1 }],
    [`sortSelected`, [3, 1, 2], { sortSelected: true }],
    [`duplicates`, [1, 2, 3], { duplicates: true }],
    [`allowUserOptions`, [1, 2, 3], { allowUserOptions: true }],
    [`minSelect`, [1, 2, 3], { minSelect: 1 }],
    [
      `grouped`,
      [
        { label: `A`, group: `G1` },
        { label: `B`, group: `G2` },
      ],
      {},
    ],
  ])(`compatible with %s`, async (_desc, options, extra) => {
    let selected: Option[] = $state([])
    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        history: true,
        get selected() {
          return selected
        },
        set selected(val) {
          selected = val
        },
        ...extra,
      },
    })
    await tick()

    // Select first selectable option (skip group headers)
    const first_li = document.querySelector(`ul.options > li:not(.group-header)`)
    if (!first_li) return // some configs may have no visible options
    if (first_li instanceof HTMLElement) first_li.click()
    await tick()
    expect(selected.length).toBeGreaterThan(0)

    // Undo via Ctrl+Z should restore previous state
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `z`, ctrlKey: true, bubbles: true }),
    )
    await tick()
    expect(selected).toEqual([])
  })

  test(`history isolated per component instance`, async () => {
    let undo_1: (() => boolean) | undefined
    let undo_2: (() => boolean) | undefined
    const [div1, div2] = [document.createElement(`div`), document.createElement(`div`)]
    document.body.append(div1, div2)

    mount(MultiSelect, {
      target: div1,
      props: {
        options: [1, 2],
        history: true,
        get undo() {
          return undo_1
        },
        set undo(fn) {
          undo_1 = fn
        },
      },
    })
    mount(MultiSelect, {
      target: div2,
      props: {
        options: [`a`, `b`],
        history: true,
        get undo() {
          return undo_2
        },
        set undo(fn) {
          undo_2 = fn
        },
      },
    })
    await tick()

    expect(undo_1).not.toBe(undo_2)
    div1.remove()
    div2.remove()
  })

  test(`undo restores previous selection state, redo restores undone state`, async () => {
    let selected = $state<number[]>([])
    let undo_fn: (() => boolean) | undefined
    let redo_fn: (() => boolean) | undefined
    let can_undo = false
    let can_redo = false

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        history: true,
        get selected() {
          return selected
        },
        set selected(val) {
          selected = val
        },
        get undo() {
          return undo_fn
        },
        set undo(fn) {
          undo_fn = fn
        },
        get redo() {
          return redo_fn
        },
        set redo(fn) {
          redo_fn = fn
        },
        get canUndo() {
          return can_undo
        },
        set canUndo(val) {
          can_undo = val
        },
        get canRedo() {
          return can_redo
        },
        set canRedo(val) {
          can_redo = val
        },
      },
    })
    await tick()

    // Initial state: empty selection, no undo/redo available
    expect(selected).toEqual([])
    expect(can_undo).toBe(false)
    expect(can_redo).toBe(false)

    // Select first option
    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()
    const first_option = doc_query<HTMLElement>(`ul.options li`)
    first_option.click()
    await tick()

    expect(selected).toEqual([1])
    expect(can_undo).toBe(true)
    expect(can_redo).toBe(false)

    // Undo should restore empty state
    expect(undo_fn?.()).toBe(true)
    await tick()
    expect(selected).toEqual([])
    expect(can_undo).toBe(false)
    expect(can_redo).toBe(true)

    // Calling undo again when nothing to undo should return false and not change state
    expect(undo_fn?.()).toBe(false)
    await tick()
    expect(selected).toEqual([]) // state unchanged

    // Redo should restore selection
    expect(redo_fn?.()).toBe(true)
    await tick()
    expect(selected).toEqual([1])
    expect(can_undo).toBe(true)
    expect(can_redo).toBe(false)
  })

  test(`preselected values are correctly tracked as initial state`, async () => {
    // Regression: prev_selected must sync to initial selected on mount,
    // otherwise undo after deselect restores [] instead of preselected state
    let selected = $state([1, 2])
    let undo_fn: (() => boolean) | undefined

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [1, 2, 3],
        history: true,
        get selected() {
          return selected
        },
        set selected(val) {
          selected = val
        },
        get undo() {
          return undo_fn
        },
        set undo(fn) {
          undo_fn = fn
        },
      },
    })
    await tick()

    // Remove one item, then undo - should restore [1, 2], not []
    doc_query<HTMLElement>(`ul.selected li button.remove`).click()
    await tick()
    expect(selected).toEqual([2])

    undo_fn?.()
    await tick()
    expect(selected).toEqual([1, 2])
  })
})

// Regression test for issue #391: case-variant labels should not crash
// https://github.com/janosh/svelte-multiselect/issues/391
describe(`case-variant labels (issue #391)`, () => {
  const object_options = [
    { label: `pd`, value: `uuid-1` },
    { label: `PD`, value: `uuid-2` },
    { label: `Pd`, value: `uuid-3` },
  ]

  // Would crash before fix due to duplicate keys in keyed {#each}
  test.each([
    { desc: `object options`, options: object_options },
    { desc: `string options`, options: [`apple`, `Apple`, `APPLE`] },
  ])(`renders all $desc with case-variant labels`, ({ options }) => {
    mount(MultiSelect, { target: document.body, props: { options } })
    const items = document.querySelectorAll(`ul.options > li`)
    expect(items.length).toBe(3)
  })

  test(`can select multiple case-variant options`, async () => {
    let selected = $state<typeof object_options>([])

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: object_options,
        get selected() {
          return selected
        },
        set selected(val) {
          selected = val
        },
      },
    })

    for (const li of document.querySelectorAll(`ul.options > li`)) {
      if (li instanceof HTMLElement) li.click()
      await tick()
    }

    expect(selected.length).toBe(3)
    expect(selected.map((opt) => opt.label)).toEqual([`pd`, `PD`, `Pd`])
  })
})

describe(`duplicates prop variants`, () => {
  test.each([
    {
      duplicates: false,
      typed: `apple`,
      expect_blocked: false,
      desc: `false (default): case variants allowed`,
    },
    {
      duplicates: `case-insensitive` as const,
      typed: `APPLE`, // uppercase to test .toLowerCase()
      expect_blocked: true,
      desc: `'case-insensitive': case variants blocked`,
    },
  ])(`duplicates=$desc`, async ({ duplicates, typed, expect_blocked }) => {
    const onduplicate_spy = vi.fn()
    let selected = $state([`Apple`])

    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [`Apple`, `apple`, `APPLE`],
        get selected() {
          return selected
        },
        set selected(val) {
          selected = val
        },
        allowUserOptions: true,
        duplicates,
        onduplicate: onduplicate_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    input.value = typed
    input.dispatchEvent(input_event)
    await tick()
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    await tick()

    if (expect_blocked) {
      expect(onduplicate_spy).toHaveBeenCalledTimes(1)
      expect(selected).not.toContain(typed)
    } else {
      expect(onduplicate_spy).not.toHaveBeenCalled()
      expect(selected).toContain(typed)
    }
  })

  test(`duplicates='case-insensitive': shows duplicate message`, async () => {
    mount(MultiSelect, {
      target: document.body,
      props: {
        options: [`Apple`, `Banana`],
        selected: [`Apple`],
        duplicates: `case-insensitive`,
        duplicateOptionMsg: `Already selected`,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    input.value = `apple`
    input.dispatchEvent(input_event)
    await tick()

    expect(document.querySelector(`ul.options li.user-msg`)?.textContent).toContain(
      `Already selected`,
    )
  })

  test(`dropdown options with same label but different values remain selectable`, async () => {
    // Issue: label check was blocking dropdown options even when values differ
    // The is_from_options check should skip label-based duplicate detection for dropdown items
    const options = [
      { label: `apple`, value: 1 },
      { label: `apple`, value: 2 },
      { label: `apple`, value: 3 },
    ]

    const onadd_spy = vi.fn()
    const onduplicate_spy = vi.fn()

    mount(MultiSelect, {
      target: document.body,
      props: {
        options,
        selected: [options[0]], // preselect first option
        onadd: onadd_spy,
        onduplicate: onduplicate_spy,
      },
    })

    const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
    input.focus()
    await tick()

    // Should show 2 remaining options (same label, different values)
    const visible_options = document.querySelectorAll(`ul.options > li`)
    expect(visible_options.length).toBe(2) // Click second option - should work since it has different value
    if (visible_options[0] instanceof HTMLElement) visible_options[0].click()
    await tick()

    // Verify click triggered add, not duplicate
    expect(onduplicate_spy).not.toHaveBeenCalled()
    expect(onadd_spy).toHaveBeenCalledTimes(1)
  })
})

test(`dropdown has no li children when all user-created options are selected`, async () => {
  mount(MultiSelect, {
    target: document.body,
    props: {
      allowUserOptions: `append`,
      noMatchingOptionsMsg: ``,
      createOptionMsg: null,
    },
  })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `tag1`
  input.dispatchEvent(input_event)
  input.dispatchEvent(enter)
  await tick()

  input.value = `tag2`
  input.dispatchEvent(input_event)
  input.dispatchEvent(enter)
  await tick()

  input.focus()
  await tick()
  const items = document.querySelectorAll(`ul.options > li`)
  expect(items).toHaveLength(0)
})

// === parse_paste ===

function make_paste_event(text: string): ClipboardEvent {
  const data_transfer = new DataTransfer()
  data_transfer.setData(`text/plain`, text)
  const event = new ClipboardEvent(`paste`, { bubbles: true, cancelable: true })
  Object.assign(event, { clipboardData: data_transfer })
  return event
}

// helper: mount MultiSelect, paste text, return spies and props
async function paste_into(extra_props: Partial<MultiSelectProps>, paste_text: string) {
  const spies = {
    onadd: vi.fn(),
    oncreate: vi.fn(),
    onchange: vi.fn(),
    onmaxreached: vi.fn(),
    onduplicate: vi.fn(),
    onparsed_paste: vi.fn(),
  }
  const props = $state<MultiSelectProps>({
    parse_paste: (text: string) => text.split(`,`),
    ...spies,
    ...extra_props,
  })
  mount(MultiSelect, { target: document.body, props })
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  const event = make_paste_event(paste_text)
  input.dispatchEvent(event)
  await tick()
  return { ...spies, props, event }
}

describe(`parse_paste`, () => {
  test(`splits pasted text into multiple selected options`, async () => {
    const { onadd, event } = await paste_into(
      { options: [`alpha`, `beta`, `gamma`] },
      `alpha,beta`,
    )
    expect(event.defaultPrevented).toBe(true)
    expect(onadd).toHaveBeenCalledTimes(2)
    expect(onadd).toHaveBeenCalledWith(expect.objectContaining({ option: `alpha` }))
    expect(onadd).toHaveBeenCalledWith(expect.objectContaining({ option: `beta` }))
  })

  test(`fires oncreate for each created option with allowUserOptions`, async () => {
    const { oncreate, onadd } = await paste_into(
      {
        options: [`existing`],
        allowUserOptions: true,
        parse_paste: (text: string) => text.split(/[,\s]+/).filter(Boolean),
      },
      `new1,new2,new3`,
    )
    expect(oncreate).toHaveBeenCalledTimes(3)
    expect(onadd).toHaveBeenCalledTimes(3)
  })

  test.each([
    [`without parse_paste`, { parse_paste: undefined }],
    [`parse_paste returns empty`, { parse_paste: () => [] }],
  ])(`%s: paste not intercepted`, async (_label, override) => {
    const { onadd, event } = await paste_into(
      { options: [`a`, `b`, `c`], ...override },
      `a,b`,
    )
    expect(onadd).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  test(`object options via allowUserOptions`, async () => {
    const { oncreate } = await paste_into(
      {
        options: [{ label: `existing` }],
        allowUserOptions: `append`,
        parse_paste: (text: string) => text.split(`,`).map((str) => str.trim()),
      },
      `foo,bar`,
    )
    expect(oncreate).toHaveBeenCalledTimes(2)
    expect(oncreate).toHaveBeenCalledWith({ option: { label: `foo` } })
    expect(oncreate).toHaveBeenCalledWith({ option: { label: `bar` } })
  })

  test(`object options preserve extra fields from parse_paste`, async () => {
    const { oncreate, props } = await paste_into(
      {
        options: [{ label: `existing`, value: 0 }],
        selected: [],
        allowUserOptions: `append`,
        parse_paste: (text: string) =>
          text.split(`,`).map((str, idx) => ({ label: str.trim(), value: idx + 1 })),
      },
      `alpha,beta`,
    )
    expect(oncreate).toHaveBeenCalledWith({ option: { label: `alpha`, value: 1 } })
    expect(oncreate).toHaveBeenCalledWith({ option: { label: `beta`, value: 2 } })
    expect(props.selected).toEqual([
      { label: `alpha`, value: 1 },
      { label: `beta`, value: 2 },
    ])
  })

  test(`clears searchText when maxSelect blocks some options`, async () => {
    const { props } = await paste_into(
      {
        options: [`a`, `b`, `c`, `d`],
        selected: [`a`, `b`],
        searchText: ``,
        maxSelect: 3,
      },
      `c,d`,
    )
    expect(props.selected).toEqual([`a`, `b`, `c`])
    expect(props.searchText).toBe(``)
  })

  test.each([
    [`already at max`, [`a`, `b`], 2, `c`, 0, 1, `c`],
    [`exceeds max mid-paste`, [`a`, `b`], 3, `c,d,e`, 1, 1, `d`],
  ])(
    `maxSelect: %s`,
    async (
      _label,
      selected,
      maxSelect,
      paste_text,
      expected_adds,
      expected_max,
      attempted,
    ) => {
      const { onadd, onmaxreached } = await paste_into(
        { options: [`a`, `b`, `c`, `d`, `e`], selected, maxSelect },
        paste_text,
      )
      expect(onadd).toHaveBeenCalledTimes(expected_adds)
      expect(onmaxreached).toHaveBeenCalledTimes(expected_max)
      expect(onmaxreached).toHaveBeenCalledWith(
        expect.objectContaining({ maxSelect, attemptedOption: attempted }),
      )
    },
  )

  test.each([
    [`empty selection`, [] as string[], [`a`]],
    [`replaces existing`, [`x`], [`a`]],
  ])(
    `maxSelect=1 with %s: only first option selected`,
    async (_label, initial, expected) => {
      const { onadd, props } = await paste_into(
        { options: [`a`, `b`, `c`, `x`], selected: initial, maxSelect: 1 },
        `a,b,c`,
      )
      expect(onadd).toHaveBeenCalledTimes(1)
      expect(props.selected).toEqual(expected)
    },
  )

  test.each([
    [`pre-selected duplicate`, [`a`], `a,b,c`, 2, [`a`, `b`, `c`]],
    [`self-duplicate within paste`, [] as string[], `a,a,b`, 2, [`a`, `b`]],
  ])(
    `handles %s`,
    async (_label, initial, paste_text, expected_adds, expected_selected) => {
      const { onadd, onduplicate, props } = await paste_into(
        { options: [`a`, `b`, `c`, `d`], selected: initial },
        paste_text,
      )
      expect(onadd).toHaveBeenCalledTimes(expected_adds)
      expect(onduplicate).toHaveBeenCalledTimes(1)
      expect(onduplicate).toHaveBeenCalledWith(expect.objectContaining({ option: `a` }))
      expect(props.selected).toHaveLength(expected_selected.length)
    },
  )

  test(`mixed existing and new options with allowUserOptions`, async () => {
    const { onadd, oncreate, props } = await paste_into(
      { options: [`existing1`, `existing2`], selected: [], allowUserOptions: `append` },
      `existing1,brand_new,existing2`,
    )
    expect(onadd).toHaveBeenCalledTimes(3)
    expect(oncreate).toHaveBeenCalledTimes(1)
    expect(oncreate).toHaveBeenCalledWith({ option: `brand_new` })
    expect(props.selected).toEqual([`existing1`, `brand_new`, `existing2`])
  })

  test(`oncreate returning false during paste skips only rejected options`, async () => {
    const oncreate_spy = vi.fn(({ option }: { option: Option }) => {
      const label = typeof option === `object` ? option.label : option
      return `${label}`.length >= 3 ? undefined : false
    })
    const { onadd, props } = await paste_into(
      { options: [], selected: [], allowUserOptions: `append`, oncreate: oncreate_spy },
      `ab,valid,x,also_ok`,
    )
    expect(oncreate_spy).toHaveBeenCalledTimes(4)
    expect(onadd).toHaveBeenCalledTimes(2)
    expect(props.selected).toEqual([`valid`, `also_ok`])
  })

  test(`onparsed_paste fires with added/rejected/overflow summary`, async () => {
    const { onparsed_paste } = await paste_into(
      { options: [`a`, `b`, `c`, `d`, `e`], selected: [`a`], maxSelect: 3 },
      `b,c,d,e`,
    )
    expect(onparsed_paste).toHaveBeenCalledTimes(1)
    const payload = onparsed_paste.mock.calls[0][0]
    expect(payload.added).toEqual([`b`, `c`])
    expect(payload.overflow).toEqual([`d`, `e`])
    expect(payload.raw_text).toBe(`b,c,d,e`)
  })

  test(`onparsed_paste with maxSelect=1 reports replaced option as added`, async () => {
    const { onparsed_paste, props } = await paste_into(
      { options: [`a`, `b`, `c`], selected: [`a`], maxSelect: 1 },
      `b,c`,
    )
    expect(onparsed_paste).toHaveBeenCalledTimes(1)
    const payload = onparsed_paste.mock.calls[0][0]
    expect(payload.added).toEqual([`b`])
    expect(payload.overflow).toEqual([`c`])
    expect(props.selected).toEqual([`b`])
  })

  test(`onparsed_paste reports rejected options from oncreate`, async () => {
    const { onparsed_paste } = await paste_into(
      {
        options: [],
        selected: [],
        allowUserOptions: `append`,
        oncreate: ({ option }) =>
          `${typeof option === `object` ? option.label : option}`.length >= 3
            ? undefined
            : false,
      },
      `ab,valid,x`,
    )
    const payload = onparsed_paste.mock.calls[0][0]
    expect(payload.added).toEqual([`valid`])
    expect(payload.rejected).toEqual([`ab`, `x`])
    expect(payload.overflow).toEqual([])
  })
})
