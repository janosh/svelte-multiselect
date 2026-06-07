// Tests for the changelog page server load markdown transforms
import { load } from '$root/src/routes/changelog/+page.server'
import { expect, test } from 'vite-plus/test'

test(`changelog transform preserves code spans and wraps entity tags`, async () => {
  const { changelog } = await load()
  const html = changelog?.code ?? ``

  // existing code spans containing &gt; survive intact (a previous transform
  // injected backticks before every entity, splitting code spans mid-way)
  expect(html).toContain(`<code>ul.selected &gt; li</code>`)
  // bare entity tags like &lt;input&gt; get wrapped in full code spans
  expect(html).toContain(`<code>&lt;input&gt;</code>`)
  // heading levels are preserved: # Changelog stays h1, ## version headings stay h2
  expect(html).toContain(`<h1>`)
  expect(html).toMatch(/<h2[ >]/u)
  // no stray backticks leak into the rendered output
  expect(html).not.toContain(`\``)
})
