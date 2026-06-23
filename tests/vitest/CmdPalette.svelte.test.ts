import { CmdPalette } from '$lib'
import { flushSync, mount, tick } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
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
    expect(document.querySelector(`dialog`)).toEqual(
      should_open ? expect.any(HTMLDialogElement) : null,
    )

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
    expect(document.querySelector(`dialog`)).toEqual(
      should_close ? null : expect.any(HTMLDialogElement),
    )
  },
)

test.each([
  { opens_via: `keypress`, description: `via keypress` },
  { opens_via: `programmatic`, description: `programmatically` },
])(`opens dialog and manages focus correctly $description`, async ({ opens_via }) => {
  const props = $state({ actions: mock_actions, open: false, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  if (opens_via === `keypress`) {
    globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }))
  } else props.open = true
  await tick()

  expect(props.open).toBe(true)
  expect(document.activeElement).toBe(doc_query(`dialog input[autocomplete]`))
})

function restore_show_modal(original_show_modal: PropertyDescriptor | undefined): void {
  if (original_show_modal) {
    Object.defineProperty(HTMLDialogElement.prototype, `showModal`, original_show_modal)
  } else Reflect.deleteProperty(HTMLDialogElement.prototype, `showModal`)
}

test(`opens a labelled modal dialog`, async () => {
  const original_show_modal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    `showModal`,
  )
  const show_modal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute(`open`, ``)
  })
  HTMLDialogElement.prototype.showModal = show_modal
  const props = $state({
    actions: mock_actions,
    aria_label: `Run command`,
    open: true,
    fade_duration: 0,
  })

  try {
    mount(CmdPalette, { target: document.body, props })
    await tick()

    const dialog = doc_query<HTMLDialogElement>(`dialog`)
    expect(dialog.getAttribute(`aria-label`)).toBe(`Run command`)
    expect(show_modal).toHaveBeenCalledTimes(1)
  } finally {
    restore_show_modal(original_show_modal)
  }
})

test.each([`throws`, `unavailable`] as const)(
  `falls back to open attribute when showModal is %s`,
  async (show_modal_state) => {
    const original_show_modal = Object.getOwnPropertyDescriptor(
      HTMLDialogElement.prototype,
      `showModal`,
    )
    if (show_modal_state === `throws`) {
      HTMLDialogElement.prototype.showModal = vi.fn(() => {
        throw new Error(`showModal failed`)
      })
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, `showModal`)
    }
    const props = $state({ actions: mock_actions, open: true, fade_duration: 0 })

    try {
      mount(CmdPalette, { target: document.body, props })
      await tick()

      const dialog = doc_query<HTMLDialogElement>(`dialog`)
      expect(dialog.hasAttribute(`open`)).toBe(true)
    } finally {
      restore_show_modal(original_show_modal)
    }
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

  expect(actions_with_spies[1].action).toHaveBeenCalledExactlyOnceWith(`action 2`)
  expect(actions_with_spies[0].action).not.toHaveBeenCalled()
  expect(actions_with_spies[2].action).not.toHaveBeenCalled()
  expect(props.open).toBe(false)
})

test.each([
  [`page body`, () => document.body],
  // showModal() backdrop clicks dispatch with the dialog element itself as the target,
  // so a naive dialog.contains(target) check would wrongly keep the palette open
  [`modal backdrop (target === dialog)`, () => doc_query<HTMLDialogElement>(`dialog`)],
])(`closes dialog on outside click: %s`, async (_label, get_target) => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  get_target().dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
  await tick()

  expect(props.open).toBe(false)
  expect(document.querySelector(`dialog`)).toBeNull()
})

test.each([
  [`input wrapper`, `dialog div.multiselect`],
  [`search input`, `dialog div.multiselect input[autocomplete]`],
  [`options list`, `dialog ul.options`],
])(`keeps dialog open when clicking palette %s`, async (_label, selector) => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  doc_query(selector).dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
  await tick()

  expect(props.open).toBe(true)
  expect(document.querySelector(`dialog`)).toBeInstanceOf(HTMLDialogElement)
})

