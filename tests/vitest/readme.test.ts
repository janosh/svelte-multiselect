// Keep the readme's component table honest: every component documented, every docs link
// pointing at a page and heading that exist. Checked here rather than by the link checker
// because those URLs only resolve once the site deploys.
import * as lib from '$lib'
import { exports as pkg_exports } from '$root/package.json'
import readme from '$root/readme.md?raw'
import { expect, test } from 'vite-plus/test'

const pages: Record<string, string> = import.meta.glob(
  `../../src/routes/**/+page.{md,svelte}`,
  { query: `?raw`, import: `default`, eager: true },
)

// './(demos)/(extras)/extras/+page.md' -> '/extras'
const route_sources = Object.fromEntries(
  Object.entries(pages).map(([file, source]) => [
    file
      .replace(`../../src/routes`, ``)
      .replaceAll(/\/\([^)]+\)/gu, ``)
      .replace(/\/?\+page\.(?:md|svelte)$/u, ``) || `/`,
    source,
  ]),
)

const docs_links = [
  ...readme.matchAll(
    /https:\/\/janosh\.github\.io\/svelte-widgets\/(?<route>[\w-]+)(?:#(?<anchor>[\w-]+))?/gu,
  ),
].map((match) => ({
  route: `/${match.groups?.route}`,
  anchor: match.groups?.anchor,
}))

test(`readme docs links point at pages that exist`, () => {
  expect(docs_links.length).toBeGreaterThan(15)

  for (const { route } of docs_links) {
    expect(Object.keys(route_sources), `no page for readme link ${route}`).toContain(
      route,
    )
  }
})

test(`readme docs anchors match a heading on the linked page`, () => {
  const anchored = docs_links.flatMap(({ route, anchor }) =>
    anchor ? [{ route, anchor }] : [],
  )
  expect(anchored.length).toBeGreaterThan(8)

  for (const { route, anchor } of anchored) {
    // compare on letters alone so this doesn't have to reimplement the slug rules in
    // heading_ids, which is what actually stamps the ids onto the rendered headings
    const headings = [...route_sources[route].matchAll(/^#{2,4} (?<text>.+)$/gmu)].map(
      (match) => (match.groups?.text ?? ``).replaceAll(/[^a-z0-9]/giu, ``).toLowerCase(),
    )
    expect(headings, `${route} has no heading for #${anchor}`).toContain(
      anchor.replaceAll(`-`, ``),
    )
  }
})

// the readme names which components have a subpath, and that list silently went stale
// when new subpaths were added, so tie it to the exports map rather than to prose
test(`readme names every component with a subpath export`, () => {
  const subpath_components = Object.keys(pkg_exports)
    .filter((subpath) => subpath.endsWith(`.svelte`))
    .map((subpath) => subpath.replaceAll(/^\.\/|\.svelte$/gu, ``))
  expect(subpath_components.length).toBeGreaterThan(5)

  // just the paragraph that makes the claim: every one of these names also appears in
  // the component table below, so searching the whole readme would always pass
  const intro_start = readme.indexOf(`Every component is a named export`)
  const paragraph = readme.slice(intro_start, readme.indexOf(`\n\n`, intro_start))
  expect(paragraph).toContain(`subpath import`)

  for (const name of subpath_components) {
    expect(paragraph, `${name} has a subpath export but the readme omits it`).toContain(
      `\`${name}\``,
    )
  }
})

test(`every exported component appears in the readme component table`, () => {
  const components = Object.keys(lib).filter((name) => /^[A-Z]/u.test(name))
  expect(components.length).toBeGreaterThan(15)

  for (const name of components) {
    expect(readme, `${name} is missing from the component table`).toContain(
      `| \`${name}\``,
    )
  }
})
