import { Toggle } from '$lib'
import { mount } from 'svelte'
import { describe, expect, test, vi } from 'vitest'

describe(`Toggle`, () => {
  const target = document.body

  const get_input = () =>
    target.querySelector(`input[type="checkbox"]`) as HTMLInputElement

  test.each([false, true])(`renders with checked=%s`, (checked) => {
    mount(Toggle, { target, props: { checked } })
    expect(get_input().checked).toBe(checked)
  })

  test(`toggles on click`, () => {
    mount(Toggle, { target })
    const input = get_input()
    input.click()
    expect(input.checked).toBe(true)
    input.click()
    expect(input.checked).toBe(false)
  })

  test(`toggles on Enter key and fires change event`, () => {
    const onchange = vi.fn()
    mount(Toggle, { target, props: { input_props: { onchange } } })
    const input = get_input()

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    expect(input.checked).toBe(true)
    expect(onchange).toHaveBeenCalledWith(expect.any(Event))

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
    expect(input.checked).toBe(false)
  })

  test.each([`A`, `Escape`, `Tab`, `Space`])(
    `doesn't toggle on %s key`,
    (key) => {
      mount(Toggle, { target })
      get_input().dispatchEvent(new KeyboardEvent(`keydown`, { key, bubbles: true }))
      expect(get_input().checked).toBe(false)
    },
  )

  test(`Enter key prevents default and calls onkeydown first`, () => {
    const call_order: string[] = []
    const onkeydown = vi.fn(() => call_order.push(`onkeydown`))
    mount(Toggle, {
      target,
      props: { onkeydown, input_props: { onclick: () => call_order.push(`click`) } },
    })

    const event = new KeyboardEvent(`keydown`, {
      key: `Enter`,
      bubbles: true,
      cancelable: true,
    })
    const prevent_default_spy = vi.spyOn(event, `preventDefault`)
    get_input().dispatchEvent(event)

    expect(prevent_default_spy).toHaveBeenCalled()
    expect(onkeydown).toHaveBeenCalledWith(expect.any(KeyboardEvent))
    expect(call_order[0]).toBe(`onkeydown`)
  })

  test(`applies custom class and styles`, () => {
    mount(Toggle, {
      target,
      props: {
        class: `custom-class`,
        style: `margin: 10px;`,
        input_props: { style: `width: 20px;` },
      },
    })
    expect(target.querySelector(`label`)?.classList.contains(`custom-class`)).toBe(true)
    expect(target.querySelector(`label`)?.getAttribute(`style`)).toBe(`margin: 10px;`)
    expect(target.querySelector(`input`)?.getAttribute(`style`)).toBe(`width: 20px;`)
  })

  test.each(
    [
      [`change`, `onchange`, () => new Event(`change`, { bubbles: true })],
      [`blur`, `onblur`, () => new FocusEvent(`blur`)],
      [`click`, `onclick`, null], // null means use .click()
    ] as const,
  )(`emits %s event`, (_, handler_prop, create_event) => {
    const handler = vi.fn()
    mount(Toggle, { target, props: { input_props: { [handler_prop]: handler } } })
    const input = target.querySelector(`input`) as HTMLInputElement
    if (create_event) input.dispatchEvent(create_event())
    else input.click()
    expect(handler).toHaveBeenCalledOnce()
  })

  test(`renders with proper structure`, () => {
    mount(Toggle, { target })
    expect(target.querySelector(`label`)).toBeTruthy()
    expect(target.querySelector(`input[type="checkbox"]`)).toBeTruthy()
    expect(target.querySelector(`span`)).toBeTruthy()
  })

  test(`two-way binding works`, () => {
    let checked = false
    mount(Toggle, {
      target,
      props: {
        checked,
        input_props: {
          onchange: (event: Event) => {
            checked = (event.target as HTMLInputElement).checked
          },
        },
      },
    })

    const input = get_input()
    input.click()
    input.dispatchEvent(new Event(`change`))
    expect(input.checked).toBe(true)
    expect(checked).toBe(true)
  })
})