test(`non-modal fallback closes on click of an unrelated page multiselect`, async () => {
  const original_show_modal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    `showModal`,
  )
  // force the non-modal fallback so outside clicks land on real page elements (with a
  // modal dialog they'd hit the backdrop instead, which is covered above)
  HTMLDialogElement.prototype.showModal = vi.fn(() => {
    throw new Error(`showModal unavailable`)
  })
  const other_multiselect = document.createElement(`div`)
  other_multiselect.className = `multiselect`
  document.body.append(other_multiselect)
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })

  try {
    mount(CmdPalette, { target: document.body, props })
    await tick()

    other_multiselect.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    await tick()

    expect(props.open).toBe(false)
  } finally {
    other_multiselect.remove()
    restore_show_modal(original_show_modal)
  }
})

// clicks on this palette's portalled ul.options (rendered outside the dialog)
// must keep the palette open, both on a direct <li> and a nested descendant
test.each([
  [`direct li child`, `<li>Option 1</li><li>Option 2</li>`, `li`],
  [`nested element inside li`, `<li><span>Nested option</span></li>`, `span`],
])(
  `keeps dialog open when clicking portalled options: %s`,
  async (_label, html, click_selector) => {
    const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
    mount(CmdPalette, { target: document.body, props })
    await tick()

    const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
    const real_listbox_id = input.getAttribute(`aria-controls`)
    if (!real_listbox_id) throw new Error(`Palette input has no aria-controls listbox id`)
    const listbox_id = `${real_listbox_id}-portalled`
    input.setAttribute(`aria-controls`, listbox_id)

    const container = document.createElement(`div`)
    container.innerHTML = `<ul class="options" id="${listbox_id}">${html}</ul>`
    document.body.append(container)

    doc_query(`#${listbox_id} ${click_selector}`).dispatchEvent(
      new MouseEvent(`click`, { bubbles: true }),
    )
    await tick()

    expect(props.open).toBe(true)
    expect(document.querySelector(`dialog`)).not.toBeNull()

    container.remove()
  },
)

test(`closes dialog when clicking an unrelated portalled options list`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  const other_options = document.createElement(`ul`)
  other_options.id = `unrelated-options`
  other_options.className = `options`
  other_options.innerHTML = `<li>Other option</li>`
  document.body.append(other_options)

  try {
    doc_query(`#unrelated-options li`).dispatchEvent(
      new MouseEvent(`click`, { bubbles: true }),
    )
    await tick()

    expect(props.open).toBe(false)
    expect(document.querySelector(`dialog`)).toBeNull()
  } finally {
    other_options.remove()
  }
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

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  expect(input.placeholder).toBe(custom_placeholder)

  const dialog = doc_query<HTMLDialogElement>(`dialog`)
  expect(dialog.style.border).toBe(`2px solid red`)
  expect(dialog.style.padding).toBe(`20px`)

  const li_el = doc_query<HTMLLIElement>(`dialog ul.options li`)
  expect(li_el.style.color).toBe(`blue`)
  expect(li_el.style.fontWeight).toBe(`bold`)
})

test.each([{ scenario: `empty actions array`, actions: [], should_have_options: false }])(
  `handles edge cases: $scenario`,
  ({ actions, should_have_options }) => {
    const props = $state({ open: true, actions, fade_duration: 0 })
    mount(CmdPalette, { target: document.body, props })

    const dialog = doc_query(`dialog`)
    expect(dialog).toBeInstanceOf(HTMLDialogElement)

    if (!should_have_options) {
      // Empty actions should render empty options list
      const options_list = document.querySelector(`dialog ul.options`)
      expect(options_list?.children.length ?? 0).toBe(0)
    }
  },
)

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
  globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `k`, metaKey: true }))
  await tick()

  expect(props.open).toBe(true)
  expect(document.querySelector(`dialog`)).toBeInstanceOf(HTMLDialogElement)
})

test(`uses default values when props not provided`, () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions },
  })

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  expect(input.placeholder).toBe(`Filter actions...`)
  expect(doc_query(`dialog`)).toBeInstanceOf(HTMLDialogElement)
})

test(`dialog remains functional when open`, () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  const dialog = doc_query(`dialog`)
  expect(dialog).toBeInstanceOf(HTMLDialogElement)
  expect(props.open).toBe(true)

  expect(doc_query(`dialog input[autocomplete]`)).toBeInstanceOf(HTMLInputElement)
  expect(doc_query(`dialog div.multiselect`)).toBeInstanceOf(HTMLDivElement)
})

