import { CopyButton } from '$lib'
import { mount } from 'svelte'
import { expect, test, vi } from 'vitest'

const mock_write_text = vi.fn()
vi.stubGlobal(`navigator`, { clipboard: { writeText: mock_write_text } })

const mount_copy_button = (content = `test`) => {
  mount(CopyButton, { target: document.body, props: { content, as: `div` } })
  return document.body.querySelector(`[data-sms-copy]`) as HTMLElement
}

test.each([`Enter`, ` `])(`%s key triggers copy and prevents default`, (key) => {
  mock_write_text.mockResolvedValue(undefined)
  const element = mount_copy_button(`test content`)
  const event = new KeyboardEvent(`keydown`, { key, bubbles: true })
  const prevent_spy = vi.spyOn(event, `preventDefault`)

  element.dispatchEvent(event)

  expect(mock_write_text).toHaveBeenCalledWith(`test content`)
  expect(prevent_spy).toHaveBeenCalled()
})

test.each([`Escape`, `Tab`, `ArrowUp`, `a`, `1`])(`%s key is ignored`, (key) => {
  const element = mount_copy_button()
  const event = new KeyboardEvent(`keydown`, { key })
  const prevent_spy = vi.spyOn(event, `preventDefault`)

  element.dispatchEvent(event)

  expect(prevent_spy).not.toHaveBeenCalled()
})

test(`has proper accessibility attributes`, () => {
  const element = mount_copy_button()
  expect(element.tagName).toBe(`DIV`)
  expect(element.getAttribute(`role`)).toBe(`button`)
  expect(element.getAttribute(`tabindex`)).toBe(`0`)
})
