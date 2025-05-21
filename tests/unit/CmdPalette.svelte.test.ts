import { CmdPalette } from '$lib'
import { mount, tick } from 'svelte'
import { expect, test, vi } from 'vitest'
import { doc_query } from '.'

const actions = [{ label: `action 1`, action: vi.fn() }]

test.each([
  { triggers: [`k`], key_to_press: `k` },
  { triggers: [`o`], key_to_press: `o` },
  { triggers: [`k`, `o`], key_to_press: `k` },
  { triggers: [`k`, `o`], key_to_press: `o` },
])(
  `opens the dialog on cmd + $key_to_press (triggers: $triggers)`,
  async ({ triggers, key_to_press }) => {
    const props = $state({ open: false, triggers, actions, fade_duration: 0 })
    mount(CmdPalette, { target: document.body, props })

    expect(document.querySelector(`dialog`)).toBe(null)
    expect(props.open).toBe(false)

    // Press cmd + trigger to open the palette
    window.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: key_to_press, metaKey: true }),
    )
    await tick()

    expect(doc_query(`dialog`)).toBeTruthy()
    expect(props.open).toBe(true)

    // Test that pressing trigger key without metaKey does not open if already open then closed
    props.open = false
    await tick()
    expect(document.querySelector(`dialog`)).toBe(null)

    window.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: key_to_press, metaKey: false }),
    )
    await tick()
    expect(document.querySelector(`dialog`)).toBe(null)
    expect(props.open).toBe(false)
  },
)

test(`does not open dialog on trigger key press without metaKey`, async () => {
  const props = $state({ open: false, triggers: [`k`], actions })
  mount(CmdPalette, { target: document.body, props })

  expect(document.querySelector(`dialog`)).toBe(null)
  expect(props.open).toBe(false)

  window.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `k`, metaKey: false }),
  )

  expect(document.querySelector(`dialog`)).toBe(null)
  expect(props.open).toBe(false)
})

test(`calls the action and closes dialog when an option is selected`, async () => {
  const spy = vi.fn()
  const test_actions = [{ label: `action 1`, action: spy }]
  const props = $state({ open: true, actions: test_actions, fade_duration: 0 })

  mount(CmdPalette, { target: document.body, props })

  const input_el = doc_query(`dialog div.multiselect input[autocomplete]`)
  // Press down arrow, then enter to select the first action
  input_el.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
  )
  await tick()
  input_el.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
  )
  await tick()

  expect(spy).toHaveBeenCalledOnce()
  expect(spy).toHaveBeenCalledWith(test_actions[0].label)
  expect(props.open).toBe(false)
  expect(document.querySelector(`dialog`)).toBe(null)
})

test.each([
  { close_keys: [`Escape`], key_to_press: `Escape` },
  { close_keys: [`x`], key_to_press: `x` },
  { close_keys: [`Escape`, `x`], key_to_press: `Escape` },
  { close_keys: [`Escape`, `x`], key_to_press: `x` },
])(
  `closes the dialog on $key_to_press (close_keys: $close_keys)`,
  async ({ close_keys, key_to_press }) => {
    const props = $state({ open: true, close_keys, actions, fade_duration: 0 })
    mount(CmdPalette, { target: document.body, props })

    const init_dialog_el = doc_query(`dialog`)
    expect(init_dialog_el).toBeTruthy()
    expect(props.open).toBe(true)

    window.dispatchEvent(new KeyboardEvent(`keydown`, { key: key_to_press }))
    await tick() // Wait for props.open to update and event to be handled

    expect(props.open).toBe(false)

    const final_dialog_el = document.querySelector(`dialog`)
    expect(final_dialog_el).toBe(null)
  },
)

test(`closes the dialog on click outside and removes dialog from DOM`, async () => {
  const props = $state({ open: true, actions, fade_duration: 0 })

  mount(CmdPalette, { target: document.body, props })

  const dialog = doc_query(`dialog`)
  expect(dialog).toBeTruthy()
  expect(props.open).toBe(true)

  // Create a click event outside the dialog
  const click = new MouseEvent(`click`, { bubbles: true })
  document.body.dispatchEvent(click)
  await tick() // Allow props.open to update

  expect(props.open).toBe(false)
  expect(document.querySelector(`dialog`)).toBe(null)
})

test(`displays the correct placeholder text in the input`, () => {
  const placeholder_text = `Test placeholder`
  mount(CmdPalette, {
    target: document.body,
    props: {
      open: true,
      actions,
      placeholder: placeholder_text,
    },
  })

  const input = doc_query(`dialog input[autocomplete]`) as HTMLInputElement
  expect(input.placeholder).toBe(placeholder_text)
})

test.each([
  {
    opens_how: `keypress`,
    description: `focuses input when dialog opens via keypress`,
  },
  {
    opens_how: `programmatic`,
    description: `focuses input when dialog opens programmatically`,
  },
])(`$description`, async ({ opens_how }) => {
  const props = $state({ actions, open: false, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  if (opens_how === `keypress`) {
    // Open the dialog by simulating the trigger key press
    window.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }),
    )
  } else props.open = true // Open programmatically

  await tick()

  const input = document.querySelector(
    `dialog input[autocomplete]`,
  ) as HTMLInputElement | null
  expect(input).not.toBeNull()
  expect(document.activeElement).toBe(input)
})

test(`handles empty actions array gracefully`, () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: [] },
  })

  const dialog = doc_query(`dialog`)
  expect(dialog).toBeTruthy()
  const options_list = document.querySelector(`dialog ul.options`)
  if (options_list) {
    expect(options_list.children.length).toBe(0)
  }
})

test(`applies custom style to the dialog element`, () => {
  const custom_style = `border: 2px solid red; padding: 20px;`
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, dialog_style: custom_style },
  })

  const dialog = doc_query(`dialog`) as HTMLDialogElement
  expect(dialog.style.border).toBe(`2px solid red`)
  expect(dialog.style.padding).toBe(`20px`)
})

test(`applies custom span_style to default option rendering`, () => {
  const custom_li_style = `color: blue; font-weight: bold;`
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, liOptionStyle: custom_li_style },
  })

  const li_el = doc_query(`dialog ul.options li`)
  expect(li_el).toBeTruthy()
  // Note: direct style checking can be brittle if Svelte optimizes or changes how styles are applied.
  // It's often better to check computed style, but for direct inline styles this can be okay.
  expect(li_el.style.color).toBe(`blue`)
  expect(li_el.style.fontWeight).toBe(`bold`)
})

test(`programmatic control via bind:open`, async () => {
  const props = $state({ open: false, actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  expect(document.querySelector(`dialog`)).toBe(null)

  // Programmatically open
  props.open = true
  await tick()
  expect(doc_query(`dialog`)).toBeTruthy()
  expect(props.open).toBe(true)

  const input_el = doc_query(
    `dialog input[autocomplete]`,
  ) as HTMLInputElement | null
  expect(input_el).not.toBeNull()
  expect(document.activeElement).toBe(input_el)

  // Programmatically close
  props.open = false
  await tick()
  expect(document.querySelector(`dialog`)).toBe(null)
  expect(props.open).toBe(false)
})

test(`passes through ...rest props like class to Select component`, () => {
  const custom_class = `my-custom-palette-class`
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, class: custom_class },
  })

  const select_wrapper = doc_query(`dialog div.multiselect`)
  expect(select_wrapper).toBeTruthy()
  expect(select_wrapper.classList.contains(custom_class)).toBe(true)
})
