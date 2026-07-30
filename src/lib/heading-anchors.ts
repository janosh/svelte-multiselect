// Svelte preprocessor that adds IDs to headings at build time, so fragment navigation
// (#heading-id) works on the initial SSR page load

import { SvelteSet } from 'svelte/reactivity'

// Match headings in two contexts:
// 1. Start of line (for .svelte files with formatted HTML)
// 2. After > (for mdsvex output where HTML is on single line, e.g., "</p> <h2>")
// Quoted attributes may contain `>`; only an unquoted `>` ends the opening tag.
const heading_attrs = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`
const heading_pattern = String.raw`<(?<tag>h[1-6])(?<attrs>${heading_attrs})>(?<inner>[\s\S]*?)<\/\k<tag>>`
const heading_regex_line_start = new RegExp(String.raw`^\s*${heading_pattern}`, `gimu`)
const heading_regex_after_tag = new RegExp(String.raw`(?<=>)\s*${heading_pattern}`, `giu`)
const excluded_heading_content_regex = new RegExp(
  String.raw`<!--[\s\S]*?-->|<(?<excluded_tag>pre|script|style)\b${heading_attrs}>[\s\S]*?<\/\k<excluded_tag>\s*>`,
  `giu`,
)
const heading_attr_regex =
  /(?:^|\s)(?<name>[^\s"'=<>`]+)(?:(?<equals>\s*=\s*)(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<unquoted>[^\s"'=<>`]+))?)?/gu
const html_string_expression_regex = /\{@html\s+(?<json>"(?:\\.|[^"\\])*")\s*\}/gu
const katex_annotation_regex =
  /<annotation\b[^>]*encoding="application\/x-tex"[^>]*>(?<tex>[\s\S]*?)<\/annotation>/iu
// Cheap precondition for both regexes above: no `<h1`..`<h6` means no match.
const has_heading = /<h[1-6]/iu

type TextInsertion = { index: number; text: string }
type HeadingMatch = { attrs: string; inner: string; start: number; tag: string }

const BASE64 = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`

const encode_vlq = (value: number): string => {
  let encoded = ``
  let remaining = value < 0 ? (-value << 1) | 1 : value << 1
  do {
    let digit = remaining & 31
    remaining >>>= 5
    if (remaining) digit |= 32
    encoded += BASE64[digit]
  } while (remaining)
  return encoded
}

// Apply newline-free insertions and map every unchanged span back to its exact
// original position. Inserted text maps to the insertion point.
function insert_with_source_map(
  source: string,
  insertions: TextInsertion[],
  filename = `source.svelte`,
) {
  let source_cursor = 0
  let code = ``
  for (const insertion of insertions) {
    if (
      insertion.index < source_cursor ||
      insertion.index > source.length ||
      insertion.text.includes(`\n`)
    ) {
      throw new RangeError(`heading_ids: invalid insertion at ${insertion.index}`)
    }
    code += source.slice(source_cursor, insertion.index) + insertion.text
    source_cursor = insertion.index
  }
  code += source.slice(source_cursor)

  let insertion_idx = 0
  let original_offset = 0
  let previous_original_line = 0
  let previous_original_column = 0
  const mappings = source
    .split(`\n`)
    .map((line, original_line) => {
      const segments: [generated_column: number, original_column: number][] = [[0, 0]]
      const line_end = original_offset + line.length
      let inserted_columns = 0
      while (
        insertion_idx < insertions.length &&
        insertions[insertion_idx].index <= line_end
      ) {
        const insertion = insertions[insertion_idx]
        const original_column = insertion.index - original_offset
        const generated_column = original_column + inserted_columns
        segments.push(
          [generated_column, original_column],
          [generated_column + insertion.text.length, original_column],
        )
        inserted_columns += insertion.text.length
        insertion_idx++
      }
      const generated_line_end = line.length + inserted_columns
      if (inserted_columns && segments.at(-1)?.[0] !== generated_line_end)
        segments.push([generated_line_end, line.length])
      original_offset = line_end + 1
      let previous_generated_column = 0
      return segments
        .map(([generated_column, original_column]) => {
          const mapping = [
            generated_column - previous_generated_column,
            0,
            original_line - previous_original_line,
            original_column - previous_original_column,
          ]
            .map(encode_vlq)
            .join(``)
          previous_generated_column = generated_column
          previous_original_line = original_line
          previous_original_column = original_column
          return mapping
        })
        .join(`,`)
    })
    .join(`;`)

  return {
    code,
    map: {
      version: 3,
      names: [],
      sources: [filename],
      sourcesContent: [source],
      mappings,
    },
  }
}

function find_svelte_expression_end(str: string, start: number): number {
  let depth = 0
  let quote: string | null = null
  let escaped = false
  for (let idx = start; idx < str.length; idx++) {
    const char = str[idx]
    if (quote) {
      if (escaped) escaped = false
      else if (char === `\\`) escaped = true
      else if (char === quote) quote = null
    } else if (char === `"` || char === `'` || char === `\``) quote = char
    else if (char === `{`) depth++
    else if (char === `}` && --depth === 0) return idx
  }
  return -1
}

// Remove Svelte expressions while ignoring braces inside quoted JS strings.
// Unmatched } remains literal; unmatched { consumes the remaining text as before.
function strip_svelte_expressions(str: string): string {
  if (!str.includes(`{`)) return str
  let result = ``
  for (let idx = 0; idx < str.length; idx++) {
    if (str[idx] !== `{`) {
      result += str[idx]
      continue
    }
    const expression_end = find_svelte_expression_end(str, idx)
    if (expression_end === -1) break
    idx = expression_end
  }
  return result
}

// Remove Svelte attribute expressions but preserve braces inside quoted HTML attributes.
const without_attr_expressions = (attrs: string): string => {
  let result = ``
  let quote: string | null = null
  for (let idx = 0; idx < attrs.length; idx++) {
    const char = attrs[idx]
    if (quote) {
      result += char
      if (char === quote) quote = null
    } else if (char === `"` || char === `'`) {
      quote = char
      result += char
    } else if (char === `{`) {
      const expression_end = find_svelte_expression_end(attrs, idx)
      if (expression_end === -1) return result + attrs.slice(idx)
      result += `{}`
      idx = expression_end
    } else result += char
  }
  return result
}

const get_heading_id_attr = (attrs: string): string | undefined => {
  for (const match of without_attr_expressions(attrs).matchAll(heading_attr_regex)) {
    const { double, equals, name, single, unquoted } = match.groups ?? {}
    if (name?.toLowerCase() !== `id` || equals === undefined) continue
    return double ?? single ?? unquoted ?? ``
  }
  return undefined
}

const extract_math_sources = (inner: string): string =>
  inner.replaceAll(html_string_expression_regex, (expression, json: string) => {
    let html: unknown
    try {
      html = JSON.parse(json)
    } catch {
      return expression
    }
    if (typeof html !== `string`) return expression
    const tex = katex_annotation_regex.exec(html)?.groups?.tex
    return (
      tex
        ?.replaceAll(`&lt;`, `<`)
        .replaceAll(`&gt;`, `>`)
        .replaceAll(`&amp;`, `&`)
        .replaceAll(/[{}]/gu, ``) ?? expression
    )
  })

// Preserve Unicode letters and marks, normalize equivalent spellings to NFC, and turn
// punctuation runs into separators so distinct headings do not collapse to the same slug.
export const slugify_heading = (text: string): string =>
  text
    .toLowerCase()
    .normalize(`NFC`)
    // Collapse punctuation and whitespace runs into separators so `foo.bar` cannot
    // collide with `foobar`, while retaining Unicode letters, marks, and numbers.
    .replaceAll(/[^\p{L}\p{M}\p{N}_]+/gu, `-`)
    .replaceAll(/^-|-$/gu, ``) // trim leading/trailing dashes

// Allocate and reserve an ID in one operation. All heading-ID producers share this
// `-1`, `-2`, ... collision policy, including collisions with already suffixed slugs.
export function unique_heading_id(base_id: string, used_ids: Set<string>): string {
  const base = base_id || `section`
  let id = base
  let suffix = 1
  while (used_ids.has(id)) id = `${base}-${suffix++}`
  used_ids.add(id)
  return id
}

export function heading_ids() {
  return {
    name: `heading-ids`,
    markup({ content, filename }: { content: string; filename?: string }) {
      const used_ids = new SvelteSet<string>()
      const insertions: TextInsertion[] = []

      const get_heading_id = (inner: string): string | null => {
        const text = strip_svelte_expressions(
          extract_math_sources(inner).replaceAll(/<[^>]+>/gu, ``),
        ).trim()
        if (!text) return null

        const base_id = slugify_heading(text)
        if (!base_id) return null
        return unique_heading_id(base_id, used_ids)
      }
      const heading_matches: HeadingMatch[] = []
      const seen_heading_starts = new SvelteSet<number>()
      const collect_heading_matches = (heading_regex: RegExp): void => {
        for (const match of content.matchAll(heading_regex)) {
          if (match.index === undefined || !match.groups) continue
          const { attrs, inner, tag } = match.groups
          if (attrs === undefined || inner === undefined || !tag) continue
          const heading_start = match.index + match[0].indexOf(`<${tag}`)
          if (seen_heading_starts.has(heading_start)) continue
          seen_heading_starts.add(heading_start)
          heading_matches.push({ attrs, inner, start: heading_start, tag })
        }
      }

      // both passes scan the whole file, so skip them when there is no heading
      if (has_heading.test(content)) {
        collect_heading_matches(heading_regex_line_start)
        collect_heading_matches(heading_regex_after_tag)
        const excluded_ranges = Array.from(
          content.matchAll(excluded_heading_content_regex),
          (match) => ({
            end: match.index + match[0].length,
            start: match.index,
            tag: match.groups?.excluded_tag?.toLowerCase() ?? null,
          }),
        )
        const ordered_heading_matches = heading_matches
          .map((match) => ({
            ...match,
            excluded_by: excluded_ranges.find(
              ({ end, start }) => match.start >= start && match.start < end,
            )?.tag,
            existing_id: get_heading_id_attr(match.attrs),
          }))
          .toSorted((left, right) => left.start - right.start)
        // Reserve explicit IDs before generating any automatic ones, including IDs that
        // appear later in source order, because explicit author choices take precedence.
        for (const { excluded_by, existing_id } of ordered_heading_matches) {
          // A heading inside <pre> still creates a real DOM ID. Comments, script, and style
          // contents do not, so reserving their source-only IDs would create false collisions.
          if (excluded_by !== undefined && excluded_by !== `pre`) continue
          if (existing_id) used_ids.add(existing_id)
        }
        for (const {
          excluded_by,
          existing_id,
          inner,
          start,
          tag,
        } of ordered_heading_matches) {
          if (excluded_by !== undefined || existing_id !== undefined) continue
          const id = get_heading_id(inner)
          if (!id) continue
          insertions.push({
            index: start + tag.length + 1,
            text: ` id="${id}"`,
          })
        }
      }

      return insert_with_source_map(content, insertions, filename)
    },
  }
}

const link_svg = `<svg width="16" height="16" viewBox="0 0 16 16" aria-label="Link to heading" role="img"><path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0z" fill="currentColor"/></svg>`

export interface HeadingAnchorsOptions {
  // CSS selector for headings (default: h1-h6 direct or 2nd-level children of attached node)
  selector?: string
  // Custom SVG icon HTML string (default: link icon)
  // WARNING: Assigned via innerHTML - only pass trusted/sanitized content
  // For untrusted input, sanitize first or use DOMParser:
  // new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
  icon_svg?: string
}

function add_anchor_to_heading(
  heading: Element,
  get_used_ids: () => Set<string>,
  icon_svg: string,
): void {
  if (heading.querySelector(`a[aria-hidden="true"]`)) return
  if (!heading.id) {
    // Generate ID from text content (fallback for dynamic headings)
    const base_id = slugify_heading((heading.textContent ?? ``).trim())
    if (!base_id) return
    heading.id = unique_heading_id(base_id, get_used_ids())
  }
  const anchor = document.createElement(`a`)
  anchor.href = `#${heading.id}`
  anchor.setAttribute(`aria-hidden`, `true`)
  anchor.innerHTML = icon_svg
  heading.append(anchor)
}

const is_heading = (element: Element): boolean => /^H[1-6]$/u.test(element.tagName)

const get_default_headings = (node: Element): Element[] =>
  [...node.children].flatMap((child) => [child, ...child.children].filter(is_heading))

// Svelte 5 attachment that adds anchor links to headings within a container
export const heading_anchors =
  (options: HeadingAnchorsOptions = {}) =>
  (node: Element): (() => void) | undefined => {
    if (typeof document === `undefined`) return undefined

    const icon_svg = options.icon_svg ?? link_svg
    const selector = options.selector
    const get_headings = selector
      ? () => Array.from(node.querySelectorAll(selector))
      : () => get_default_headings(node)
    const add_anchors = () => {
      let used_ids: Set<string> | undefined
      const get_used_ids = () =>
        (used_ids ??= new SvelteSet(
          Array.from(document.querySelectorAll<HTMLElement>(`[id]`), ({ id }) => id),
        ))
      for (const heading of get_headings()) {
        add_anchor_to_heading(heading, get_used_ids, icon_svg)
      }
    }
    add_anchors()

    // Watch for new headings - requery the container to respect nesting depth constraints
    const observer = new MutationObserver(() => {
      add_anchors()
      observer.takeRecords()
    })
    observer.observe(node, { childList: true, subtree: true })

    return () => observer.disconnect()
  }