test(`lets command palette dropdown overflow dialog box`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions, fade_duration: 0 },
  })
  await tick()

  const dialog = doc_query<HTMLDialogElement>(`dialog`)
  const dialog_style = getComputedStyle(dialog)
  expect(dialog_style.position).toBe(`fixed`)
  expect(dialog_style.left).toBe(`0px`)
  expect(dialog_style.right).toBe(`0px`)
  expect(dialog_style.overflow).toBe(`visible`)

  const options_list = doc_query<HTMLUListElement>(`dialog ul.options`)
  expect(dialog.contains(options_list)).toBe(true)
  expect(options_list.classList.contains(`hidden`)).toBe(false)
  expect(options_list.getAttribute(`role`)).toBe(`listbox`)
  // aria-expanded belongs on the combobox input, not the listbox (invalid ARIA there)
  expect(options_list.hasAttribute(`aria-expanded`)).toBe(false)
  expect(options_list.querySelectorAll(`li[role="option"]`)).toHaveLength(
    mock_actions.length,
  )
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
])(`filtering with fuzzy=$fuzzy: $description`, async ({ fuzzy, search, expected }) => {
  const actions = [
    { label: `create user`, action: vi.fn() },
    { label: `delete file`, action: vi.fn() },
    { label: `update config`, action: vi.fn() },
  ]
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, fuzzy, fade_duration: 0 },
  })

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  input.value = search
  input.dispatchEvent(new Event(`input`, { bubbles: true }))
  await tick()

  const visible_options = document.querySelectorAll(`dialog ul.options li:not(.hidden)`)
  expect(visible_options).toHaveLength(expected.length)

  expected.forEach((expected_label, idx) => {
    expect(visible_options[idx].textContent).toContain(expected_label)
  })
})

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
  expect(doc_query(`dialog`)).toBeInstanceOf(HTMLDialogElement)
  expect(props.fade_duration).toBe(500)
})

test(`handles empty search text`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions, fade_duration: 0 },
  })

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
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

  expect(props.dialog).toBeNull()
  expect(props.input).toBeNull()

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

  expect(doc_query(`dialog div.multiselect`)).toBeInstanceOf(HTMLDivElement)
  expect(doc_query(`dialog ul.options li`)?.textContent).toContain(`simple action`)
})

// Grouping tests
const grouped_actions = [
  { label: `New File`, action: vi.fn(), group: `File` },
  { label: `Save`, action: vi.fn(), group: `File` },
  { label: `Copy`, action: vi.fn(), group: `Edit` },
  { label: `Paste`, action: vi.fn(), group: `Edit` },
]

test(`renders grouped actions with group headers`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: grouped_actions, fade_duration: 0 },
  })
  await tick()

  // Check that group headers are rendered
  const group_headers = document.querySelectorAll(`dialog ul.options li.group-header`)
  expect(group_headers).toHaveLength(2)

  // Check group header text contains group names (headers include count like "File (2)")
  const header_texts = [...group_headers].map((header) => header.textContent?.trim())
  expect(header_texts.some((text) => text?.startsWith(`File`))).toBe(true)
  expect(header_texts.some((text) => text?.startsWith(`Edit`))).toBe(true)

  // Check all actions are rendered
  const action_items = document.querySelectorAll(
    `dialog ul.options li:not(.group-header)`,
  )
  expect(action_items).toHaveLength(4)
})

test(`ungrouped actions continue to work without group headers`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions, fade_duration: 0 },
  })
  await tick()

  // No group headers should be rendered for ungrouped actions
  const group_headers = document.querySelectorAll(`dialog ul.options li.group-header`)
  expect(group_headers).toHaveLength(0)

  // All actions should still be rendered
  const action_items = document.querySelectorAll(`dialog ul.options li`)
  expect(action_items).toHaveLength(mock_actions.length)
})

