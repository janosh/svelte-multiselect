import changelog from '$root/changelog.md?raw'
import { compile } from 'mdsvex'

const brace_to_paren = (str: string) => str.replaceAll(`{`, `(`).replaceAll(`}`, `)`)

// Wrap HTML-entity tags like &lt;input&gt; in code spans so they render as <input>.
// Segments inside existing backticks (odd indices after splitting on `) are left
// untouched - inserting backticks there would break the code span.
const wrap_entity_tags = (str: string) =>
  str
    .split(`\``)
    .map((segment, idx) =>
      idx % 2 === 0
        ? segment.replaceAll(/&lt;[^&\n]*&gt;/gu, (tag) => `\`${tag}\``)
        : segment,
    )
    .join(`\``)

export const load = async (): Promise<{
  changelog: Awaited<ReturnType<typeof compile>>
}> => ({
  changelog: await compile(wrap_entity_tags(brace_to_paren(changelog))),
})
