// Tests for starry-night syntax highlighter
import {
  hast_to_html,
  starry_night,
  starry_night_highlighter,
} from '$lib/live-examples/highlighter'
import { describe, expect, test } from 'vitest'

describe(`starry_night.flagToScope`, () => {
  test.each([
    `svelte`,
    `html`,
    `css`,
    `js`,
    `ts`,
    `json`,
    `python`,
    `rust`,
    `go`,
    `yaml`,
    `sql`,
  ])(
    `resolves %s`,
    (lang) => expect(starry_night.flagToScope(lang)).toBeDefined(),
  )

  test.each([
    [`js`, `javascript`],
    [`ts`, `typescript`],
    [`py`, `python`],
    [`rs`, `rust`],
    [`rb`, `ruby`],
    [`yml`, `yaml`],
    [`md`, `markdown`],
    [`sh`, `bash`],
    [`golang`, `go`],
    [`kt`, `kotlin`],
    [`pl`, `perl`],
    [`cs`, `csharp`],
    [`c++`, `cpp`],
    [`objective-c`, `objc`],
    [`vb`, `vbnet`],
    [`gql`, `graphql`],
    [`make`, `makefile`],
  ])(`%s aliases %s`, (alias, canonical) => {
    expect(starry_night.flagToScope(alias)).toBe(starry_night.flagToScope(canonical))
  })
})

describe(`hast_to_html`, () => {
  test.each([
    [{ type: `text` as const, value: `hello` }, `hello`],
    [{ type: `text` as const, value: `<script>` }, `&lt;script&gt;`],
    [{ type: `text` as const, value: `a & b` }, `a &amp; b`],
    [{ type: `root` as const, children: [] }, ``],
    [
      {
        type: `root` as const,
        children: [
          { type: `text` as const, value: `a` },
          { type: `text` as const, value: `b` },
        ],
      },
      `ab`,
    ],
  ])(`converts %j`, (node, expected) => {
    expect(hast_to_html(node)).toBe(expected)
  })

  test.each(
    [
      [[`pl-k`], `const`, `<span class="pl-k">const</span>`],
      [[`pl-k`, `pl-s`], `x`, `<span class="pl-k pl-s">x</span>`],
      [undefined, `x`, `<span>x</span>`],
    ] as const,
  )(`element with className=%j`, (className, text, expected) => {
    const node = {
      type: `element` as const,
      tagName: `span`,
      properties: className ? { className: [...className] } : undefined,
      children: [{ type: `text` as const, value: text }],
    }
    expect(hast_to_html(node)).toBe(expected)
  })
})

describe(`starry_night_highlighter`, () => {
  // All supported languages in one test.each - covers web, shell, config, programming, etc.
  test.each([
    // Web
    [`svelte`, `<div>test</div>`],
    [`html`, `<div>test</div>`],
    [`ts`, `const x: number = 1`],
    [`typescript`, `const x: number = 1`],
    [`js`, `const x = 1`],
    [`javascript`, `const x = 1`],
    [`css`, `.class { color: red; }`],
    [`less`, `@color: red;`],
    [`scss`, `$color: red;`],
    [`json`, `{"key": "value"}`],
    [`graphql`, `query { user { name } }`],
    [`gql`, `query { user { name } }`],
    [`xml`, `<root><child/></root>`],
    [`svg`, `<svg><circle/></svg>`],
    [`php`, `<?php echo "hi"; ?>`],
    // Shell & config
    [`shell`, `echo "hello"`],
    [`bash`, `echo "hello"`],
    [`sh`, `echo "hello"`],
    [`yaml`, `key: value`],
    [`yml`, `key: value`],
    [`ini`, `[section]\nkey=value`],
    [`makefile`, `all:\n\techo hi`],
    [`make`, `all:\n\techo hi`],
    // Programming languages
    [`python`, `def foo(): pass`],
    [`py`, `def foo(): pass`],
    [`rust`, `fn main() {}`],
    [`rs`, `fn main() {}`],
    [`go`, `func main() {}`],
    [`golang`, `func main() {}`],
    [`java`, `class Foo {}`],
    [`kotlin`, `fun main() {}`],
    [`kt`, `fun main() {}`],
    [`swift`, `func main() {}`],
    [`ruby`, `def foo; end`],
    [`rb`, `def foo; end`],
    [`perl`, `print "hi";`],
    [`pl`, `print "hi";`],
    [`lua`, `print("hi")`],
    [`r`, `print("hi")`],
    [`sql`, `SELECT * FROM users`],
    [`c`, `int main() {}`],
    [`cpp`, `int main() {}`],
    [`c++`, `int main() {}`],
    [`cs`, `class Foo {}`],
    [`csharp`, `class Foo {}`],
    [`objc`, `@interface Foo`],
    [`objective-c`, `@interface Foo`],
    [`vb`, `Module Foo`],
    [`vbnet`, `Module Foo`],
    // Other
    [`diff`, `+added\n-removed`],
    [`markdown`, `# Hello`],
    [`md`, `# Hello`],
  ])(`highlights %s code`, (lang, code) => {
    const result = starry_night_highlighter(code, lang)
    const escaped_lang = lang.replace(/[+]/g, `\\$&`)
    expect(result).toMatch(
      new RegExp(
        `^<pre class="highlight highlight-${escaped_lang}"><code>.*</code></pre>$`,
        `s`,
      ),
    )
    // Verify actual syntax highlighting produces spans (not just wrapper)
    expect(result).toContain(`<span class="pl-`)
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
    test.each([`unknown`, `cobol`, `fortran`, null, undefined])(
      `returns escaped code for lang=%s`,
      (lang) => {
        const result = starry_night_highlighter(`test`, lang)
        expect(result).toBe(`<pre class="highlight"><code>test</code></pre>`)
      },
    )
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
