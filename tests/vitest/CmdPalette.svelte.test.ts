import { CmdPalette } from '$lib'
import { mount, tick } from 'svelte'
import { expect, test, vi } from 'vitest'
import { doc_query } from './index'

const mock_actions = [
  { label: `action 1`, action: vi.fn() },
  { label: `action 2`, action: vi.fn() },
  { label: `action 3`, action: vi.fn() },
]

test.each([
  { triggers: [`k`], key_to_press: `k`, with_meta: true, should_open: true },
  { triggers: [`o`], key_to_press: `o`, with_meta: true, should_open: true },
  { triggers: [`k`, `o`], key_to_press: `k`, with_meta: true, should_open: true },
  { triggers: [`k`, `o`], key_to_press: `o`, with_meta: true, should_open: true },
  { triggers: [`k`], key_to_press: `k`, with_meta: false, should_open: false },
  { triggers: [`j`, `l`], key_to_press: `k`, with_meta: true, should_open: false },
])(
  `handles trigger keys: $triggers with key $key_to_press (meta: $with_meta) -> $should_open`,
  async ({ triggers, key_to_press, with_meta, should_open }) => {
    const props = $state({
      open: false,
      triggers,
      actions: mock_actions,
      fade_duration: 0,
    })
    mount(CmdPalette, { target: document.body, props })

    globalThis.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: key_to_press, metaKey: with_meta }),
    )
    await tick()

    expect(props.open).toBe(should_open)
    expect(!!document.querySelector(`dialog`)).toBe(should_open)

    if (should_open) {
      expect(document.activeElement).toBe(doc_query(`dialog input[autocomplete]`))
    }
  },
)

test.each([
  { close_keys: [`Escape`], key_to_press: `Escape`, should_close: true },
  { close_keys: [`x`], key_to_press: `x`, should_close: true },
  { close_keys: [`Escape`, `x`], key_to_press: `Escape`, should_close: true },
  { close_keys: [`Escape`, `x`], key_to_press: `x`, should_close: true },
  { close_keys: [`q`], key_to_press: `Escape`, should_close: false },
])(
  `handles close keys: $close_keys with key $key_to_press -> $should_close`,
  async ({ close_keys, key_to_press, should_close }) => {
    const props = $state({
      open: true,
      close_keys,
      actions: mock_actions,
      fade_duration: 0,
    })
    mount(CmdPalette, { target: document.body, props })

    globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: key_to_press }))
    await tick()

    expect(props.open).toBe(!should_close)
    expect(!!document.querySelector(`dialog`)).toBe(!should_close)
  },
)

test.each([
  { opens_via: `keypress`, description: `via keypress` },
  { opens_via: `programmatic`, description: `programmatically` },
])(
  `opens dialog and manages focus correctly $description`,
  async ({ opens_via }) => {
    const props = $state({ actions: mock_actions, open: false, fade_duration: 0 })
    mount(CmdPalette, { target: document.body, props })

    if (opens_via === `keypress`) {
      globalThis.dispatchEvent(
        new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }),
      )
    } else {
      props.open = true
    }
    await tick()

    expect(props.open).toBe(true)
    expect(document.activeElement).toBe(doc_query(`dialog input[autocomplete]`))
  },
)

test(`handles action selection and execution`, async () => {
  const actions_with_spies = mock_actions.map(({ label }) => ({
    label,
    action: vi.fn(),
  }))
  const props = $state({ open: true, actions: actions_with_spies, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  const input_el = doc_query(`dialog div.multiselect input[autocomplete]`)

  // Navigate to second action and select it
  input_el.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
  )
  await tick()
  input_el.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
  )
  await tick()
  input_el.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
  await tick()

  expect(actions_with_spies[1].action).toHaveBeenCalledOnce()
  expect(actions_with_spies[1].action).toHaveBeenCalledWith(`action 2`)
  expect(actions_with_spies[0].action).not.toHaveBeenCalled()
  expect(actions_with_spies[2].action).not.toHaveBeenCalled()
  expect(props.open).toBe(false)
})

