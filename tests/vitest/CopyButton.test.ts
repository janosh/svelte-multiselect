import { CopyButton } from '$lib'
import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'
import TestCopyButtonGlobalUpdate from './TestCopyButtonGlobalUpdate.svelte'
import TestSnippetHarness from './TestSnippetHarness.svelte'

const mock_write_text = vi.fn()
vi.stubGlobal(`navigator`, { clipboard: { writeText: mock_write_text } })

const default_labels = {
  ready: { icon: `Copy`, text: `ready` },
  success: { icon: `Check`, text: `success` },
  error: { icon: `Alert`, text: `error` },
} as const
const mount_copy_button = (props: Partial<ComponentProps<typeof CopyButton>> = {}) => {
  const copy_button_component = mount(CopyButton, {
    target: document.body,
    props: { content: `test`, as: `div`, labels: default_labels, ...props },
  })
  const copy_button = doc_query(`[data-sms-copy]`)
  return { copy_button_component, copy_button }
}

const click_copy_button = async (copy_button: HTMLElement): Promise<void> => {
  copy_button.click()
  await tick()
}

const create_pre_with_code = (
  code_text: string,
  class_name = ``,
): { pre: HTMLPreElement; code: HTMLElement } => {
  const pre = document.createElement(`pre`)
  const code = document.createElement(`code`)
  code.className = class_name
  code.textContent = code_text
  pre.append(code)
  document.body.append(pre)
  return { pre, code }
}

const get_single_mounted_button = (pre: HTMLPreElement): HTMLButtonElement => {
  const btns = pre.querySelectorAll<HTMLButtonElement>(`[data-sms-copy]`)
  expect(btns).toHaveLength(1)
  return btns.item(0)
}

const with_fake_timers = async (run_test: () => Promise<void>): Promise<void> => {
  vi.useFakeTimers()
  try {
    await run_test()
  } finally {
    vi.useRealTimers()
  }
}

beforeEach(() => {
  mock_write_text.mockReset()
  mock_write_text.mockResolvedValue(undefined)
})

test.each([`Enter`, ` `])(`%s key triggers copy and prevents default`, (key: string) => {
  const { copy_button } = mount_copy_button({ content: `test content` })
  const event = new KeyboardEvent(`keydown`, { key, bubbles: true })
  const prevent_spy = vi.spyOn(event, `preventDefault`)

  copy_button.dispatchEvent(event)

  expect(mock_write_text).toHaveBeenCalledWith(`test content`)
  expect(prevent_spy).toHaveBeenCalled()
})

test.each([`Escape`, `Tab`, `ArrowUp`, `a`, `1`])(`%s key is ignored`, (key: string) => {
  const { copy_button } = mount_copy_button()
  const event = new KeyboardEvent(`keydown`, { key })
  const prevent_spy = vi.spyOn(event, `preventDefault`)

  copy_button.dispatchEvent(event)

  expect(prevent_spy).not.toHaveBeenCalled()
})

test.each([
  [`div`, false, `0`, null],
  [`div`, true, `-1`, `true`],
  [`button`, true, `-1`, `true`],
  [`button`, false, `0`, null],
] as const)(
  `accessibility attrs for as=%s disabled=%s`,
  (as, disabled, expected_tabindex, expected_aria) => {
    const { copy_button } = mount_copy_button({ as, disabled })
    expect(copy_button.getAttribute(`role`)).toBe(`button`)
    expect(copy_button.getAttribute(`tabindex`)).toBe(expected_tabindex)
    expect(copy_button.getAttribute(`aria-disabled`)).toBe(expected_aria)
    if (copy_button instanceof HTMLButtonElement)
      expect(copy_button.disabled).toBe(disabled)
  },
)

test(`renders default icon and ready label`, () => {
  const { copy_button } = mount_copy_button()
  expect(copy_button.querySelector(`svg`)).toBeInstanceOf(SVGElement)
  expect(copy_button.textContent).toContain(`ready`)
})

test.each([
  [``, 0],
  [`Copy me`, 1],
] as const)(`text label %j renders %d text span(s)`, (text, expected_spans) => {
  const { copy_button } = mount_copy_button({
    labels: {
      ready: { icon: `Copy`, text },
      success: { icon: `Check`, text },
      error: { icon: `Alert`, text },
    },
  })
  const wrapper = copy_button.querySelector(`span`)
  expect(wrapper?.querySelectorAll(`span`)).toHaveLength(expected_spans)
  expect(copy_button.querySelector(`svg`)).toBeInstanceOf(SVGElement)
  if (text) expect(copy_button.textContent).toContain(text)
})

