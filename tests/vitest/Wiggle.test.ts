import { Wiggle } from '$lib'
import type { ComponentProps } from 'svelte'
import { mount, unmount } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`Wiggle`, () => {
  beforeEach(vi.useFakeTimers)

  const get_span = () => doc_query<HTMLSpanElement>(`span`)

  // a getter/setter pair (not a plain prop) is what Svelte writes the bound value back to
  const mount_bindable_wiggle = (
    initial: boolean,
    extra_props: Partial<ComponentProps<typeof Wiggle>> = {},
  ) => {
    const state = { wiggle: initial }
    const props = {
      get wiggle() {
        return state.wiggle
      },
      set wiggle(value: boolean) {
        state.wiggle = value
      },
      ...extra_props,
    }
    return { state, component: mount(Wiggle, { target: document.body, props }) }
  }

  test.each([0, 200, 500])(
    `resets wiggle to false only after the full duration=%dms`,
    (duration) => {
      const { state } = mount_bindable_wiggle(true, { duration })
      expect(state.wiggle).toBe(true)

      // stopping one tick short pins the delay to `duration`; advancing exactly
      // `duration` alone would also pass for a reset hardcoded to fire immediately
      vi.advanceTimersByTime(Math.max(duration - 1, 0))
      expect(state.wiggle).toBe(duration > 0)

      vi.advanceTimersByTime(1)
      expect(state.wiggle).toBe(false)
    },
  )

  test(`custom animation props produce matching transform values`, () => {
    const props = { wiggle: true, angle: 15, scale: 1.1, dx: 5, dy: 3, duration: 150 }
    mount(Wiggle, {
      target: document.body,
      props: { ...props, spring_options: { stiffness: 0.08, damping: 0.15 } },
    })
    const transform = get_span().style.transform.replaceAll(/\s+/gu, ` `).trim()
    expect(transform).toBe(`rotate(15deg) scale(1.1) translate(5px, 3px)`)
  })

  test(`does not reset wiggle when starting false`, () => {
    const { state } = mount_bindable_wiggle(false)

    vi.advanceTimersByTime(500)
    expect(state.wiggle).toBe(false)
  })

  test(`clears pending reset timer on unmount instead of writing to destroyed state`, () => {
    const { state, component } = mount_bindable_wiggle(true, { duration: 200 })

    void unmount(component)
    vi.advanceTimersByTime(500)
    expect(state.wiggle).toBe(true) // timer was cancelled, no write-after-destroy
  })
})
