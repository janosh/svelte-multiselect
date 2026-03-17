import { beforeAll, beforeEach, vi } from 'vite-plus/test'

beforeEach(() => {
  document.body.innerHTML = ``
})

beforeAll(() => {
  const animation = {} as Animation
  Element.prototype.animate = () => animation
  Element.prototype.getAnimations = () => [animation]
})

Object.defineProperty(globalThis, `matchMedia`, {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    media: query,
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})
