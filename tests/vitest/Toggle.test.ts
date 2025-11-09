import { Toggle } from '$lib'
import { mount, tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe(`Toggle`, () => {
  let target: HTMLElement

  beforeEach(() => (target = document.body))
  afterEach(() => (target.innerHTML = ``))

  const getInput = () =>
    target.querySelector(`input[type="checkbox"]`) as HTMLInputElement

  test(`renders unchecked by default`, () => {
    mount(Toggle, { target })
    expect(getInput().checked).toBe(false)
  })

  test(`renders checked when prop is true`, () => {
    mount(Toggle, { target, props: { checked: true } })
    expect(getInput().checked).toBe(true)
  })

  test(`toggles on click`, () => {
    mount(Toggle, { target })
    const input = getInput()

    input.click()
    expect(input.checked).toBe(true)

    input.click()
    expect(input.checked).toBe(false)
  })

  test(`toggles on Enter key`, async () => {
    mount(Toggle, { target })
    const input = getInput()

    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
    )
    await tick()
    expect(input.checked).toBe(true)

    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
    )
    await tick()
    expect(input.checked).toBe(false)
  })

  test(`fires change event when toggling on Enter key`, async () => {
    const onchange = vi.fn()
    mount(Toggle, { target, props: { onchange } })
    const input = getInput()

    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
    )
    await tick()

    expect(input.checked).toBe(true)
    expect(onchange).toHaveBeenCalledWith(expect.any(Event))
  })

  test(`doesn't toggle on other keys`, () => {
    mount(Toggle, { target })
    const input = getInput()

    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `A` }))
    expect(input.checked).toBe(false)
  })

  test(`calls custom keydown handler`, async () => {
    const onkeydown = vi.fn()
    mount(Toggle, { target, props: { onkeydown } })

    getInput().dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
    )
    await tick()

    expect(onkeydown).toHaveBeenCalledWith(expect.any(KeyboardEvent))
    expect(getInput().checked).toBe(true)
  })

  test(`applies custom class`, () => {
    mount(Toggle, { target, props: { class: `custom-class` } })
    expect(
      target.querySelector(`label`)?.classList.contains(`custom-class`),
    ).toBe(true)
  })

  test(`applies custom styles`, () => {
    mount(Toggle, {
      target,
      props: { style: `margin: 10px;`, input_props: { style: `width: 20px;` } },
    })
    expect(target.querySelector(`label`)?.getAttribute(`style`)).toBe(
      `margin: 10px;`,
    )
    expect(target.querySelector(`input`)?.getAttribute(`style`)).toBe(
      `width: 20px;`,
    )
  })

  test(`sets required attribute`, () => {
    mount(Toggle, { target, props: { input_props: { required: true } } })
    expect(target.querySelector(`input`)?.hasAttribute(`required`)).toBe(true)
  })

  test(`handles custom id`, () => {
    mount(Toggle, { target, props: { input_props: { id: `custom-id` } } })
    expect(target.querySelector(`input`)?.getAttribute(`id`)).toBe(`custom-id`)

    target.innerHTML = ``
    mount(Toggle, { target, props: { input_props: { id: null } } })
    expect(target.querySelector(`input`)?.hasAttribute(`id`)).toBe(false)
  })

  test.each([
    [`change`, `onchange`],
    [`blur`, `onblur`],
    [`click`, `onclick`],
  ])(`emits %s event`, (eventType, handlerProp) => {
    const handler = vi.fn()
    mount(Toggle, { target, props: { input_props: { [handlerProp]: handler } } })

    const input = target.querySelector(`input`)
    if (eventType === `blur`) {
      input?.dispatchEvent(new FocusEvent(eventType))
    } else if (eventType === `click`) {
      input?.click()
    } else {
      input?.dispatchEvent(new Event(eventType, { bubbles: true }))
    }

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

    const input = getInput()
    expect(input.checked).toBe(false)

    input.click()
    input.dispatchEvent(new Event(`change`))

    expect(input.checked).toBe(true)
    expect(checked).toBe(true)
  })
})
