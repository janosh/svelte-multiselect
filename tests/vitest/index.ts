import type { MultiSelectProps } from '$lib'
import { assert, vi } from 'vite-plus/test'

// Generic return type keeps call sites concise for DOM-specific assertions.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function doc_query<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector)
  assert(node !== null, `No element found for selector: ${selector}`)
  return node
}

// Shadows a prototype getter (navigator.userAgent, documentElement.clientWidth) with
// an own value property. Returns the undo, which callers must register for teardown so
// a failed assertion cannot leak the stub into later tests.
export const stub_prop = (target: object, prop: string, value: unknown) => {
  Object.defineProperty(target, prop, { value, configurable: true })
  return () => Reflect.deleteProperty(target, prop)
}

// happy-dom skips layout, so every geometry an attachment reads has to be mocked:
// getBoundingClientRect plus the read-only offset* properties (hence defineProperty).
export const mock_rect = (
  element: HTMLElement,
  rect: { left: number; top: number; width?: number; height?: number },
) => {
  const { left, top, width = 100, height = 50 } = rect
  element.getBoundingClientRect = vi.fn(() => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }))
  const offsets = {
    offsetLeft: left,
    offsetTop: top,
    offsetWidth: width,
    offsetHeight: height,
  }
  for (const [prop, value] of Object.entries(offsets)) {
    Object.defineProperty(element, prop, { value, configurable: true })
  }
}

export const mouse_event = (type: string, clientX: number, clientY: number, button = 0) =>
  new MouseEvent(type, { clientX, clientY, button, bubbles: true })

export const escape_key = () =>
  new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true })

// Tracking settlement (rather than awaiting) is the only way to assert a promise is
// still pending, which is what a queue is for.
export const track = <T>(promise: Promise<T>) => {
  const state: { settled: boolean; value?: T } = { settled: false }
  void promise.then((value) => Object.assign(state, { settled: true, value }))
  return state
}

export type Test2WayBindProps = MultiSelectProps & {
  onActiveIndexChanged?: (data: MultiSelectProps[`activeIndex`]) => unknown
  onActiveOptionChanged?: (data: MultiSelectProps[`activeOption`]) => unknown
  onOptionsChanged?: (data: MultiSelectProps[`options`]) => unknown
  onSearchTextChanged?: (data: MultiSelectProps[`searchText`]) => unknown
  onSelectedChanged?: (data: MultiSelectProps[`selected`]) => unknown
  onValueChanged?: (data: MultiSelectProps[`value`]) => unknown
}
