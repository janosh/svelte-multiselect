// Tests for live-examples/utils.ts - shared base64 utilities
import { from_base64, to_base64 } from '$lib/live-examples/utils'
import { describe, expect, test } from 'vitest'

describe(`base64 encoding/decoding`, () => {
  test.each([
    `Hello World`,
    `<div>Test</div>`,
    `<script>const x = 1</script>`,
    `Unicode: 日本語 🎉`,
    `Newlines:\nMultiple\nLines`,
    `Special chars: \`\${}'"\``,
    ``,
  ])(`roundtrips correctly: %s`, (input) => {
    const encoded = to_base64(input)
    const decoded = from_base64(encoded)
    expect(decoded).toBe(input)
  })

  test(`to_base64 produces valid base64`, () => {
    const result = to_base64(`Hello`)
    expect(result).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(result).toBe(`SGVsbG8=`)
  })

  test(`from_base64 decodes standard base64`, () => {
    expect(from_base64(`SGVsbG8=`)).toBe(`Hello`)
    expect(from_base64(`V29ybGQ=`)).toBe(`World`)
  })
})