test.each([
  [`File`, `New File`],
  [`Edit`, `Copy`],
])(
  `collapsedGroups collapses the %s group, hiding its options`,
  async (collapsed_group, hidden_label) => {
    mount(CmdPalette, {
      target: document.body,
      props: {
        open: true,
        actions: grouped_actions,
        collapsibleGroups: true,
        collapsedGroups: new Set([collapsed_group]),
        fade_duration: 0,
      },
    })
    await tick()

    // collapsed group's header reports aria-expanded=false
    const header = [
      ...document.querySelectorAll(`dialog ul.options li.group-header`),
    ].find((el) => el.textContent?.includes(collapsed_group))
    expect(header?.getAttribute(`aria-expanded`)).toBe(`false`)

    // its options are not rendered; only the other group's 2 options remain
    const hidden_option = [...document.querySelectorAll(`dialog ul.options li`)].find(
      (li) => li.textContent?.includes(hidden_label),
    )
    expect(hidden_option).toBeUndefined()
    expect(
      document.querySelectorAll(`dialog ul.options li:not(.group-header)`),
    ).toHaveLength(2)
  },
)

test(`groupSelectAll prop enables group selection in command palette`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: {
      open: true,
      actions: grouped_actions,
      groupSelectAll: true,
      fade_duration: 0,
    },
  })
  await tick()

  // Group headers should have select-all functionality when enabled
  const group_headers = document.querySelectorAll(`dialog ul.options li.group-header`)
  expect(group_headers).toHaveLength(2)
})

test(`mixed grouped and ungrouped actions render correctly`, async () => {
  const mixed_actions = [
    { label: `Global Action`, action: vi.fn() },
    { label: `New File`, action: vi.fn(), group: `File` },
    { label: `Save`, action: vi.fn(), group: `File` },
    { label: `Another Global`, action: vi.fn() },
  ]
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mixed_actions, fade_duration: 0 },
  })
  await tick()

  // Should have one group header for File group (header includes count like "File (2)")
  const group_headers = document.querySelectorAll(`dialog ul.options li.group-header`)
  expect(group_headers).toHaveLength(1)
  expect(group_headers[0].textContent?.trim()).toMatch(/^File/u)

  // All 4 actions should be rendered
  const action_items = document.querySelectorAll(
    `dialog ul.options li:not(.group-header)`,
  )
  expect(action_items).toHaveLength(4)
})

// dropdown option labels in display order (used by shortcut/recents tests below)
const option_labels = () =>
  Array.from(document.querySelectorAll(`li[role='option']`), (li) =>
    li.textContent?.trim(),
  )

const press_ctrl_shift = (key: string) =>
  globalThis.dispatchEvent(
    new KeyboardEvent(`keydown`, { key, ctrlKey: true, shiftKey: true }),
  )

test(`renders shortcut kbd hints and descriptions in options`, async () => {
  const actions = [
    {
      label: `save file`,
      action: vi.fn(),
      shortcut: `ctrl+shift+s`,
      description: `Write buffer to disk`,
    },
    { label: `quit`, action: vi.fn() },
  ]
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, fade_duration: 0 },
  })
  await tick()

  const kbd_parts = Array.from(
    document.querySelectorAll(`li[role='option'] .cmd-shortcut kbd`),
    (kbd) => kbd.textContent,
  )
  expect(kbd_parts).toEqual([`Ctrl`, `⇧`, `S`])
  expect(doc_query(`.cmd-description`).textContent).toBe(`Write buffer to disk`)
  // action without shortcut renders no kbd
  const quit_li = Array.from(document.querySelectorAll(`li[role='option']`)).find((li) =>
    li.textContent?.includes(`quit`),
  )
  expect(quit_li?.querySelector(`kbd`)).toBeNull()
})

test(`plain actions without shortcut/description use default option rendering`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions: mock_actions, fade_duration: 0 },
  })
  await tick()
  expect(document.querySelector(`.cmd-action`)).toBeNull()
})

test.each([
  { desc: `fires when closed`, open: false, global_shortcuts: true, calls: 1 },
  { desc: `disabled via prop`, open: false, global_shortcuts: false, calls: 0 },
  { desc: `inactive while open`, open: true, global_shortcuts: true, calls: 0 },
  {
    desc: `ignores wrong modifiers`,
    open: false,
    global_shortcuts: true,
    calls: 0,
    shift: false,
  },
])(
  `global action shortcuts: $desc`,
  async ({ open, global_shortcuts, calls, shift = true }) => {
    const spy = vi.fn()
    const actions = [{ label: `save`, action: spy, shortcut: `ctrl+shift+s` }]
    mount(CmdPalette, {
      target: document.body,
      props: { actions, open, global_shortcuts, fade_duration: 0 },
    })
    await tick()

    globalThis.dispatchEvent(
      new KeyboardEvent(`keydown`, {
        key: `s`,
        ctrlKey: true,
        shiftKey: shift,
        cancelable: true,
      }),
    )
    await tick()

    expect(spy).toHaveBeenCalledTimes(calls)
    if (calls > 0) expect(spy).toHaveBeenCalledWith(`save`)
  },
)

