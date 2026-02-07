import { Wiggle } from '$lib'
import type { ComponentProps } from 'svelte'
import { mount } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'

describe(`Wiggle`, () => {
  beforeEach(vi.useFakeTimers)

  const get_span = () => document.body.querySelector(`span`) as HTMLSpanElement

  // Helper to create bindable wiggle props
  const create_bindable_wiggle = (
    initial: boolean,
    extra_props: Partial<ComponentProps<typeof Wiggle>> = {},
  ) => {
    let wiggle_value = initial
    const props = {
      get wiggle() {
        return wiggle_value
      },
      set wiggle(val: boolean) {
        wiggle_value = val
      },
      ...extra_props,
    }
    return { props, get_value: () => wiggle_value }
  }

  test(`renders span with transform styles`, () => {
    mount(Wiggle, { target: document.body })
    const span = get_span()
    expect(span).toBeTruthy()
    expect(span.style.transform).toContain(`rotate`)
    expect(span.style.transform).toContain(`scale`)
    expect(span.style.transform).toContain(`translate`)
  })

  test.each([200, 500])(`resets wiggle to false after duration=%dms`, (duration) => {
    const { props, get_value } = create_bindable_wiggle(true, { duration })
    mount(Wiggle, { target: document.body, props })

    expect(get_value()).toBe(true)
    vi.advanceTimersByTime(duration)
    expect(get_value()).toBe(false)
  })

  test(`accepts all animation props without error`, () => {
    expect(() => {
      mount(Wiggle, {
        target: document.body,
        props: {
          wiggle: true,
          angle: 15,
          scale: 1.1,
          dx: 5,
          dy: 3,
          duration: 150,
          spring_options: { stiffness: 0.08, damping: 0.15 },
        },
      })
    }).not.toThrow()
    expect(get_span().style.transform).toBeDefined()
  })

  test(`does not reset wiggle when starting false`, () => {
    const { props, get_value } = create_bindable_wiggle(false)
    mount(Wiggle, { target: document.body, props })

    vi.advanceTimersByTime(500)
    expect(get_value()).toBe(false)
  })

  test(`resets wiggle immediately with duration=0`, () => {
    const { props, get_value } = create_bindable_wiggle(true, { duration: 0 })
    mount(Wiggle, { target: document.body, props })

    expect(get_value()).toBe(true)
    vi.runAllTimers()
    expect(get_value()).toBe(false)
  })
})
