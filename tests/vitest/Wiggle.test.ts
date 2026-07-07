import { Wiggle } from '$lib'
import type { ComponentProps } from 'svelte'
import { mount, unmount } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`Wiggle`, () => {
  beforeEach(vi.useFakeTimers)

  const get_span = () => doc_query<HTMLSpanElement>(`span`)

  const create_bindable_wiggle = (
    initial: boolean,
    extra_props: Partial<ComponentProps<typeof Wiggle>> = {},
  ) => {
    let wiggle_value = initial
    const props = {
      get wiggle() {
        return wiggle_value
      },
      set wiggle(value: boolean) {
        wiggle_value = value
      },
      ...extra_props,
    }
    return { props, get_value: () => wiggle_value }
  }

  test.each([0, 200, 500])(`resets wiggle to false after duration=%dms`, (duration) => {
    const { props, get_value } = create_bindable_wiggle(true, { duration })
    mount(Wiggle, { target: document.body, props })

    expect(get_value()).toBe(true)
    vi.advanceTimersByTime(duration)
    expect(get_value()).toBe(false)
  })

  test(`custom animation props produce matching transform values`, () => {
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
    const transform = get_span().style.transform.replaceAll(/\s+/gu, ` `).trim()
    expect(transform).toBe(`rotate(15deg) scale(1.1) translate(5px, 3px)`)
  })

  test(`does not reset wiggle when starting false`, () => {
    const { props, get_value } = create_bindable_wiggle(false)
    mount(Wiggle, { target: document.body, props })

    vi.advanceTimersByTime(500)
    expect(get_value()).toBe(false)
  })

  test(`clears pending reset timer on unmount instead of writing to destroyed state`, () => {
    const { props, get_value } = create_bindable_wiggle(true, { duration: 200 })
    const component = mount(Wiggle, { target: document.body, props })

    void unmount(component)
    vi.advanceTimersByTime(500)
    expect(get_value()).toBe(true) // timer was cancelled, no write-after-destroy
  })
})