test(`recent_actions_key ranks recently triggered actions first and persists them`, async () => {
  const storage_key = `test-cmd-recents`
  const actions = [`alpha`, `beta`, `gamma`].map((label) => ({
    label,
    action: vi.fn(),
  }))
  const props = $state({
    open: true,
    actions,
    recent_actions_key: storage_key,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  // no recents yet: original order
  expect(option_labels()).toEqual([`alpha`, `beta`, `gamma`])

  // trigger gamma via keyboard (ArrowDown x3 + Enter)
  const input_el = doc_query(`dialog div.multiselect input[autocomplete]`)
  for (let idx = 0; idx < 3; idx++) {
    input_el.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
    )
  }
  input_el.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
  await tick()

  expect(actions[2].action).toHaveBeenCalledExactlyOnceWith(`gamma`)
  expect(props.open).toBe(false) // palette closed after trigger
  expect(JSON.parse(localStorage.getItem(storage_key) ?? `[]`)).toEqual([`gamma`])

  // reopen: gamma now ranks first, rest keep original order
  props.open = true
  await tick()
  expect(option_labels()).toEqual([`gamma`, `alpha`, `beta`])
  localStorage.removeItem(storage_key)
})

// pre-existing recents-storage contents -> dropdown order on initial open
test.each([
  [
    `valid recents rank first`,
    JSON.stringify([`beta`, `gamma`]),
    [`beta`, `gamma`, `alpha`],
  ],
  [`unparsable JSON is ignored`, `not valid json{{{`, [`alpha`, `beta`, `gamma`]],
  [`non-array JSON is ignored`, `{"not":"an array"}`, [`alpha`, `beta`, `gamma`]],
  [`non-string entries are ignored`, `[1,2,3]`, [`alpha`, `beta`, `gamma`]],
])(`recents storage on initial open: %s`, async (_desc, stored, expected_order) => {
  const storage_key = `test-cmd-stored-recents`
  localStorage.setItem(storage_key, stored)
  const actions = [`alpha`, `beta`, `gamma`].map((label) => ({
    label,
    action: vi.fn(),
  }))
  // flushSync so render errors from bad storage data fail this test, not the suite
  flushSync(() => {
    mount(CmdPalette, {
      target: document.body,
      props: { open: true, actions, recent_actions_key: storage_key, fade_duration: 0 },
    })
  })
  await tick()

  expect(option_labels()).toEqual(expected_order)
  localStorage.removeItem(storage_key)
})

// global shortcut presses (while closed) persist the triggered action to recents
// (that the action also fires is covered by `global action shortcuts: fires when closed`)
test.each([
  {
    desc: `records the triggered action`,
    actions: [
      { label: `alpha`, action: vi.fn() },
      { label: `hotkeyed`, action: vi.fn(), shortcut: `ctrl+shift+h` },
    ],
    max_recent: undefined as number | undefined,
    keys: [`h`],
    expected: [`hotkeyed`],
  },
  {
    desc: `max_recent caps recents at the most-recently triggered`,
    actions: [
      { label: `first`, action: vi.fn(), shortcut: `ctrl+shift+1` },
      { label: `second`, action: vi.fn(), shortcut: `ctrl+shift+2` },
    ],
    max_recent: 1,
    keys: [`1`, `2`],
    expected: [`second`],
  },
])(
  `global shortcut recents persistence: $desc`,
  async ({ actions, max_recent, keys, expected }) => {
    const storage_key = `test-cmd-recents-${expected.join(`-`)}`
    mount(CmdPalette, {
      target: document.body,
      props: {
        actions,
        open: false,
        recent_actions_key: storage_key,
        max_recent,
        fade_duration: 0,
      },
    })
    await tick()

    for (const key of keys) press_ctrl_shift(key)
    await tick()

    expect(JSON.parse(localStorage.getItem(storage_key) ?? `[]`)).toEqual(expected)
    localStorage.removeItem(storage_key)
  },
)
