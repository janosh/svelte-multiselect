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
  {
    triggers: [`k`],
    key_to_press: `k`,
    with_meta: true,
    with_ctrl: false,
    should_open: true,
  },
  {
    triggers: [`o`],
    key_to_press: `o`,
    with_meta: true,
    with_ctrl: false,
    should_open: true,
  },
  {
    triggers: [`k`, `o`],
    key_to_press: `k`,
    with_meta: true,
    with_ctrl: false,
    should_open: true,
  },
  {
    triggers: [`k`, `o`],
    key_to_press: `o`,
    with_meta: true,
    with_ctrl: false,
    should_open: true,
  },
  {
    triggers: [`k`],
    key_to_press: `k`,
    with_meta: false,
    with_ctrl: false,
    should_open: false,
  },
  {
    triggers: [`j`, `l`],
    key_to_press: `k`,
    with_meta: true,
    with_ctrl: false,
    should_open: false,
  },
  // Test Ctrl key support
  {
    triggers: [`k`],
    key_to_press: `k`,
    with_meta: false,
    with_ctrl: true,
    should_open: true,
  },
  {
    triggers: [`o`],
    key_to_press: `o`,
    with_meta: false,
    with_ctrl: true,
    should_open: true,
  },
  {
    triggers: [`k`, `o`],
    key_to_press: `k`,
    with_meta: false,
    with_ctrl: true,
    should_open: true,
  },
  {
    triggers: [`k`, `o`],
    key_to_press: `o`,
    with_meta: false,
    with_ctrl: true,
    should_open: true,
  },
  {
    triggers: [`j`, `l`],
    key_to_press: `k`,
    with_meta: false,
    with_ctrl: true,
    should_open: false,
  },
  // Test that both Meta and Ctrl work together
  {
    triggers: [`k`],
    key_to_press: `k`,
    with_meta: true,
    with_ctrl: true,
    should_open: true,
  },
])(
  `handles trigger keys: $triggers with key $key_to_press (meta: $with_meta, ctrl: $with_ctrl) -> $should_open`,
  async ({ triggers, key_to_press, with_meta, with_ctrl, should_open }) => {
    const props = $state({
      open: false,
      triggers,
      actions: mock_actions,
      fade_duration: 0,
    })
    mount(CmdPalette, { target: document.body, props })

    globalThis.dispatchEvent(
      new KeyboardEvent(`keydown`, {
        key: key_to_press,
        metaKey: with_meta,
        ctrlKey: with_ctrl,
      }),
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
    } else props.open = true
    await tick()

    expect(props.open).toBe(true)
    expect(document.activeElement).toBe(doc_query(`dialog input[autocomplete]`))
  },
)

test(`handles action selection and execution`, () => {
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
  input_el.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
  )
  input_el.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))

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

test(`does not close dialog when clicking on portalled options`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  // Create a mock portalled options element
  const portalled_options = document.createElement(`ul`)
  portalled_options.className = `options`
  portalled_options.innerHTML = `<li>Option 1</li><li>Option 2</li>`
  document.body.appendChild(portalled_options)

  // Click on the portalled options
  const option_li = portalled_options.querySelector(`li`)
  option_li?.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
  await tick()

  // Dialog should still be open
  expect(props.open).toBe(true)
  expect(document.querySelector(`dialog`)).not.toBe(null)

  // Clean up
  document.body.removeChild(portalled_options)
})