test(`handles click outside to close dialog`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  document.body.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
  await tick()

  expect(props.open).toBe(false)
  expect(document.querySelector(`dialog`)).toBe(null)
})

test(`applies custom styles and props correctly`, async () => {
  const custom_class = `my-custom-class`
  const custom_placeholder = `Custom placeholder`
  const custom_dialog_style = `border: 2px solid red; padding: 20px;`
  const custom_li_style = `color: blue; font-weight: bold;`

  const props = $state({
    open: true,
    actions: mock_actions,
    class: custom_class,
    placeholder: custom_placeholder,
    dialog_style: custom_dialog_style,
    liOptionStyle: custom_li_style,
    dialog: null as HTMLDialogElement | null,
    input: null as HTMLInputElement | null,
  })

  mount(CmdPalette, { target: document.body, props })
  await tick()

  // Check element bindings
  expect(props.dialog).toBeInstanceOf(HTMLDialogElement)
  expect(props.input).toBeInstanceOf(HTMLInputElement)

  // Check applied styles and props
  const select_wrapper = doc_query(`dialog div.multiselect`)
  expect(select_wrapper.classList.contains(custom_class)).toBe(true)

  const input = doc_query(`dialog input[autocomplete]`) as HTMLInputElement
  expect(input.placeholder).toBe(custom_placeholder)

  const dialog = doc_query(`dialog`) as HTMLDialogElement
  expect(dialog.style.border).toBe(`2px solid red`)
  expect(dialog.style.padding).toBe(`20px`)

  const li_el = doc_query(`dialog ul.options li`)
  expect(li_el.style.color).toBe(`blue`)
  expect(li_el.style.fontWeight).toBe(`bold`)
})

test.each([
  { scenario: `empty actions array`, actions: [], should_have_options: false },
])(
  `handles edge cases: $scenario`,
  ({ actions, should_have_options }) => {
    const props = $state({ open: true, actions, fade_duration: 0 })
    mount(CmdPalette, { target: document.body, props })

    const dialog = doc_query(`dialog`)
    expect(dialog).toBeTruthy()

    if (!should_have_options) {
      // Empty actions should render empty options list
      const options_list = document.querySelector(`dialog ul.options`)
      expect(options_list?.children.length ?? 0).toBe(0)
    }
  },
)

test(`opens dialog with trigger key when closed`, async () => {
  const props = $state({ open: false, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  expect(props.open).toBe(false)

  // Trigger key should open dialog when closed
  globalThis.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }),
  )
  await tick()

  expect(props.open).toBe(true)
  expect(document.querySelector(`dialog`)).toBeTruthy()
})

test(`ignores non-trigger events when dialog is closed`, async () => {
  const props = $state({ open: false, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  expect(props.open).toBe(false)

  // Non-trigger events should not open dialog
  globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape` }))
  await tick()

  expect(props.open).toBe(false)
})

test(`remains open when trigger keys are pressed while already open`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  expect(props.open).toBe(true)

  // Trigger key should not change state when already open
  globalThis.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }),
  )
  await tick()

  expect(props.open).toBe(true)
  expect(document.querySelector(`dialog`)).toBeTruthy()
})

test(`uses default values when props not provided`, () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions },
  })

  const input = doc_query(`dialog input[autocomplete]`) as HTMLInputElement
  expect(input.placeholder).toBe(`Filter actions...`)
  expect(doc_query(`dialog`)).toBeTruthy()
})

test(`dialog remains functional when open`, () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  const dialog = doc_query(`dialog`)
  expect(dialog).toBeTruthy()
  expect(props.open).toBe(true)

  // Verify dialog has the expected content
  const input = doc_query(`dialog input[autocomplete]`)
  expect(input).toBeTruthy()

  // Verify actions are present
  const multiselect = doc_query(`dialog div.multiselect`)
  expect(multiselect).toBeTruthy()
})
