import { CmdPalette, PagefindPalette } from '$lib'
import { flushSync, mount, tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
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
  // any trigger in the list works, not just the first
  {
    triggers: [`k`, `o`],
    key_to_press: `o`,
    with_meta: true,
    with_ctrl: false,
    should_open: true,
  },
  // trigger key without modifier does nothing
  {
    triggers: [`k`],
    key_to_press: `k`,
    with_meta: false,
    with_ctrl: false,
    should_open: false,
  },
  // non-trigger key does nothing even with modifier
  {
    triggers: [`j`, `l`],
    key_to_press: `k`,
    with_meta: true,
    with_ctrl: false,
    should_open: false,
  },
  // Ctrl works as alternative to Meta
  {
    triggers: [`k`],
    key_to_press: `k`,
    with_meta: false,
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

    const event = new KeyboardEvent(`keydown`, {
      key: key_to_press,
      metaKey: with_meta,
      ctrlKey: with_ctrl,
      cancelable: true,
    })
    globalThis.dispatchEvent(event)
    await tick()

    expect(props.open).toBe(should_open)
    if (should_open) expect(event.defaultPrevented).toBe(true)
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
  // any key in the list closes, not just the first
  { close_keys: [`Escape`, `x`], key_to_press: `x`, should_close: true },
  // non-close key (even default Escape) does nothing when not configured
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

    const event = new KeyboardEvent(`keydown`, {
      key: key_to_press,
      cancelable: true,
    })
    globalThis.dispatchEvent(event)
    await tick()

    expect(props.open).toBe(!should_close)
    if (should_close) expect(event.defaultPrevented).toBe(true)
    expect(document.querySelector(`dialog`)).toEqual(
      should_close ? null : expect.any(HTMLDialogElement),
    )
  },
)

test(`a custom close key does not also trigger its global action shortcut`, async () => {
  const action = vi.fn()
  const props = $state({
    open: true,
    close_keys: [`x`],
    actions: [{ label: `Close action`, shortcut: `x`, action }],
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  doc_query<HTMLInputElement>(`dialog input[autocomplete]`).dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `x`, bubbles: true, cancelable: true }),
  )
  await tick()

  expect(props.open).toBe(false)
  expect(action).not.toHaveBeenCalled()
})

test.each([
  { close_keys: [`Escape`], default_prevented: false },
  { close_keys: [`q`], default_prevented: true },
])(
  `dialog cancel with close_keys=$close_keys prevents default: $default_prevented`,
  async ({ close_keys, default_prevented }) => {
    const oncancel = vi.fn()
    mount(CmdPalette, {
      target: document.body,
      props: {
        open: true,
        close_keys,
        actions: mock_actions,
        dialog_props: { oncancel },
        fade_duration: 0,
      },
    })
    await tick()

    const cancel_event = new Event(`cancel`, { cancelable: true })
    doc_query<HTMLDialogElement>(`dialog`).dispatchEvent(cancel_event)

    expect(cancel_event.defaultPrevented).toBe(default_prevented)
    expect(oncancel).toHaveBeenCalledOnce()
  },
)

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

test(`handles action selection and execution`, async () => {
  const actions_with_spies = mock_actions.map(({ label }) => ({
    label,
    action: vi.fn(),
  }))
  const onadd = vi.fn()
  const props = $state({
    open: true,
    actions: actions_with_spies,
    fade_duration: 0,
    onadd,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  const input_el = doc_query(`dialog div.multiselect input[autocomplete]`)

  // Navigate to second action and select it
  input_el.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
  )
  input_el.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))

  expect(actions_with_spies[1].action).toHaveBeenCalledExactlyOnceWith(`action 2`)
  expect(actions_with_spies[0].action).not.toHaveBeenCalled()
  expect(actions_with_spies[2].action).not.toHaveBeenCalled()
  expect(onadd).toHaveBeenCalledWith(
    expect.objectContaining({ option: actions_with_spies[1] }),
  )
  expect(props.open).toBe(false)
})

