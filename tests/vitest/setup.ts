import { beforeAll, beforeEach, vi } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ``
})

beforeAll(() => {
  const animation = {} as Animation
  Element.prototype.animate = () => animation
  Element.prototype.getAnimations = () => [animation]
})

Object.defineProperty(window, `matchMedia`, {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({ media: query })),
})
