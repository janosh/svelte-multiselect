import { Toggle } from '$lib'
import { mount, tick } from 'svelte'
import { describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'
import TestSnippetHarness from './TestSnippetHarness.svelte'

describe(`Toggle`, () => {
  const get_input = () => doc_query<HTMLInputElement>(`input[type="checkbox"]`)
  const create_keydown = (key: string, init: KeyboardEventInit = {}) =>
    new KeyboardEvent(`keydown`, { key, bubbles: true, ...init })
  const keydown = (key: string) => get_input().dispatchEvent(create_keydown(key))

  test(`toggles on click`, () => {
    mount(Toggle, { target: document.body, props: { checked: true } })
    const input = get_input()
    expect(input.checked).toBe(true)
    input.click()
    expect(input.checked).toBe(false)
    input.click()
    expect(input.checked).toBe(true)
  })

  test(`toggles on Enter key and fires change event`, () => {
    const onchange = vi.fn()
    mount(Toggle, { target: document.body, props: { input_props: { onchange } } })
    const input = get_input()

    keydown(`Enter`)
    expect(input.checked).toBe(true)
    expect(onchange).toHaveBeenCalledWith(expect.any(Event))

    keydown(`Enter`)
    expect(input.checked).toBe(false)
  })

  test.each([`A`, `Escape`, `Tab`, `Space`])(`doesn't toggle on %s key`, (key) => {
    mount(Toggle, { target: document.body })
    keydown(key)
    expect(get_input().checked).toBe(false)
  })

  test(`Enter key prevents default and calls onkeydown first`, () => {
    const call_order: string[] = []
    const onkeydown = vi.fn(() => call_order.push(`onkeydown`))
    mount(Toggle, {
      target: document.body,
      props: { onkeydown, input_props: { onclick: () => call_order.push(`click`) } },
    })

    const event = create_keydown(`Enter`, { cancelable: true })
    const prevent_default_spy = vi.spyOn(event, `preventDefault`)
    get_input().dispatchEvent(event)

    expect(prevent_default_spy).toHaveBeenCalled()
    expect(onkeydown).toHaveBeenCalledWith(expect.any(KeyboardEvent))
    expect(call_order[0]).toBe(`onkeydown`)
  })

  test(`applies custom class and styles`, () => {
    mount(Toggle, {
      target: document.body,
      props: {
        class: `custom-class`,
        style: `margin: 10px;`,
        input_props: { style: `width: 20px;` },
      },
    })
    expect(doc_query(`label`).classList.contains(`custom-class`)).toBe(true)
    expect(doc_query(`label`).getAttribute(`style`)).toBe(`margin: 10px;`)
    expect(doc_query(`input`).getAttribute(`style`)).toBe(`width: 20px;`)
  })

  test.each([
    [`change`, `onchange`, () => new Event(`change`, { bubbles: true })],
    [`blur`, `onblur`, () => new FocusEvent(`blur`)],
    [`click`, `onclick`, null], // null means use .click()
  ] as const)(`emits %s event`, (_, handler_prop, create_event) => {
    const handler = vi.fn()
    mount(Toggle, {
      target: document.body,
      props: { input_props: { [handler_prop]: handler } },
    })
    const input = get_input()
    if (create_event) input.dispatchEvent(create_event())
    else input.click()
    expect(handler).toHaveBeenCalledOnce()
  })

  test(`children snippet receives checked state and updates on toggle`, async () => {
    mount(TestSnippetHarness, {
      target: document.body,
      props: { component: `toggle`, checked: false },
    })

    const snippet = doc_query(`[data-testid="toggle-snippet"]`)
    expect(snippet.dataset.checked).toBe(`false`)

    get_input().click()
    await tick()
    expect(snippet.dataset.checked).toBe(`true`)

    get_input().click()
    await tick()
    expect(snippet.dataset.checked).toBe(`false`)
  })
})
