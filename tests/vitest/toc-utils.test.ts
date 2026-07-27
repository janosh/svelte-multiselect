import { get_heading_visibility, slugify_heading_text, unique_id } from '$lib/toc-utils'
import { expect, test } from 'vite-plus/test'

test.each([
  [`Hello, World!`, `hello-world`],
  [`  Déjà vu / Svelte 5  `, `deja-vu-svelte-5`],
  [`---`, ``],
])(`slugify_heading_text(%j) -> %j`, (input, expected) => {
  expect(slugify_heading_text(input)).toBe(expected)
})

test.each([
  [`intro`, [`intro`, `intro-2`], `intro-3`],
  [``, [`section`], `section-2`],
])(`unique_id(%j) -> %j`, (base_id, used_ids, expected) => {
  expect(unique_id(base_id, new Set(used_ids))).toBe(expected)
})

// h2, h3, h4, h4, h3, h4, h2, h3
const nested_levels = [2, 3, 4, 4, 3, 4, 2, 3]

test.each([
  [`empty`, [], -1, 6, []],
  // Toc reaches this via headings.indexOf(activeHeading) === -1: collapsing is on but
  // no heading is active, so only the top-level ones stay visible
  [
    `active heading not found`,
    nested_levels,
    -1,
    3,
    [true, false, false, false, false, false, true, false],
  ],
  [`inactive`, nested_levels, null, 6, nested_levels.map(() => true)],
  [`active h4`, nested_levels, 2, 6, [true, true, true, true, true, false, true, false]],
  [
    `h3 threshold`,
    nested_levels,
    0,
    3,
    [true, true, true, true, true, true, true, false],
  ],
] as const)(
  `get_heading_visibility %s keeps expected headings visible`,
  (_, levels, active_idx, collapse_threshold, expected) => {
    expect(get_heading_visibility(levels, active_idx, collapse_threshold)).toEqual(
      expected,
    )
  },
)
