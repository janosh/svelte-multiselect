import { fireEvent } from '@testing-library/svelte'

export function query<T extends HTMLElement>(selector: string) {
  return document.querySelector<T>(selector)
}

export function queryWithFail<T extends HTMLElement>(selector: string): T {
  const node = query<T>(selector)
  if (!node) throw new Error(`No element found for selector: ${selector}`)
  return node
}

export function queryAll<T extends HTMLElement>(selector: string) {
  return Array.from(document.querySelectorAll<T>(selector))
}

export async function fireMouseOver<T extends HTMLElement>(element: T) {
  return fireEvent.mouseOver(element)
}

export async function fireMouseUp<T extends HTMLElement>(element: T) {
  return fireEvent.mouseUp(element)
}

export async function fireInput<T extends HTMLElement>(element: T) {
  return fireEvent.input(element)
}

export async function fireKeyDown<T extends HTMLElement>(
  element: T,
  key?: string,
) {
  return fireEvent.keyDown(element, { key })
}

export async function fireKeyDownArrowUp<T extends HTMLElement>(element: T) {
  return fireKeyDown(element, `ArrowUp`)
}

export async function fireKeyDownArrowDown<T extends HTMLElement>(element: T) {
  return fireKeyDown(element, `ArrowDown`)
}

export async function fireKeyDownEnter<T extends HTMLElement>(element: T) {
  return fireKeyDown(element, `Enter`)
}

export async function fireKeyDownTab<T extends HTMLElement>(element: T) {
  return fireKeyDown(element, `Tab`)
}

export async function fireClick<T extends HTMLElement>(element: T) {
  return fireEvent.click(element)
}

export async function fireDrop<T extends HTMLElement>(
  element: T,
  dataTransfer: DataTransfer,
) {
  return fireEvent.drop(element, { dataTransfer })
}

export async function fireFocus<T extends HTMLElement>(element: T) {
  return fireEvent.focus(element)
}

export class DataTransfer {
  data: Record<string, string> = {}
  setData(type: string, val: string) {
    this.data[type] = val
  }
  getData(type: string) {
    return this.data[type]
  }
}

export class DragEvent extends MouseEvent {
  constructor(type: string, props: Record<string, unknown>) {
    super(type, props)
    Object.assign(this, props)
  }
}