test.each([true, false])(
  `custom children snippet renders and receives disabled=%s`,
  (disabled) => {
    mount(TestSnippetHarness, {
      target: document.body,
      props: { component: `copy-button`, content: `test`, disabled },
    })
    const copy_button = doc_query(`[data-sms-copy]`)
    expect(copy_button.querySelector(`svg`)).toBeNull()
    const snippet = copy_button.querySelector<HTMLElement>(`[data-testid="copy-snippet"]`)
    expect(snippet?.dataset.disabled).toBe(`${disabled}`)
    expect(snippet?.dataset.state).toBe(`ready`)
  },
)

test.each([
  [`disabled=true`, { disabled: true, content: `disabled content` }],
  [`empty content`, { content: `` }],
] as const)(`%s blocks copy and preserves ready state`, async (_label, props) => {
  const { copy_button } = mount_copy_button(props)
  await click_copy_button(copy_button)
  expect(mock_write_text).not.toHaveBeenCalled()
  expect(copy_button.textContent).toContain(`ready`)
})

test(`calls on_copy_success with copied content`, async () => {
  const on_copy_success = vi.fn()
  const { copy_button } = mount_copy_button({ content: `copied text`, on_copy_success })
  await click_copy_button(copy_button)
  expect(on_copy_success).toHaveBeenCalledWith(`copied text`)
})

test(`calls on_copy_error with error and content`, async () => {
  const copy_error = new Error(`clipboard failed`)
  const on_copy_error = vi.fn()
  const console_error_spy = vi.spyOn(console, `error`).mockImplementation(() => void 0)
  mock_write_text.mockRejectedValue(copy_error)

  const { copy_button } = mount_copy_button({ content: `error text`, on_copy_error })
  await click_copy_button(copy_button)
  expect(on_copy_error).toHaveBeenCalledWith(copy_error, `error text`)
  expect(copy_button.textContent).toContain(`error`)

  console_error_spy.mockRestore()
})

test.each([
  [`default reset_sec`, { content: `default reset` }, 2000, 1999],
  [`custom reset_sec`, { content: `half sec`, reset_sec: 0.5 }, 500, 499],
  [`fine-grained reset_sec`, { content: `timed`, reset_sec: 0.05 }, 50, 49],
] as const)(
  `%s schedules millisecond delay and resets on time`,
  async (_desc, props, expected_delay_ms, elapsed_before_reset_ms) => {
    await with_fake_timers(async () => {
      const set_timeout_spy = vi.spyOn(globalThis, `setTimeout`)
      try {
        const { copy_button } = mount_copy_button(props)
        await click_copy_button(copy_button)
        expect(set_timeout_spy).toHaveBeenCalled()
        const timeout_call = set_timeout_spy.mock.calls.at(-1)
        expect(timeout_call?.[1]).toBe(expected_delay_ms)

        await vi.advanceTimersByTimeAsync(elapsed_before_reset_ms)
        expect(copy_button.textContent).toContain(`success`)

        await vi.advanceTimersByTimeAsync(1)
        expect(copy_button.textContent).toContain(`ready`)
      } finally {
        set_timeout_spy.mockRestore()
      }
    })
  },
)

test.each([0, -1])(`reset_sec=%s does not auto-reset`, async (reset_sec: number) => {
  await with_fake_timers(async () => {
    const { copy_button } = mount_copy_button({ content: `sticky`, reset_sec })
    await click_copy_button(copy_button)
    expect(copy_button.textContent).toContain(`success`)

    await vi.advanceTimersByTimeAsync(5000)
    expect(copy_button.textContent).toContain(`success`)
  })
})

test(`second click clears previous reset timer`, async () => {
  await with_fake_timers(async () => {
    const { copy_button } = mount_copy_button({ content: `multi click`, reset_sec: 0.1 })
    await click_copy_button(copy_button)
    expect(copy_button.textContent).toContain(`success`)

    await vi.advanceTimersByTimeAsync(50)
    await click_copy_button(copy_button)
    expect(copy_button.textContent).toContain(`success`)

    await vi.advanceTimersByTimeAsync(60)
    expect(copy_button.textContent).toContain(`success`)

    await vi.advanceTimersByTimeAsync(40)
    expect(copy_button.textContent).toContain(`ready`)
  })
})

test(`unmount clears outstanding reset timer`, async () => {
  await with_fake_timers(async () => {
    const clear_timeout_spy = vi.spyOn(globalThis, `clearTimeout`)
    try {
      const { copy_button_component, copy_button } = mount_copy_button({
        content: `cleanup`,
        reset_sec: 0.1,
      })
      await click_copy_button(copy_button)
      void unmount(copy_button_component)
      expect(clear_timeout_spy).toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(200)
    } finally {
      clear_timeout_spy.mockRestore()
    }
  })
})