test(`ignores user-created options without action handlers`, async () => {
  const action = vi.fn()
  const props = $state({
    open: true,
    actions: [{ label: `existing action`, action }],
    allowUserOptions: true,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  const input_el = doc_query<HTMLInputElement>(
    `dialog div.multiselect input[autocomplete]`,
  )
  input_el.value = `custom command`
  input_el.dispatchEvent(new Event(`input`, { bubbles: true }))
  await tick()

  expect(() => doc_query<HTMLLIElement>(`dialog li.user-msg`).click()).not.toThrow()
  await tick()

  expect(action).not.toHaveBeenCalled()
  expect(props.open).toBe(true)
})

test.each([
  [`page body`, () => document.body],
  // showModal() backdrop clicks dispatch with the dialog element itself as the target,
  // so a naive dialog.contains(target) check would wrongly keep the palette open
  [`modal backdrop (target === dialog)`, () => doc_query<HTMLDialogElement>(`dialog`)],
  // SVG targets are Element but not HTMLElement - an instanceof HTMLElement guard
  // would wrongly ignore them and leave the palette open
  [
    `svg element outside dialog`,
    () => {
      const svg = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`)
      document.body.append(svg)
      return svg
    },
  ],
])(`closes dialog on outside click: %s`, async (_label, get_target) => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  get_target().dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
  await tick()

  expect(props.open).toBe(false)
  expect(document.querySelector(`dialog`)).toBeNull()
})

test(`keeps dialog open when clicking inside the palette`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  doc_query(`dialog div.multiselect input[autocomplete]`).dispatchEvent(
    new MouseEvent(`click`, { bubbles: true }),
  )
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

test(`keeps dialog open when clicking a nested portalled option`, async () => {
  const props = $state({ open: true, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  const real_listbox_id = input.getAttribute(`aria-controls`)
  if (!real_listbox_id) throw new Error(`Palette input has no aria-controls listbox id`)
  const listbox_id = `${real_listbox_id}-portalled`
  input.setAttribute(`aria-controls`, listbox_id)

  const container = document.createElement(`div`)
  container.innerHTML = `<ul class="options" id="${listbox_id}"><li><span>Nested option</span></li></ul>`
  document.body.append(container)

  doc_query(`#${listbox_id} span`).dispatchEvent(
    new MouseEvent(`click`, { bubbles: true }),
  )
  await tick()

  expect(props.open).toBe(true)
  expect(document.querySelector(`dialog`)).not.toBeNull()

  container.remove()
})

test(`stays open when a button's click handler sets open=true and the click bubbles to window`, async () => {
  // the very click that opens the palette bubbles to <svelte:window onclick> while
  // dialog is still null (not rendered until next flush) - close_if_outside must
  // not treat it as an outside click and instantly close the palette
  const props = $state({ open: false, actions: mock_actions, fade_duration: 0 })
  mount(CmdPalette, { target: document.body, props })

  const open_button = document.createElement(`button`)
  open_button.addEventListener(`click`, () => {
    props.open = true
  })
  document.body.append(open_button)

  try {
    open_button.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    await tick()

    expect(props.open).toBe(true)
    expect(document.querySelector(`dialog`)).toBeInstanceOf(HTMLDialogElement)
  } finally {
    open_button.remove()
  }
})

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

// dialog_props spreads after the built-in onclose handler, so a user-provided
// onclose replaces it and the palette no longer auto-closes on the native close event
test.each([
  { desc: `resets open state on native close`, custom_onclose: false },
  { desc: `dialog_props onclose replaces built-in handler`, custom_onclose: true },
])(`native dialog close event: $desc`, async ({ custom_onclose }) => {
  const on_close = vi.fn()
  const props = $state({
    open: true,
    actions: mock_actions,
    fade_duration: 0,
    dialog_props: {
      class: `custom-dialog`,
      ...(custom_onclose ? { onclose: on_close } : {}),
    },
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  // dialog_props spread onto the element without clobbering default attributes
  const dialog = doc_query<HTMLDialogElement>(`dialog`)
  expect(dialog.classList.contains(`custom-dialog`)).toBe(true)
  expect(dialog.getAttribute(`aria-label`)).toBe(`Command palette`)

  dialog.dispatchEvent(new Event(`close`))
  await tick()

  expect(on_close).toHaveBeenCalledTimes(custom_onclose ? 1 : 0)
  expect(props.open).toBe(custom_onclose)
})

test(`handles empty actions array`, () => {
  const console_error = vi.spyOn(console, `error`).mockImplementation(() => {})
  const props = $state({ open: true, actions: [], fade_duration: 0 })
  try {
    mount(CmdPalette, { target: document.body, props })

    expect(doc_query(`dialog`)).toBeInstanceOf(HTMLDialogElement)
    expect(document.querySelector(`dialog ul.options`)?.children.length ?? 0).toBe(0)
    expect(console_error).toHaveBeenCalledWith(`MultiSelect: received no options`)
  } finally {
    console_error.mockRestore()
  }
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
    search: `qwerty`,
    expected: [`No matching commands`],
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
    search: `cu`,
    expected: [`No matching commands`],
    description: `exact match 'cu' -> no matches (not a substring)`,
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
  expect(doc_query(`dialog input[autocomplete]`).getAttribute(`aria-label`)).toBe(
    `Search commands`,
  )
  expect(document.activeElement).toBe(props.input)
})

test(`selects the first enabled action and preserves pointer selection across grouped refreshes`, async () => {
  const actions = [
    { id: `alpha`, label: `Alpha`, group: `A`, action: vi.fn() },
    { id: `disabled`, label: `Disabled`, group: `B`, disabled: true, action: vi.fn() },
    { id: `beta`, label: `Beta`, group: `A`, action: vi.fn() },
    { id: `extra`, label: `Extra`, group: `B`, action: vi.fn() },
  ]
  const props = $state({
    open: true,
    actions,
    activeIndex: null as number | null,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  expect(doc_query(`li.active`).textContent).toContain(`Alpha`)

  const beta_option = [...document.querySelectorAll(`li[role=option]`)].find((option) =>
    option.textContent?.includes(`Beta`),
  )
  beta_option?.dispatchEvent(new MouseEvent(`mouseover`, { bubbles: true }))
  await tick()
  expect(doc_query(`li.active`).textContent).toContain(`Beta`)

  const renamed_beta = { ...actions[2], label: `Renamed Beta` }
  props.actions = [actions[1], renamed_beta, actions[3], actions[0]]
  await tick()
  expect(props.activeIndex).toBe(2)
  expect(doc_query(`li.active`).textContent).toContain(`Renamed Beta`)

  props.activeIndex = 3
  await tick()
  props.actions = [renamed_beta, actions[0], actions[1], actions[3]]
  await tick()
  expect(props.activeIndex).toBe(1)
  expect(doc_query(`li.active`).textContent).toContain(`Alpha`)

  input.value = `alpha`
  input.dispatchEvent(new Event(`input`, { bubbles: true }))
  await tick()
  expect(doc_query(`li.active`).textContent).toContain(`Alpha`)
})

test(`auto-active considers only visible enabled actions`, async () => {
  const props = $state({
    open: true,
    actions: [
      { label: `Disabled`, disabled: true, action: vi.fn() },
      { label: `Enabled`, action: vi.fn() },
    ],
    activeIndex: 0,
    maxOptions: 1,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  expect(props.activeIndex).toBeNull()
  expect(document.querySelector(`li.active`)).toBeNull()

  props.maxOptions = 2
  await tick()
  expect(props.activeIndex).toBe(1)
  expect(doc_query(`li.active`).textContent).toContain(`Enabled`)

  props.actions = [
    { ...props.actions[0], disabled: false },
    { ...props.actions[1], disabled: true },
  ]
  await tick()
  expect(props.activeIndex).toBe(0)
})

test(`preserves active action when IDs and signatures collide`, async () => {
  const first_action = {
    id: `duplicate`,
    label: `Duplicate`,
    description: `Same action`,
    action: vi.fn(),
  }
  const second_action = { ...first_action, action: vi.fn() }
  const third_action = { id: `third`, label: `Third`, action: vi.fn() }
  const props = $state({
    open: true,
    actions: [first_action, second_action, third_action],
    activeIndex: 1,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  expect(props.activeIndex).toBe(1)

  props.actions = [first_action, third_action, second_action]
  await tick()
  await tick()

  expect(props.activeIndex).toBe(2)
  doc_query<HTMLInputElement>(`dialog input[autocomplete]`).dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
  )
  expect(second_action.action).toHaveBeenCalledExactlyOnceWith(`Duplicate`)
  expect(first_action.action).not.toHaveBeenCalled()
})

test(`preserves the active action by ID when callbacks are rebuilt`, async () => {
  const props = $state({
    open: true,
    actions: [
      { id: `alpha`, label: `Alpha`, action: vi.fn() },
      { id: `beta`, label: `Beta`, action: vi.fn() },
    ],
    activeIndex: 1,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  const beta_action = vi.fn()
  props.actions = [
    { id: `beta`, label: `Rebuilt Beta`, action: beta_action },
    { id: `alpha`, label: `Rebuilt Alpha`, action: vi.fn() },
  ]
  await tick()

  expect(props.activeIndex).toBe(0)
  doc_query<HTMLInputElement>(`dialog input[autocomplete]`).dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
  )
  expect(beta_action).toHaveBeenCalledExactlyOnceWith(`Rebuilt Beta`)
})

test(`groupSelectAll selects a whole action group without executing actions or closing`, async () => {
  const actions = [
    { label: `New File`, action: vi.fn(), group: `File` },
    { label: `Save`, action: vi.fn(), group: `File` },
    { label: `Copy`, action: vi.fn(), group: `Edit` },
  ]
  const on_select_all = vi.fn()
  const props = $state({
    open: true,
    actions,
    groupSelectAll: true,
    onselectAll: on_select_all,
    fade_duration: 0,
  })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  doc_query<HTMLButtonElement>(`dialog li.group-header button.group-select-all`).click()
  await tick()

  // group selected (scoping is covered by MultiSelect tests) - no action executed
  expect(on_select_all).toHaveBeenCalledTimes(1)
  for (const { action } of actions) expect(action).not.toHaveBeenCalled()
  expect(props.open).toBe(true)
})

// dropdown option labels in display order (used by shortcut/recents tests below)
const option_labels = () =>
  Array.from(document.querySelectorAll(`li[role='option']`), (li) =>
    li.textContent?.trim(),
  )

const shortcut_kbd_parts = () =>
  Array.from(
    document.querySelectorAll(`li[role='option'] .cmd-shortcut kbd`),
    (kbd) => kbd.textContent,
  )

const press_ctrl_shift = (key: string) =>
  globalThis.dispatchEvent(
    new KeyboardEvent(`keydown`, { key, ctrlKey: true, shiftKey: true }),
  )

test(`renders and searches action descriptions, metadata, badges, and keywords`, async () => {
  const actions = [
    {
      label: `save file`,
      action: vi.fn(),
      shortcut: `ctrl+shift+s`,
      description: `Write buffer to disk`,
      metadata: [`Workspace`, `Modified`],
      badge: `File`,
      keywords: [`persist`],
    },
    { label: `quit`, action: vi.fn() },
  ]
  mount(CmdPalette, {
    target: document.body,
    props: { open: true, actions, fade_duration: 0 },
  })
  await tick()

  expect(shortcut_kbd_parts()).toEqual([`Ctrl`, `⇧`, `S`])
  expect(doc_query(`.cmd-description`).textContent).toBe(`Write buffer to disk`)
  expect(doc_query(`.cmd-metadata`).textContent).toBe(`Workspace · Modified`)
  expect(doc_query(`.cmd-badge`).textContent).toBe(`File`)
  // action without shortcut renders no kbd
  const quit_li = Array.from(document.querySelectorAll(`li[role='option']`)).find((li) =>
    li.textContent?.includes(`quit`),
  )
  expect(quit_li?.querySelector(`kbd`)).toBeNull()

  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  input.value = `workspace persist`
  input.dispatchEvent(new Event(`input`, { bubbles: true }))
  await tick()
  expect(option_labels()).toHaveLength(1)
  expect(option_labels()[0]).toContain(`save file`)
})

async function search_pagefind(query: string): Promise<void> {
  const input = doc_query<HTMLInputElement>(`dialog input[autocomplete]`)
  input.value = query
  input.dispatchEvent(new Event(`input`, { bubbles: true }))
  await vi.runAllTimersAsync()
  await tick()
}

describe(`PagefindPalette`, () => {
  const base_props = { open: true, fade_duration: 0, debounce_ms: 0 }
  const make_pagefind_response = (title: string) => ({
    results: [
      {
        id: title,
        data: async () => ({
          url: `/${title.toLowerCase()}.html`,
          plain_excerpt: `${title} content`,
          meta: { title },
          sub_results: [],
        }),
      },
    ],
  })

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test.each([
    {
      strip_html_suffix: true,
      transform_url: (url: string) => `/docs${url}`,
      section_url: `/phase-diagram.html#temperature-composition`,
      expected_url: `/docs/phase-diagram#temperature-composition`,
    },
    {
      strip_html_suffix: false,
      transform_url: undefined,
      section_url: `/phase-diagram.html#temperature-composition`,
      expected_url: `/phase-diagram.html#temperature-composition`,
    },
    {
      strip_html_suffix: true,
      transform_url: undefined,
      section_url: `/download?file=guide.html`,
      expected_url: `/download?file=guide.html`,
    },
    {
      strip_html_suffix: true,
      transform_url: undefined,
      section_url: `/docs/index.html?next=/legacy.html`,
      expected_url: `/docs/?next=/legacy.html`,
    },
    {
      strip_html_suffix: true,
      transform_url: undefined,
      section_url: `/docs/#config.html`,
      expected_url: `/docs/#config.html`,
    },
  ])(
    `PagefindPalette paginates and navigates $section_url`,
    async ({ strip_html_suffix, transform_url, section_url, expected_url }) => {
      const navigate = vi.fn()
      const search = vi.fn(async () => ({
        results: [
          {
            id: `phase-diagram`,
            data: async () => ({
              url: `/phase-diagram.html`,
              plain_excerpt: `Binary phase diagram`,
              meta: { title: `Phase diagrams` },
              sub_results: [
                {
                  title: `Overview`,
                  url: `/phase-diagram.html#overview`,
                  plain_excerpt: `General phase diagram`,
                },
                {
                  title: `Temperature composition`,
                  url: section_url,
                  plain_excerpt: `Interactive &lt;temperature&gt; composition diagram`,
                },
              ],
            }),
          },
        ],
      }))
      const props = $state({
        ...base_props,
        batch_size: 0.5,
        navigate,
        strip_html_suffix,
        transform_url,
        load_pagefind: async () => ({ search }),
      })
      mount(PagefindPalette, { target: document.body, props })

      await search_pagefind(`binary`)

      expect(search).toHaveBeenCalledExactlyOnceWith(`binary`)
      expect(document.querySelectorAll(`li[role='option']`)).toHaveLength(1)
      doc_query<HTMLUListElement>(`ul.options`).dispatchEvent(new Event(`scroll`))
      await vi.runAllTimersAsync()
      await tick()
      const options = document.querySelectorAll<HTMLLIElement>(`li[role='option']`)
      expect(Array.from(options, (option) => option.textContent?.trim())).toEqual([
        `Phase diagrams › Overview General phase diagram`,
        `Phase diagrams › Temperature composition Interactive <temperature> composition diagram`,
      ])

      options[1].click()
      await tick()

      expect(navigate).toHaveBeenCalledExactlyOnceWith(expected_url)
      expect(props.open).toBe(false)
    },
  )

  test(`isolates concurrent queries that normalize to the same text`, async () => {
    const stale_response = make_pagefind_response(`Stale`)
    const fresh_response = make_pagefind_response(`Fresh`)
    const requests = [
      Promise.withResolvers<typeof stale_response>(),
      Promise.withResolvers<typeof fresh_response>(),
    ]
    const search = vi
      .fn()
      .mockReturnValueOnce(requests[0].promise)
      .mockReturnValueOnce(requests[1].promise)
    mount(PagefindPalette, {
      target: document.body,
      props: {
        ...base_props,
        load_pagefind: async () => ({ search }),
      },
    })

    await search_pagefind(`alpha`)
    await search_pagefind(` alpha `)
    expect(search).toHaveBeenCalledTimes(2)

    requests[1].resolve(fresh_response)
    await vi.runAllTimersAsync()
    await tick()
    expect(doc_query(`.cmd-label`).childNodes[0]?.textContent?.trim()).toBe(`Fresh`)

    requests[0].resolve(stale_response)
    await tick()

    expect(doc_query(`.cmd-label`).childNodes[0]?.textContent?.trim()).toBe(`Fresh`)
  })

  test(`retries loading Pagefind after a transient failure`, async () => {
    const search = vi.fn(async () => make_pagefind_response(`Fresh`))
    const load_pagefind = vi
      .fn()
      .mockRejectedValueOnce(new Error(`Unavailable`))
      .mockResolvedValue({ search })
    mount(PagefindPalette, {
      target: document.body,
      props: {
        ...base_props,
        fallback_actions: [{ label: `Fallback`, action: vi.fn() }],
        load_pagefind,
      },
    })

    await search_pagefind(`fallback`)
    expect(doc_query(`.cmd-label`).textContent).toContain(`Fallback`)

    await search_pagefind(`fresh`)
    expect(load_pagefind).toHaveBeenCalledTimes(2)
    expect(doc_query(`.cmd-label`).textContent).toContain(`Fresh`)
  })

  test(`reloads the current query when loader props change`, async () => {
    const second_navigate = vi.fn()
    const search = vi.fn(async () => make_pagefind_response(`Fresh`))
    const props = $state({
      ...base_props,
      load_pagefind: async () => ({ search }),
      navigate: vi.fn(),
      transform_url: (url: string) => `/old${url}`,
    })
    mount(PagefindPalette, { target: document.body, props })

    await search_pagefind(`fresh`)
    props.navigate = second_navigate
    props.transform_url = (url: string) => `/new${url}`
    await tick()
    await vi.runAllTimersAsync()
    await tick()

    expect(search).toHaveBeenCalledTimes(2)
    doc_query<HTMLLIElement>(`li[role='option']`).click()
    expect(second_navigate).toHaveBeenCalledExactlyOnceWith(`/new/fresh.html`)
  })

  test.each([
    [
      `index has no matches`,
      () => vi.fn(async () => ({ search: async () => ({ results: [] }) })),
    ],
    [
      `result fragments all fail`,
      () =>
        vi.fn(async () => ({
          search: async () => ({
            results: [
              {
                id: `broken`,
                data: async () => {
                  throw new Error(`Fragment unavailable`)
                },
              },
            ],
          }),
        })),
    ],
  ])(`filters fallback actions when the %s`, async (_scenario, make_load_pagefind) => {
    const fallback_actions = [
      {
        label: `API reference`,
        description: `All exported props`,
        badge: `Docs`,
        metadata: `Library`,
        keywords: [`schema`],
        action: vi.fn(),
      },
      {
        label: `Styling guide`,
        description: `CSS custom properties`,
        badge: `Guide`,
        metadata: `Visual`,
        keywords: [`theme`],
        action: vi.fn(),
      },
    ]
    const load_pagefind = make_load_pagefind()
    mount(PagefindPalette, {
      target: document.body,
      props: { ...base_props, fallback_actions, load_pagefind },
    })

    await vi.runAllTimersAsync()
    expect(document.querySelectorAll(`li[role='option']`)).toHaveLength(2)
    expect(load_pagefind).not.toHaveBeenCalled()

    await search_pagefind(`css theme visual guide`)

    const options = document.querySelectorAll(`li[role='option']`)
    expect(options).toHaveLength(1)
    expect(options[0].textContent).toContain(`Styling guide`)
    expect(load_pagefind).toHaveBeenCalledTimes(1)

    await search_pagefind(`api schema library docs`)

    expect(load_pagefind).toHaveBeenCalledTimes(1)
    doc_query<HTMLLIElement>(`li[role='option']`).click()
    expect(fallback_actions[0].action).toHaveBeenCalledExactlyOnceWith(`API reference`)
    expect(fallback_actions[1].action).not.toHaveBeenCalled()
  })

  test(`PagefindPalette handles a failed fragment and URL-derived title`, async () => {
    const make_result = (
      url: string,
      title: string,
      meta: Record<string, string> = { title },
    ) => ({
      id: url,
      data: async () => ({
        url,
        plain_excerpt: `${title} content`,
        meta,
        sub_results: [],
      }),
    })
    const search = vi.fn(async () => ({
      results: [
        {
          id: `broken`,
          data: async () => {
            throw new Error(`Fragment unavailable`)
          },
        },
        make_result(`/reference-guide.html?tab=api`, `Reference content`, {}),
        make_result(`/later.html`, `Later page`),
        make_result(`/docs/`, `Docs content`, {}),
      ],
    }))
    mount(PagefindPalette, {
      target: document.body,
      props: {
        ...base_props,
        batch_size: 3,
        load_pagefind: async () => ({ search }),
      },
    })

    await search_pagefind(`content`)

    const labels = Array.from(document.querySelectorAll(`.cmd-label`), (label) =>
      label.childNodes[0]?.textContent?.trim(),
    )
    expect(labels).toEqual([`Reference Guide`, `Later page`, `Docs`])
  })
})

test(`renders plus-key shortcut hints`, async () => {
  mount(CmdPalette, {
    target: document.body,
    props: {
      open: true,
      fade_duration: 0,
      actions: [{ label: `zoom in`, action: vi.fn(), shortcut: `ctrl++` }],
    },
  })
  await tick()

  expect(shortcut_kbd_parts()).toEqual([`Ctrl`, `+`])
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
  {
    desc: `fires when closed`,
    open: false,
    global_shortcuts: true,
    action_disabled: false,
    calls: 1,
  },
  {
    desc: `disabled via prop`,
    open: false,
    global_shortcuts: false,
    action_disabled: false,
    calls: 0,
  },
  {
    desc: `ignores disabled actions`,
    open: false,
    global_shortcuts: true,
    action_disabled: true,
    calls: 0,
  },
  {
    desc: `inactive while open`,
    open: true,
    global_shortcuts: true,
    action_disabled: false,
    calls: 0,
  },
  {
    desc: `ignores wrong modifiers`,
    open: false,
    global_shortcuts: true,
    action_disabled: false,
    calls: 0,
    shift: false,
  },
])(
  `global action shortcuts: $desc`,
  async ({ open, global_shortcuts, calls, shift = true, action_disabled }) => {
    const spy = vi.fn()
    const actions = [
      {
        label: `save`,
        action: spy,
        shortcut: `ctrl+shift+s`,
        disabled: action_disabled,
      },
    ]
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

test(`global shortcuts ignore events consumed by editable controls`, () => {
  const action = vi.fn()
  mount(CmdPalette, {
    target: document.body,
    props: {
      actions: [{ label: `save`, action, shortcut: `ctrl+shift+s` }],
      fade_duration: 0,
    },
  })
  const textarea = document.createElement(`textarea`)
  textarea.addEventListener(`keydown`, (event) => event.preventDefault())
  document.body.append(textarea)

  textarea.dispatchEvent(
    new KeyboardEvent(`keydown`, {
      key: `s`,
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  )

  expect(action).not.toHaveBeenCalled()
})

test(`global shortcuts skip disabled duplicate bindings`, async () => {
  const disabled_action = vi.fn()
  const enabled_action = vi.fn()
  mount(CmdPalette, {
    target: document.body,
    props: {
      actions: [
        {
          label: `disabled save`,
          action: disabled_action,
          shortcut: `ctrl+shift+s`,
          disabled: true,
        },
        { label: `save`, action: enabled_action, shortcut: `ctrl+shift+s` },
      ],
    },
  })

  press_ctrl_shift(`s`)
  await tick()

  expect(disabled_action).not.toHaveBeenCalled()
  expect(enabled_action).toHaveBeenCalledExactlyOnceWith(`save`)
})

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

  // trigger gamma via keyboard (ArrowDown x2 + Enter)
  const input_el = doc_query(`dialog div.multiselect input[autocomplete]`)
  for (let idx = 0; idx < 2; idx++) {
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

test(`recent_actions_key uses action ids for duplicate labels`, async () => {
  const storage_key = `test-cmd-recents-ids`
  localStorage.setItem(storage_key, JSON.stringify([`mixed`]))
  const actions = [
    { id: `mixed`, label: `save`, description: `Mixed`, action: vi.fn() },
    { label: `save`, description: `No id`, action: vi.fn() },
  ]
  const props = $state({ open: true, actions, recent_actions_key: storage_key })
  mount(CmdPalette, { target: document.body, props })
  await tick()

  expect(doc_query(`li[role='option'] .cmd-description`).textContent).toBe(`Mixed`)

  doc_query(`li[role='option']`).dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
  )
  await tick()

  expect(actions[0].action).toHaveBeenCalledExactlyOnceWith(`save`)
  expect(JSON.parse(localStorage.getItem(storage_key) ?? `[]`)).toEqual([`mixed`])
  localStorage.removeItem(storage_key)
})

// pre-existing recents-storage contents -> dropdown order on initial open
test.each([
  [
    `valid recents rank first`,
    JSON.stringify([`beta`, `gamma`]),
    [`beta`, `gamma`, `alpha`],
    undefined,
  ],
  [
    `max_recent limits stored recents`,
    JSON.stringify([`beta`, `gamma`]),
    [`beta`, `alpha`, `gamma`],
    1,
  ],
  // stale persisted ids (actions since removed/renamed) must not occupy low ranks,
  // else a real recent (rank 4 here) sorts after non-recents (default rank 3)
  [
    `stale ids are ignored so real recents still rank first`,
    JSON.stringify([`removed-1`, `removed-2`, `removed-3`, `removed-4`, `gamma`]),
    [`gamma`, `alpha`, `beta`],
    undefined,
  ],
  [
    `unparsable JSON is ignored`,
    `not valid json{{{`,
    [`alpha`, `beta`, `gamma`],
    undefined,
  ],
  [
    `non-array JSON is ignored`,
    `{"not":"an array"}`,
    [`alpha`, `beta`, `gamma`],
    undefined,
  ],
  [`non-string entries are ignored`, `[1,2,3]`, [`alpha`, `beta`, `gamma`], undefined],
])(
  `recents storage on initial open: %s`,
  async (_desc, stored, expected_order, max_recent) => {
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
        props: {
          open: true,
          actions,
          recent_actions_key: storage_key,
          max_recent,
          fade_duration: 0,
        },
      })
    })
    await tick()

    expect(option_labels()).toEqual(expected_order)
    localStorage.removeItem(storage_key)
  },
)

// global shortcut presses (while closed) persist the triggered action to recents
// (that the action also fires is covered by `global action shortcuts: fires when closed`)
test.each([
  {
    desc: `records the triggered action`,
    actions: [
      { label: `alpha`, action: vi.fn() },
      { label: `hotkeyed`, action: vi.fn(), shortcut: `ctrl+shift+h` },
    ],
    max_recent: undefined,
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
