// Tests for starry-night syntax highlighter
import { create_highlighter } from '$lib/live-examples/create-highlighter'
import { starry_night, starry_night_highlighter } from '$lib/live-examples/highlighter'
import grammar_typst from '@wooorm/starry-night/source.typst'
import grammar_latex from '@wooorm/starry-night/text.tex.latex'
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
      `svelte-widgets/live-examples requires optional peer dependency @wooorm/starry-night`,
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
    // Verify syntax highlighting produces spans, not only a wrapper.
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

describe(`create_highlighter`, () => {
  // Typst and LaTeX are outside the common bundle, mirroring the diagrams docs site
  const custom = create_highlighter([grammar_latex, grammar_typst])
  const typst_html = `<span class="pl-k">#let</span> <span class="pl-smi">x</span> <span class="pl-k">= </span><span class="pl-c1">1</span>`

  test(`highlights a language outside the common bundle`, async () => {
    expect(starry_night.flagToScope(`typ`)).toBeUndefined()
    expect(await custom.highlight(`#let x = 1`, `typ`)).toBe(typst_html)
    expect(await custom.highlight(`#let x = 1`, `TYP`)).toBe(typst_html)
    expect(await custom.highlight(`\\emph{hi}`, `tex`)).toContain(`<span class="pl-`)
  })

  test(`registers only the grammars it was given and caches the instance`, async () => {
    const instance = await custom.ready()
    expect(await custom.ready()).toBe(instance)
    expect(create_highlighter([grammar_typst])).not.toBe(custom)
    expect(instance.flagToScope(`typ`)).toBe(`source.typst`)
    // would resolve if the factory silently fell back to the common bundle
    for (const flag of [`py`, `ts`, `svelte`]) {
      expect(instance.flagToScope(flag)).toBeUndefined()
    }
  })

  test(`highlight_block wraps in the same markup as starry_night_highlighter`, async () => {
    expect(await custom.highlight_block(`#let x = 1`, `TYP`)).toBe(
      `<pre class="highlight highlight-typ"><code>${typst_html}</code></pre>`,
    )
    // unknown language falls back to escaped plain text, wrapped and unwrapped
    expect(await custom.highlight(`<a>{x}</a>`, `py`)).toBe(`&lt;a&gt;{x}&lt;/a&gt;`)
    expect(await custom.highlight_block(`<a>{x}</a>`, `py`)).toBe(
      `<pre class="highlight"><code>&lt;a&gt;&#123;x&#125;&lt;/a&gt;</code></pre>`,
    )
  })

  test(`default grammars match the eager starry_night instance`, async () => {
    const default_highlighter = create_highlighter()
    expect(await default_highlighter.highlight_block(`const x = 1`, `ts`)).toBe(
      starry_night_highlighter(`const x = 1`, `ts`),
    )
    expect((await default_highlighter.ready()).flagToScope(`svelte`)).toBe(
      `source.svelte`,
    )
  })

  test(`defers loading until first use, then reports missing peer dependency`, async () => {
    vi.resetModules()
    let load_count = 0
    vi.doMock(`@wooorm/starry-night`, () => {
      load_count += 1
      throw new Error(`Cannot find package '@wooorm/starry-night'`)
    })

    // importing the module must not touch the peer dependency, unlike highlighter.ts
    const { create_highlighter: create } = await import(
      `$lib/live-examples/create-highlighter`
    )
    const highlighter = create([grammar_typst])
    // a timer flushes every pending microtask, so an eagerly started load would show up
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(load_count).toBe(0)

    const peer_error = `svelte-widgets/live-examples requires optional peer dependency @wooorm/starry-night`
    await expect(highlighter.ready()).rejects.toThrow(peer_error)
    await expect(highlighter.highlight(`#let x = 1`, `typ`)).rejects.toThrow(peer_error)
    expect(load_count).toBe(1) // failed load is cached, not retried

    vi.doUnmock(`@wooorm/starry-night`)
    vi.resetModules()
  })
})
