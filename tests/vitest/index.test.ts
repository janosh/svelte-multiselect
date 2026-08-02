import * as lib from '$lib'
import * as attachments from '$lib/attachments'
import MultiSelect from '$lib/MultiSelect.svelte'
import { expect, test } from 'vite-plus/test'

test(`named MultiSelect export from index.ts is the component file`, () => {
  expect(lib.MultiSelect).toBe(MultiSelect)
})

test(`src/lib/index.ts does not re-export attachments`, () => {
  const attachment_names = Object.keys(attachments)
  // without this, an empty attachments module would satisfy the filter vacuously
  expect(attachment_names).toContain(`tooltip`)
  expect(attachment_names.filter((export_name) => export_name in lib)).toEqual([])
})

test(`src/lib/index.ts re-exports all Svelte components`, () => {
  const components = Object.keys(import.meta.glob(`$lib/*.svelte`)).map((path) =>
    path.split(`/`).pop()?.split(`.`).shift(),
  )
  // an empty glob would make arrayContaining([]) trivially true
  expect(components).toEqual(expect.arrayContaining([`MultiSelect`, `Toggle`, `Icon`]))
  expect(components.filter((name) => !(name && name in lib))).toEqual([])
})

// Svelte types `class` as a ClassValue, so a consumer may hand any component an array or
// an object. Interpolating that into a string renders `class="masonry [object Object]"`;
// the array form passes it to Svelte's own clsx pass, which is what resolves the object.
test(`no component interpolates a class prop into a class string`, () => {
  const sources = import.meta.glob<string>(`$lib/**/*.svelte`, {
    eager: true,
    query: `?raw`,
    import: `default`,
  })
  // an empty glob would make the filter below trivially true
  expect(Object.keys(sources).length).toBeGreaterThan(20)
  // a mustache in a quoted attribute, or a template literal
  const interpolates_class = /class=(?:"[^"]*\{[^}"]*|\{`[^`]*\$\{[^}]*)\bclass\b/u
  const offenders = Object.entries(sources)
    .filter(([, source]) => interpolates_class.test(source))
    .map(([path]) => path.split(`/`).pop())
  expect(offenders).toEqual([])
})
