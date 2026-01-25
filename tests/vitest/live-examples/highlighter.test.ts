// Tests for starry-night syntax highlighter
import { starry_night_highlighter } from '$lib/live-examples/highlighter'
import { describe, expect, test } from 'vitest'

describe(`starry_night_highlighter`, () => {
  describe(`supported languages`, () => {
    test.each([
      [`svelte`, `<div>test</div>`],
      [`html`, `<div>test</div>`],
      [`ts`, `const x: number = 1`],
      [`typescript`, `const x: number = 1`],
      [`js`, `const x = 1`],
      [`javascript`, `const x = 1`],
      [`css`, `.class { color: red; }`],
      [`json`, `{"key": "value"}`],
      [`shell`, `echo "hello"`],
      [`bash`, `echo "hello"`],
      [`sh`, `echo "hello"`],
    ])(`highlights %s code`, (lang, code) => {
      const result = starry_night_highlighter(code, lang)
      expect(result).toMatch(
        new RegExp(`^<pre class="highlight highlight-${lang}"><code>.*</code></pre>$`),
      )
    })
  })

  describe(`case-insensitive language matching`, () => {
    test.each([`TS`, `TypeScript`, `JAVASCRIPT`, `Svelte`])(
      `normalizes %s to lowercase`,
      (lang) => {
        const result = starry_night_highlighter(`const x = 1`, lang)
        expect(result).toMatch(/^<pre class="highlight highlight-[a-z]+"><code>/)
        expect(result).not.toContain(lang) // Should use lowercase version
      },
    )
  })

  describe(`unsupported languages`, () => {
    test.each([`yaml`, `rust`, `python`, `unknown`])(
      `returns escaped code for unsupported lang: %s`,
      (lang) => {
        const result = starry_night_highlighter(`test`, lang)
        expect(result).toBe(`<pre class="highlight"><code>test</code></pre>`)
      },
    )

    test(`returns escaped code when no lang provided`, () => {
      expect(starry_night_highlighter(`test`)).toBe(
        `<pre class="highlight"><code>test</code></pre>`,
      )
    })
  })

  describe(`escaping`, () => {
    test(`escapes HTML special characters`, () => {
      const result = starry_night_highlighter(`<div>&</div>`)
      expect(result).toContain(`&lt;div&gt;&amp;&lt;/div&gt;`)
    })

    test(`escapes Svelte braces in unsupported code`, () => {
      const result = starry_night_highlighter(`{#if x}{/if}`)
      expect(result).toContain(`&#123;#if x&#125;&#123;/if&#125;`)
    })

    test(`escapes Svelte braces in highlighted code`, () => {
      const result = starry_night_highlighter(`{#if x}{/if}`, `svelte`)
      expect(result).toContain(`&#123;`)
      expect(result).toContain(`&#125;`)
    })
  })
})
