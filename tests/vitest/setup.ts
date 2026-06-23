import { beforeAll, beforeEach, vi } from 'vite-plus/test'

beforeAll(() => {
  Element.prototype.animate = vi.fn().mockReturnValue({})
  Element.prototype.getAnimations = vi.fn().mockReturnValue([{}])
})

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ``
})

Object.defineProperty(globalThis, `matchMedia`, {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    media: query,
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})
