import { ActionButton, type ActionState } from '$lib'
import { mount, tick, type ComponentProps } from 'svelte'
import { afterEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'
import TestSnippetHarness from './TestSnippetHarness.svelte'

const labels = {
  ready: { text: `Save` },
  pending: { text: `Saving…` },
  success: { text: `Saved` },
  error: { text: `Failed` },
} satisfies Record<ActionState, { text: string }>

afterEach(() => vi.useRealTimers())

const flush_action = async (): Promise<void> => {
  await Promise.resolve()
  await tick()
}

const mount_action_button = (
  props: Partial<ComponentProps<typeof ActionButton>>,
): HTMLButtonElement => {
  mount(ActionButton, {
    target: document.body,
    props: { action: () => `saved`, labels, reset_ms: 0, ...props },
  })
  return doc_query(`[data-sms-action]`)
}

test(`blocks duplicate actions while pending and resets after success`, async () => {
  vi.useFakeTimers()
  let resolve_action: ((result: string) => void) | undefined
  const action = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        resolve_action = resolve
      }),
  )
  const on_success = vi.fn()
  const button = mount_action_button({ action, reset_ms: 100, on_success })

  button.click()
  await tick()
  expect(button.dataset.state).toBe(`pending`)
  expect(button.disabled).toBe(true)
  expect(button.getAttribute(`aria-busy`)).toBe(`true`)
  expect(button.textContent).toContain(`Saving…`)

  button.click()
  expect(action).toHaveBeenCalledOnce()

  if (!resolve_action) throw new Error(`Action promise resolver was not initialized`)
  resolve_action(`saved-result`)
  await flush_action()
  expect(button.dataset.state).toBe(`success`)
  expect(button.disabled).toBe(false)
  expect(button.textContent).toContain(`Saved`)
  expect(on_success).toHaveBeenCalledWith(`saved-result`)

  await vi.advanceTimersByTimeAsync(99)
  expect(button.dataset.state).toBe(`success`)
  await vi.advanceTimersByTimeAsync(1)
  expect(button.dataset.state).toBe(`ready`)
})

test(`reports action errors without throwing from the event handler`, async () => {
  const action_error = new Error(`save failed`)
  const on_error = vi.fn()
  const console_error_spy = vi.spyOn(console, `error`).mockImplementation(() => void 0)
  const button = mount_action_button({
    action: () => Promise.reject(action_error),
    on_error,
  })

  button.click()
  await flush_action()
  expect(button.dataset.state).toBe(`error`)
  expect(button.textContent).toContain(`Failed`)
  expect(on_error).toHaveBeenCalledWith(action_error)
  expect(console_error_spy).toHaveBeenCalledWith(
    `ActionButton action failed`,
    action_error,
  )
})

test(`keeps success state when its success callback throws`, async () => {
  const callback_error = new Error(`analytics failed`)
  const console_error_spy = vi.spyOn(console, `error`).mockImplementation(() => void 0)
  const button = mount_action_button({
    on_success: () => {
      throw callback_error
    },
  })

  button.click()
  await flush_action()
  expect(button.dataset.state).toBe(`success`)
  expect(console_error_spy).toHaveBeenCalledWith(
    `ActionButton on_success callback failed`,
    callback_error,
  )
})

test(`children receive the generic action result`, async () => {
  mount(TestSnippetHarness, {
    target: document.body,
    props: {
      component: `action-button`,
      action: () => `saved-result`,
      reset_ms: 0,
    },
  })
  const button = doc_query<HTMLButtonElement>(`[data-sms-action]`)

  button.click()
  await flush_action()
  const snippet = doc_query(`[data-testid="action-snippet"]`)
  expect(snippet.dataset.state).toBe(`success`)
  expect(snippet.dataset.result).toBe(`saved-result`)
  expect(snippet.dataset.disabled).toBe(`false`)
})
