// Svelte preprocessor that adds IDs to headings at build time for SSR support
// This ensures fragment navigation (#heading-id) works on initial page load

// Match headings in two contexts:
// 1. Start of line (for .svelte files with formatted HTML)
// 2. After > (for mdsvex output where HTML is on single line, e.g., "</p> <h2>")
// Avoid matching inside src={...} attributes by requiring these specific contexts
// Note: [^>]* for attributes won't match if an attribute value contains > (e.g., data-foo="a>b")
// This edge case is rare in practice and would require significantly more complex parsing
const heading_regex_line_start =
  /^(?<indent>\s*)<(?<tag>h[1-6])(?<attrs>[^>]*)>(?<inner>[\s\S]*?)<\/\k<tag>>/gimu
const heading_regex_after_tag =
  /(?<=>)(?<space>\s*)<(?<tag>h[1-6])(?<attrs>[^>]*)>(?<inner>[\s\S]*?)<\/\k<tag>>/giu

type TextInsertion = { index: number; text: string }

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
  const sorted_insertions = insertions.toSorted((left, right) => left.index - right.index)
  let source_cursor = 0
  let code = ``
  for (const insertion of sorted_insertions) {
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
        insertion_idx < sorted_insertions.length &&
        sorted_insertions[insertion_idx].index <= line_end
      ) {
        const insertion = sorted_insertions[insertion_idx]
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

// Remove Svelte expressions handling nested braces (e.g., {fn({a: 1})})
// Treats unmatched } as literal text to avoid dropping content
function strip_svelte_expressions(str: string): string {
  let result = ``
  let depth = 0
  for (const char of str) {
    if (char === `{`) depth++
    else if (char === `}` && depth > 0) depth--
    else if (depth === 0) result += char
  }
  return result
}

// Generate URL-friendly slug from text
const slugify = (text: string): string =>
  text
    .normalize(`NFC`)
    .toLowerCase()
    .replaceAll(/\s+/gu, `-`)
    .replaceAll(/[^\p{L}\p{M}\p{N}_-]/gu, ``)
    .replaceAll(/-+/gu, `-`) // collapse multiple dashes
    .replaceAll(/^-|-$/gu, ``) // trim leading/trailing dashes

/** @type {() => import('svelte/compiler').PreprocessorGroup} */
export function heading_ids() {
  return {
    name: `heading-ids`,
    markup({ content, filename }: { content: string; filename?: string }) {
      const seen_ids = new Map<string, number>()
      const processed_heading_starts = new Set<number>()
      const insertions: TextInsertion[] = []

      const get_heading_id = (attrs: string, inner: string): string | null => {
        // Skip if already has an id (use ^|\s to avoid matching data-id, aria-id, etc.)
        if (/(?:^|\s)id\s*=/u.test(attrs)) return null

        const text = strip_svelte_expressions(inner.replaceAll(/<[^>]+>/gu, ``)).trim()
        if (!text) return null

        const base_id = slugify(text)
        if (!base_id) return null

        // Handle duplicates within same file
        const count = seen_ids.get(base_id) ?? 0
        seen_ids.set(base_id, count + 1)
        return count ? `${base_id}-${count}` : base_id
      }
      const add_heading_ids = (heading_regex: RegExp): void => {
        for (const match of content.matchAll(heading_regex)) {
          const { attrs, inner, tag } = match.groups ?? {}
          if (
            match.index === undefined ||
            attrs === undefined ||
            inner === undefined ||
            !tag
          )
            continue
          const heading_start = match.index + match[0].indexOf(`<${tag}`)
          if (processed_heading_starts.has(heading_start)) continue
          const id = get_heading_id(attrs, inner)
          if (!id) continue
          processed_heading_starts.add(heading_start)
          insertions.push({
            index: heading_start + tag.length + 1,
            text: ` id="${id}"`,
          })
        }
      }

      // Pass 1 matches line starts (.svelte); pass 2 matches after tags (mdsvex output).
      add_heading_ids(heading_regex_line_start)
      add_heading_ids(heading_regex_after_tag)

      return insert_with_source_map(content, insertions, filename)
    },
  }
}

// SVG link icon for heading anchors
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

// Add anchor link to a single heading element
function add_anchor_to_heading(heading: Element, icon_svg: string = link_svg): void {
  if (heading.querySelector(`a[aria-hidden="true"]`)) return
  if (!heading.id) {
    // Generate ID from text content (fallback for dynamic headings)
    const base_id = slugify((heading.textContent ?? ``).trim())
    if (!base_id) return
    // Ensure unique ID in document (getElementById since slugs can start with a
    // digit, which querySelector rejects as an invalid CSS ID selector)
    let counter = 0
    // oxlint-disable-next-line unicorn/prefer-query-selector
    while (document.getElementById(counter ? `${base_id}-${counter}` : base_id)) counter++
    heading.id = counter ? `${base_id}-${counter}` : base_id
  }
  const anchor = document.createElement(`a`)
  anchor.href = `#${heading.id}`
  anchor.setAttribute(`aria-hidden`, `true`)
  anchor.innerHTML = icon_svg
  heading.append(anchor)
}

const is_heading = (element: Element): boolean => /^H[1-6]$/u.test(element.tagName)

const get_default_headings = (node: Element): Element[] =>
  [...node.children].flatMap((child) => [
    ...(is_heading(child) ? [child] : []),
    ...[...child.children].filter(is_heading),
  ])

// Svelte 5 attachment that adds anchor links to headings within a container
// Uses MutationObserver to handle dynamically added headings
export const heading_anchors =
  (options: HeadingAnchorsOptions = {}) =>
  (node: Element): (() => void) | undefined => {
    if (typeof document === `undefined`) return undefined

    const icon_svg = options.icon_svg ?? link_svg
    const selector = options.selector
    const get_headings = selector
      ? () => Array.from(node.querySelectorAll(selector))
      : () => get_default_headings(node)

    // Process existing headings
    for (const heading of get_headings()) {
      add_anchor_to_heading(heading, icon_svg)
    }

    // Watch for new headings - requery the container to respect nesting depth constraints
    const observer = new MutationObserver(() => {
      for (const heading of get_headings()) {
        add_anchor_to_heading(heading, icon_svg)
      }
    })
    observer.observe(node, { childList: true, subtree: true })

    return () => observer.disconnect()
  }
