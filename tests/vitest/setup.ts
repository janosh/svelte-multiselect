import { beforeAll, beforeEach, vi } from 'vite-plus/test'

beforeEach(() => {
  document.body.innerHTML = ``
})

beforeAll(() => {
  Element.prototype.animate = vi.fn().mockReturnValue({})
  Element.prototype.getAnimations = vi.fn().mockReturnValue([{}])
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
