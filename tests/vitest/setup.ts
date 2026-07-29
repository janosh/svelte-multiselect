import { beforeAll, beforeEach, vi } from 'vite-plus/test'

beforeAll(() => {
  Element.prototype.animate = vi.fn().mockReturnValue({})
  Element.prototype.getAnimations = vi.fn().mockReturnValue([{}])
})

// Node's localStorage is undefined without --localstorage-file; happy-dom won't replace it.
// Unconditional: reading the property to probe it prints Node's experimental warning.
const store = new Map<string, string>()
Object.defineProperty(globalThis, `localStorage`, {
  writable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  },
})

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ``
  localStorage.clear()
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
