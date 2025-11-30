import { CopyButton } from '$lib'
import { mount } from 'svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Mock clipboard API
const mock_write_text = vi.fn()
vi.stubGlobal(`navigator`, {
  clipboard: {
    writeText: mock_write_text,
  },
})

describe(`CopyButton`, () => {
  let target: HTMLElement

  beforeEach(() => {
    target = document.body
    target.innerHTML = ``
    vi.clearAllMocks()
  })

  afterEach(() => {
    target.innerHTML = ``
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe(`Keyboard Accessibility`, () => {
    test(`responds to Enter and Space keys on non-button elements`, () => {
      mock_write_text.mockResolvedValue(undefined)

      mount(CopyButton, {
        target,
        props: {
          content: `test content`,
          as: `div`,
        },
      })

      const element = target.querySelector(`[data-sms-copy]`) as HTMLElement
      expect(element).toBeTruthy()
      expect(element.tagName).toBe(`DIV`)

      // Test Enter key
      const enter_event = new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true })
      element.dispatchEvent(enter_event)

      expect(mock_write_text).toHaveBeenCalledWith(`test content`)

      // Reset mock and test Space key
      mock_write_text.mockClear()
      const space_event = new KeyboardEvent(`keydown`, { key: ` `, bubbles: true })
      element.dispatchEvent(space_event)

      expect(mock_write_text).toHaveBeenCalledWith(`test content`)
    })

    test(`prevents default behavior for Enter and Space keys`, () => {
      mount(CopyButton, {
        target,
        props: {
          content: `test`,
          as: `div`,
        },
      })

      const element = target.querySelector(`[data-sms-copy]`) as HTMLElement

      // Test Enter key
      const enter_event = new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true })
      const prevent_default_spy = vi.spyOn(enter_event, `preventDefault`)
      element.dispatchEvent(enter_event)
      expect(prevent_default_spy).toHaveBeenCalled()

      // Test Space key
      const space_event = new KeyboardEvent(`keydown`, { key: ` `, bubbles: true })
      const prevent_default_spy_space = vi.spyOn(space_event, `preventDefault`)
      element.dispatchEvent(space_event)
      expect(prevent_default_spy_space).toHaveBeenCalled()
    })

    test(`ignores other keys`, () => {
      mount(CopyButton, {
        target,
        props: {
          content: `test`,
          as: `div`,
        },
      })

      const element = target.querySelector(`[data-sms-copy]`) as HTMLElement

      // Test various other keys
      const other_keys = [`Escape`, `Tab`, `ArrowUp`, `a`, `1`]
      other_keys.forEach((key) => {
        const event = new KeyboardEvent(`keydown`, { key })
        const prevent_default_spy = vi.spyOn(event, `preventDefault`)
        element.dispatchEvent(event)
        expect(prevent_default_spy).not.toHaveBeenCalled()
      })
    })

    test(`has proper accessibility attributes`, () => {
      mount(CopyButton, {
        target,
        props: {
          content: `accessibility test`,
          as: `div`,
        },
      })

      const element = target.querySelector(`[data-sms-copy]`) as HTMLElement
      expect(element.getAttribute(`role`)).toBe(`button`)
      expect(element.getAttribute(`tabindex`)).toBe(`0`)
      expect(element.getAttribute(`data-sms-copy`)).toBe(``)
    })
  })
})
