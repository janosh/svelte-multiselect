// Keep the readme's component table honest: every component documented, every docs link
// pointing at a page and heading that exist. Checked here rather than by the link checker
// because those URLs only resolve once the site deploys. Same for the links the demo
// pages make to each other, which only the prerender would otherwise catch.
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

// compare on letters and digits alone so these checks don't have to reimplement the slug
// rules in heading_ids, which is what actually stamps the ids onto the rendered headings
const bare = (text: string) => text.replaceAll(/[^a-z0-9]/giu, ``).toLowerCase()

const headings_on = (route: string) =>
  [...(route_sources[route] ?? ``).matchAll(/^#{2,4} (?<text>.+)$/gmu)].map((match) =>
    bare(match.groups?.text ?? ``),
  )

// null when the link resolves, else why it doesn't, so a run reports every bad link
const unresolved = (route: string, anchor: string | undefined, label: string) => {
  if (!(route in route_sources)) return `${label}: no such page ${route}`
  if (anchor && !headings_on(route).includes(bare(anchor))) {
    return `${label}: ${route} has no heading for #${anchor}`
  }
  return null
}

// in-site markdown links on the demo pages, i.e. everything but `https:`, `mailto:` etc.
const page_links = Object.entries(route_sources)
  .flatMap(([from, source]) =>
    [...source.matchAll(/\[[^\]]*\]\((?<target>[^)\s]+)\)/gu)].map((match) => ({
      from,
      target: match.groups?.target ?? ``,
    })),
  )
  .filter(({ target }) => !/^[a-z]+:/u.test(target))

test(`demo pages link each other with base-relative paths`, () => {
  expect(page_links.length).toBeGreaterThan(10)

  // a leading slash drops the paths.base prefix, which 404s the prerender under the
  // /svelte-widgets base path the site deploys to
  const absolute = page_links.filter(({ target }) => target.startsWith(`/`))
  expect(absolute, `use e.g. attachments#tooltip, not /attachments#tooltip`).toEqual([])
})

test(`demo page links point at a page and heading that exist`, () => {
  const failures = page_links.flatMap(({ from, target }) => {
    const [page, anchor] = target.split(`#`)
    return unresolved(page ? `/${page}` : from, anchor, `${from} link ${target}`) ?? []
  })
  expect(failures).toEqual([])
})

const docs_links = [
  ...readme.matchAll(
    /https:\/\/janosh\.github\.io\/svelte-widgets\/(?<route>[\w-]+)(?:#(?<anchor>[\w-]+))?/gu,
  ),
].map((match) => ({
  route: `/${match.groups?.route}`,
  anchor: match.groups?.anchor,
}))

test(`readme docs links point at a page and heading that exist`, () => {
  expect(docs_links.length).toBeGreaterThan(15)
  expect(docs_links.filter(({ anchor }) => anchor).length).toBeGreaterThan(8)

  const failures = docs_links.flatMap(
    ({ route, anchor }) => unresolved(route, anchor, `readme link`) ?? [],
  )
  expect(failures).toEqual([])
})

// The readme promises every component has a subpath, which only holds while the exports
// map keeps the wildcard. Narrowing it back to a hand-listed set would make the promise
// false for whatever the list left out, silently — an earlier enumerated list did exactly
// that, gaining three subpaths without the prose noticing.
test(`the exports map keeps the wildcard the readme's subpath promise rests on`, () => {
  const component_subpaths = Object.keys(pkg_exports).filter((subpath) =>
    subpath.endsWith(`.svelte`),
  )
  expect(component_subpaths).toEqual([`./*.svelte`])

  const intro_start = readme.indexOf(`Every component is a named export`)
  const paragraph = readme.slice(intro_start, readme.indexOf(`\n\n`, intro_start))
  expect(paragraph).toContain(`every one also has a direct`)
  expect(paragraph).toContain(`subpath import`)
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
