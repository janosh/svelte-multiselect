import changelog from '$root/changelog.md?raw'
import { compile } from 'mdsvex'

const brace_to_paren = (str: string) =>
  str.replaceAll(`{`, `(`).replaceAll(`}`, `)`)

const backticks_to_lt_gt = (str: string) =>
  str.replaceAll(`&gt;`, `\`&gt;`).replaceAll(`&lt;`, `\`&lt;`)

const section_level = (str: string) =>
  // turn 1st heading into h1
  str.replace(`###`, `#`).replaceAll(`##`, `#`)

export const load = async () => ({
  changelog: await compile(
    backticks_to_lt_gt(brace_to_paren(section_level(changelog))),
  ),
})
