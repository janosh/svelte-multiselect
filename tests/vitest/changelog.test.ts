// Tests for the changelog page server load markdown transforms
import { load } from '$root/src/routes/changelog/+page.server'
import { expect, test } from 'vite-plus/test'

test(`changelog transform preserves code spans and wraps entity tags`, async () => {
  const { changelog } = await load()
  const html = changelog?.code ?? ``
  const mapped_source = changelog?.map?.sourcesContent?.[0] ?? ``

  // existing code spans containing &gt; survive intact (a previous transform
  // injected backticks before every entity, splitting code spans mid-way)
  expect(html).toContain(`<code>ul.selected &gt; li</code>`)
  // bare entity tags like &lt;input&gt; get wrapped in full code spans
  expect(html).toContain(`<code>&lt;input&gt;</code>`)
  // heading levels are preserved: # Changelog stays h1, ## version headings stay h2
  expect(html).toMatch(/<h1[ >]/u)
  expect(html).toContain(`<h2 id="v1180">`)
  expect(mapped_source).toContain(`<h2>`)
  expect(mapped_source).not.toContain(`<h2 id=`)
  // no stray backticks leak into the rendered output
  expect(html).not.toContain(`\``)
})
