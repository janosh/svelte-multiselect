// Tests for live-examples/index.ts - exports
import {
  EXAMPLE_COMPONENT_PREFIX,
  EXAMPLE_MODULE_PREFIX,
  starry_night,
  vite_plugin,
} from '$lib/live-examples/index'
import { describe, expect, test } from 'vitest'

describe(`module exports`, () => {
  test(`prefix constants have expected values`, () => {
    expect(EXAMPLE_MODULE_PREFIX).toBe(`___live_example___`)
    expect(EXAMPLE_COMPONENT_PREFIX).toBe(`LiveExample___`)
  })

  test(`starry_night resolves svelte scope`, () => {
    expect(starry_night.flagToScope(`svelte`)).toBe(`source.svelte`)
  })
})

describe(`vite_plugin`, () => {
  test(`returns resolve and main plugins`, () => {
    const plugins = vite_plugin()
    expect(plugins).toHaveLength(2)
    expect(plugins[0].name).toBe(`live-examples-resolve`)
    expect(plugins[1].name).toBe(`live-examples-plugin`)
  })
})