test(`!target.closest('ul.options') prevents premature closure`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  // Create nested ul.options structure to test closest() logic
  const container = document.createElement(`div`)
  container.innerHTML = `
    <ul class="options">
      <li><span>Nested option</span></li>
    </ul>
  `
  document.body.appendChild(container)

  // Click on nested span inside ul.options
  const span = container.querySelector(`span`)
  span?.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
  await tick()

  // Dialog should remain open due to !target.closest('ul.options') check
  expect(props.open).toBe(true)
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

test.each([
  {
    fuzzy: true,
    search: `cu`,
    expected: [`create user`],
    description: `fuzzy match 'cu' -> 'create user'`,
  },
  {
    fuzzy: true,
    search: `del`,
    expected: [`delete file`],
    description: `fuzzy match 'del' -> 'delete file'`,
  },
  {
    fuzzy: true,
    search: `up`,
    expected: [`update config`],
    description: `fuzzy match 'up' -> 'update config'`,
  },
  {
    fuzzy: true,
    search: `user`,
    expected: [`create user`],
    description: `fuzzy match 'user' -> 'create user'`,
  },
  {
    fuzzy: true,
    search: `qwerty`,
    expected: [`No matching options`],
    description: `fuzzy match 'qwerty' -> no matches message`,
  },
  {
    fuzzy: false,
    search: `cr`,
    expected: [`create user`],
    description: `exact match 'cr' -> 'create user'`,
  },
  {
    fuzzy: false,
    search: `delete`,
    expected: [`delete file`],
    description: `exact match 'delete' -> 'delete file'`,
  },
  {
    fuzzy: false,
    search: `config`,
    expected: [`update config`],
    description: `exact match 'config' -> 'update config'`,
  },
  {
    fuzzy: false,
    search: `cu`,
    expected: [`No matching options`],
    description: `exact match 'cu' -> no matches (not a substring)`,
  },
  {
    fuzzy: false,
    search: `xyz`,
    expected: [`No matching options`],
    description: `exact match 'xyz' -> no matches message`,
  },
])(
  `filtering with fuzzy=$fuzzy: $description`,
  async ({ fuzzy, search, expected }) => {
    const actions = [
      { label: `create user`, action: vi.fn() },
      { label: `delete file`, action: vi.fn() },
      { label: `update config`, action: vi.fn() },
    ]
    mount(CmdPalette, {
      target: document.body,
      props: { open: true, actions, fuzzy, fade_duration: 0 },
    })

    const input = doc_query(`dialog input[autocomplete]`) as HTMLInputElement
    input.value = search
    input.dispatchEvent(new Event(`input`, { bubbles: true }))
    await tick()

    const visible_options = document.querySelectorAll(`dialog ul.options li:not(.hidden)`)
    expect(visible_options).toHaveLength(expected.length)

    expected.forEach((expected_label, idx) => {
      expect(visible_options[idx].textContent).toContain(expected_label)
    })
  },
)

test(`handles multiple trigger keys simultaneously`, async () => {
  const props = $state({
    open: false,
    triggers: [`k`, `j`, `l`],
    actions: mock_actions,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })

  // Test each trigger key
  props.open = false
  globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }))
  await tick()
  expect(props.open).toBe(true)

  props.open = false
  globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `j`, metaKey: true }))
  await tick()
  expect(props.open).toBe(true)

  props.open = false
  globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `l`, metaKey: true }))
  await tick()
  expect(props.open).toBe(true)
})

test(`handles custom fade duration`, () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 500 })
  mount(CmdPalette, { target: document.body, props })
  expect(doc_query(`dialog`)).toBeTruthy()
  expect(props.fade_duration).toBe(500)
})

test(`handles empty search text`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions, fade_duration: 0 },
  })

  const input = doc_query(`dialog input[autocomplete]`) as HTMLInputElement
  input.value = ``
  input.dispatchEvent(new Event(`input`, { bubbles: true }))
  await tick()

  const visible_options = document.querySelectorAll(`dialog ul.options li:not(.hidden)`)
  expect(visible_options).toHaveLength(mock_actions.length)
})

test(`handles bindable props correctly`, async () => {
  const props = $state({
    open: false,
    actions: mock_actions,
    dialog: null,
    input: null,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })

  expect(props.dialog).toBe(null)
  expect(props.input).toBe(null)

  props.open = true
  await tick()

  expect(props.dialog).toBeInstanceOf(HTMLDialogElement)
  expect(props.input).toBeInstanceOf(HTMLInputElement)
})

test(`handles action execution with different label types`, () => {
  const actions = [
    { label: `simple action`, action: vi.fn() },
    { label: `action with spaces`, action: vi.fn() },
    { label: `action-with-dashes`, action: vi.fn() },
  ]
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, fade_duration: 0 },
  })

  expect(doc_query(`dialog div.multiselect`)).toBeTruthy()
  expect(doc_query(`dialog ul.options li`)?.textContent).toContain(`simple action`)
})

test(`handles custom dialog styles`, () => {
  const custom_style = `border: 2px solid red; padding: 10px;`
  mount(CmdPalette, {
    target: document.body,
    props: {
      open: true,
      actions: mock_actions,
      dialog_style: custom_style,
      fade_duration: 0,
    },
  })

  const dialog = doc_query(`dialog`) as HTMLDialogElement
  expect(dialog.style.border).toBe(`2px solid red`)
  expect(dialog.style.padding).toBe(`10px`)
})

test(`handles custom placeholder text`, () => {
  const custom_placeholder = `Search for actions...`
  mount(CmdPalette, {
    target: document.body,
    props: {
      open: true,
      actions: mock_actions,
      placeholder: custom_placeholder,
      fade_duration: 0,
    },
  })

  const input = doc_query(`dialog input[autocomplete]`) as HTMLInputElement
  expect(input.placeholder).toBe(custom_placeholder)
})
