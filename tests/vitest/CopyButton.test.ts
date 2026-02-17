import { CopyButton } from '$lib'
import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { beforeEach, expect, test, vi } from 'vitest'
import TestCopyButtonGlobalUpdate from './TestCopyButtonGlobalUpdate.svelte'

const mock_write_text = vi.fn()
vi.stubGlobal(`navigator`, { clipboard: { writeText: mock_write_text } })

const default_labels = {
  ready: { icon: `Copy`, text: `ready` },
  success: { icon: `Check`, text: `success` },
  error: { icon: `Alert`, text: `error` },
} as const
const empty_children_snippet = (() => ``) as unknown as NonNullable<
  ComponentProps<typeof CopyButton>[`children`]
>

const mount_copy_button = (
  props: Partial<ComponentProps<typeof CopyButton>> = {},
) => {
  const copy_button_component = mount(CopyButton, {
    target: document.body,
    props: { content: `test`, as: `div`, labels: default_labels, ...props },
  })
  const copy_button = document.body.querySelector(`[data-sms-copy]`) as HTMLElement
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
  pre.appendChild(code)
  document.body.appendChild(pre)
  return { pre, code }
}

const get_single_mounted_button = (pre: HTMLPreElement): HTMLButtonElement => {
  expect(pre.querySelectorAll(`[data-sms-copy]`)).toHaveLength(1)
  return pre.querySelector(`[data-sms-copy]`) as HTMLButtonElement
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

test.each(
  [
    {
      as: `div`,
      disabled: false,
      expected_tabindex: `0`,
      expected_aria: null,
      is_native: false,
    },
    {
      as: `div`,
      disabled: true,
      expected_tabindex: `-1`,
      expected_aria: `true`,
      is_native: false,
    },
    {
      as: `button`,
      disabled: true,
      expected_tabindex: `-1`,
      expected_aria: `true`,
      is_native: true,
    },
  ] as const,
)(
  `accessibility attrs for as=$as disabled=$disabled`,
  ({ as, disabled, expected_tabindex, expected_aria, is_native }) => {
    const { copy_button } = mount_copy_button({ as, disabled })
    expect(copy_button.getAttribute(`role`)).toBe(`button`)
    expect(copy_button.getAttribute(`tabindex`)).toBe(expected_tabindex)
    expect(copy_button.getAttribute(`aria-disabled`)).toBe(expected_aria)
    if (is_native) expect((copy_button as HTMLButtonElement).disabled).toBe(true)
  },
)

test(`renders default icon and ready label`, () => {
  const { copy_button } = mount_copy_button()
  const icon = copy_button.querySelector(`svg`)
  expect(icon).toBeInstanceOf(SVGElement)
  expect(copy_button.textContent).toContain(`ready`)
})

test(`custom children render without default content wrapper`, () => {
  const { copy_button } = mount_copy_button({ children: empty_children_snippet })
  expect(copy_button.textContent).toBe(``)
  expect(copy_button.querySelector(`svg`)).toBeNull()
})

test(`disabled=true blocks copy and preserves ready state`, async () => {
  const { copy_button } = mount_copy_button({
    disabled: true,
    content: `disabled content`,
  })
  await click_copy_button(copy_button)
  expect(mock_write_text).not.toHaveBeenCalled()
  expect(copy_button.textContent).toContain(`ready`)
  expect(copy_button.getAttribute(`tabindex`)).toBe(`-1`)
  expect(copy_button.getAttribute(`aria-disabled`)).toBe(`true`)
})

test(`empty content is blocked`, async () => {
  const { copy_button } = mount_copy_button({ content: `` })
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
  const console_error_spy = vi.spyOn(console, `error`).mockImplementation(() => {})
  mock_write_text.mockRejectedValue(copy_error)

  const { copy_button } = mount_copy_button({ content: `error text`, on_copy_error })
  await click_copy_button(copy_button)
  expect(on_copy_error).toHaveBeenCalledWith(copy_error, `error text`)
  expect(copy_button.textContent).toContain(`error`)

  console_error_spy.mockRestore()
})

test.each(
  [
    [`default reset_sec`, { content: `default reset` }, 2000, 1999],
    [`custom reset_sec`, { content: `half sec`, reset_sec: 0.5 }, 500, 499],
    [`fine-grained reset_sec`, { content: `timed`, reset_sec: 0.05 }, 50, 49],
  ] as const,
)(
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
      unmount(copy_button_component)
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

  unmount(copy_button_component)
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

  const toggle_callback = document.querySelector(
    `[data-test-use-next-callback]`,
  ) as HTMLButtonElement
  toggle_callback.click()
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_next).toHaveBeenCalledWith(`selector content`)
  expect(on_copy_success_next).toHaveBeenCalledTimes(1)
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)

  const toggle_disabled = document.querySelector(
    `[data-test-toggle-global-disabled]`,
  ) as HTMLButtonElement
  toggle_disabled.click()
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).toHaveBeenCalledTimes(1)

  unmount(copy_button_component)
})

test(`global_selector remount uses latest callback after parent remount`, async () => {
  const on_copy_success_initial = vi.fn()
  const on_copy_success_next = vi.fn()
  const { pre } = create_pre_with_code(`selector content`, `copy-target`)

  const initial_component = mount(CopyButton, {
    target: document.body,
    props: {
      global_selector: `.copy-target`,
      on_copy_success: on_copy_success_initial,
      reset_sec: 1,
    },
  })
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).not.toHaveBeenCalled()

  unmount(initial_component)
  const remounted_component = mount(CopyButton, {
    target: document.body,
    props: {
      global_selector: `.copy-target`,
      on_copy_success: on_copy_success_next,
      reset_sec: 1,
    },
  })
  await tick()

  await click_copy_button(get_single_mounted_button(pre))
  expect(on_copy_success_initial).toHaveBeenCalledTimes(1)
  expect(on_copy_success_next).toHaveBeenCalledTimes(1)

  unmount(remounted_component)
})
