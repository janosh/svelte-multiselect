// Tests for starry-night syntax highlighter
import { starry_night, starry_night_highlighter } from '$lib/live-examples/highlighter'
import { describe, expect, test, vi } from 'vite-plus/test'

describe(`starry_night.flagToScope`, () => {
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

describe(`starry_night_highlighter`, () => {
  test(`reports missing optional starry-night peer dependency`, async () => {
    vi.resetModules()
    vi.doMock(`@wooorm/starry-night`, () => {
      throw new Error(`Cannot find package '@wooorm/starry-night'`)
    })

    await expect(import(`$lib/live-examples/highlighter`)).rejects.toThrow(
      `svelte-multiselect/live-examples requires optional peer dependency @wooorm/starry-night`,
    )

    vi.doUnmock(`@wooorm/starry-night`)
    vi.resetModules()
  })

  // All supported languages in one test.each - covers web, shell, config, programming, etc.
  test.each([
    // Web
    [`svelte`, `<div>test</div>`],
    [`html`, `<div>test</div>`],
    [`ts`, `const x: number = 1`],
    [`typescript`, `const x: number = 1`],
    [`javascript`, `const x = 1`],
    [`css`, `.class { color: red; }`],
    [`less`, `@color: red;`],
    [`scss`, `$color: red;`],
    [`json`, `{"key": "value"}`],
    [`gql`, `query { user { name } }`],
    [`graphql`, `query { user { name } }`],
    [`xml`, `<root><child/></root>`],
    [`svg`, `<svg><circle/></svg>`],
    [`php`, `<?php echo "hi"; ?>`],
    // Shell & config
    [`sh`, `echo "hello"`],
    [`bash`, `echo "hello"`],
    [`yaml`, `key: value`],
    [`ini`, `[section]\nkey=value`],
    [`makefile`, `all:\n\techo hi`],
    // Programming languages
    [`python`, `def foo(): pass`],
    [`rust`, `fn main() {}`],
    [`go`, `func main() {}`],
    [`java`, `class Foo {}`],
    [`kotlin`, `fun main() {}`],
    [`swift`, `func main() {}`],
    [`ruby`, `def foo; end`],
    [`perl`, `print "hi";`],
    [`lua`, `print("hi")`],
    [`r`, `print("hi")`],
    [`sql`, `SELECT * FROM users`],
    [`c`, `int main() {}`],
    [`c++`, `int main() {}`],
    [`cpp`, `int main() {}`],
    [`csharp`, `class Foo {}`],
    [`objc`, `@interface Foo`],
    [`vbnet`, `Module Foo`],
    // Other
    [`diff`, `+added\n-removed`],
    [`markdown`, `# Hello`],
  ])(`highlights %s code`, (lang, code) => {
    const result = starry_night_highlighter(code, lang)
    const escaped_lang = lang.replaceAll(/[+]/gu, `\\$&`)
    expect(result).toMatch(
      new RegExp(
        `^<pre class="highlight highlight-${escaped_lang}"><code>.*</code></pre>$`,
        `su`,
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
        expect(result).toMatch(/^<pre class="highlight highlight-[a-z]+"><code>/u)
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
