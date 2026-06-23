import { beforeAll, beforeEach, vi } from 'vite-plus/test'

const storage = new Map<string, string>()

Object.defineProperty(globalThis, `localStorage`, {
  configurable: true,
  writable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, val: string) => {
      storage.set(key, val)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => storage.clear(),
  },
})

beforeAll(() => {
  Element.prototype.animate = vi.fn().mockReturnValue({})
  Element.prototype.getAnimations = vi.fn().mockReturnValue([{}])
})

beforeEach(() => {
  document.body.innerHTML = ``
  storage.clear()
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