test(`global=true propagates disabled prop to mounted buttons`, async () => {
  const on_copy_success = vi.fn()
  const { pre } = create_pre_with_code(`global content`)

  const copy_button_component = mount(CopyButton, {
    target: document.body,
    props: { global: true, disabled: true, on_copy_success },
  })
  await tick()

  await click_copy_button(get_single_mounted_button(pre))

  expect(mock_write_text).not.toHaveBeenCalled()
  expect(on_copy_success).not.toHaveBeenCalled()
  expect(get_single_mounted_button(pre).disabled).toBe(true)

  void unmount(copy_button_component)
})

test(`global_selector updates mounted button props when callbacks change`, async () => {
  const on_copy_success_initial = vi.fn()
  const on_copy_success_next = vi.fn()
  const { pre } = create_pre_with_code(`selector content`, `copy-target`)

  const copy_button_component = mount(TestCopyButtonGlobalUpdate, {
    target: document.body,
    props: {
      on_success_initial: on_copy_success_initial,
      on_success_next: on_copy_success_next,
    },
  })
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledWith(`selector content`)
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).not.toHaveBeenCalled()

  doc_query<HTMLButtonElement>(`[data-test-use-next-callback]`).click()
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_next).toHaveBeenCalledWith(`selector content`)
  expect(on_copy_success_next).toHaveBeenCalledTimes(1)
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)

  doc_query<HTMLButtonElement>(`[data-test-toggle-global-disabled]`).click()
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).toHaveBeenCalledTimes(1)

  void unmount(copy_button_component)
})

test(`global_selector remount uses latest callback after parent remount`, async () => {
  const on_copy_success_initial = vi.fn()
  const on_copy_success_next = vi.fn()
  const { pre } = create_pre_with_code(`selector content`, `copy-target`)
  const global_props = { global_selector: `.copy-target`, reset_sec: 1 }

  const initial_component = mount(CopyButton, {
    target: document.body,
    props: { ...global_props, on_copy_success: on_copy_success_initial },
  })
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).not.toHaveBeenCalled()

  void unmount(initial_component)
  const remounted_component = mount(CopyButton, {
    target: document.body,
    props: { ...global_props, on_copy_success: on_copy_success_next },
  })
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).toHaveBeenCalledTimes(1)

  void unmount(remounted_component)
})

test.each([
  [`different element type`, `a`],
  [`same element type`, `button`],
] as const)(`global mode replaces stale %s copy marker`, async (_label, tag) => {
  const { pre } = create_pre_with_code(`stale content`)
  const stale_marker = document.createElement(tag)
  stale_marker.setAttribute(`data-sms-copy`, ``)
  stale_marker.textContent = `stale`
  pre.append(stale_marker)

  const copy_button_component = mount(CopyButton, {
    target: document.body,
    props: { global: true, as: `button` },
  })
  await tick()

  expect(stale_marker.isConnected).toBe(false)
  expect(pre.querySelectorAll(`[data-sms-copy]`)).toHaveLength(1)
  expect(get_single_mounted_button(pre).textContent).not.toContain(`stale`)

  void unmount(copy_button_component)
})

test(`global mode custom skip_selector mounts beside existing code buttons`, async () => {
  const { pre } = create_pre_with_code(`copy even with button`)
  const existing_button = document.createElement(`button`)
  existing_button.textContent = `existing`
  pre.append(existing_button)

  const copy_button_component = mount(CopyButton, {
    target: document.body,
    props: { global: true, skip_selector: `.never-skip` },
  })
  await tick()

  expect(pre.querySelectorAll(`button`)).toHaveLength(2)
  expect(get_single_mounted_button(pre)).toBeInstanceOf(HTMLButtonElement)

  void unmount(copy_button_component)
})

test(`global mode skip_selector=null falls back to rendered tag`, async () => {
  const { pre } = create_pre_with_code(`skip existing anchor`)
  const existing_anchor = document.createElement(`a`)
  existing_anchor.href = `#existing`
  existing_anchor.textContent = `existing`
  pre.append(existing_anchor)

  const copy_button_component = mount(CopyButton, {
    target: document.body,
    props: { as: `a`, global: true, skip_selector: null },
  })
  await tick()

  expect(pre.querySelectorAll(`a`)).toHaveLength(1)
  expect(pre.querySelector(`[data-sms-copy]`)).toBeNull()

  void unmount(copy_button_component)
})
