// Svelte preprocessor that adds IDs to headings at build time for SSR support
// This ensures fragment navigation (#heading-id) works on initial page load

// Match headings in two contexts:
// 1. Start of line (for .svelte files with formatted HTML)
// 2. After > (for mdsvex output where HTML is on single line, e.g., "</p> <h2>")
// Avoid matching inside src={...} attributes by requiring these specific contexts
// Note: [^>]* for attributes won't match if an attribute value contains > (e.g., data-foo="a>b")
// This edge case is rare in practice and would require significantly more complex parsing
const heading_regex_line_start = /^(\s*)<(h[2-6])([^>]*)>([\s\S]*?)<\/\2>/gim
const heading_regex_after_tag = /(>)(\s*)<(h[2-6])([^>]*)>([\s\S]*?)<\/\3>/gi

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
    .toLowerCase()
    .replace(/\s+/g, `-`)
    .replace(/[^\w-]/g, ``)
    .replace(/-+/g, `-`) // collapse multiple dashes
    .replace(/^-|-$/g, ``) // trim leading/trailing dashes

/** @type {() => import('svelte/compiler').PreprocessorGroup} */
export function heading_ids() {
  return {
    name: `heading-ids`,
    markup({ content }: { content: string }) {
      const seen_ids = new Map<string, number>()
      let result = content

      const process_heading = (attrs: string, inner: string): string | null => {
        // Skip if already has an id (use ^|\s to avoid matching data-id, aria-id, etc.)
        if (/(^|\s)id\s*=/.test(attrs)) return null

        const text = strip_svelte_expressions(inner.replace(/<[^>]+>/g, ``)).trim()
        if (!text) return null

        const base_id = slugify(text)
        if (!base_id) return null

        // Handle duplicates within same file
        const count = seen_ids.get(base_id) ?? 0
        seen_ids.set(base_id, count + 1)
        return count ? `${base_id}-${count}` : base_id
      }

      // Pass 1: Match headings at start of line (for .svelte files)
      result = result.replace(
        heading_regex_line_start,
        (match, indent, tag, attrs, inner) => {
          const id = process_heading(attrs, inner)
          return id ? `${indent}<${tag} id="${id}"${attrs}>${inner}</${tag}>` : match
        },
      )

      // Pass 2: Match headings after closing tag (for mdsvex single-line output)
      result = result.replace(
        heading_regex_after_tag,
        (match, gt, space, tag, attrs, inner) => {
          const id = process_heading(attrs, inner)
          return id ? `${gt}${space}<${tag} id="${id}"${attrs}>${inner}</${tag}>` : match
        },
      )

      return { code: result }
    },
  }
}

// SVG link icon for heading anchors
const link_svg =
  `<svg width="16" height="16" viewBox="0 0 16 16" aria-label="Link to heading" role="img"><path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83 0z" fill="currentColor"/></svg>`

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
    // Ensure unique ID in document
    let counter = 0
    while (document.getElementById(counter ? `${base_id}-${counter}` : base_id)) counter++
    heading.id = counter ? `${base_id}-${counter}` : base_id
  }
  const anchor = document.createElement(`a`)
  anchor.href = `#${heading.id}`
  anchor.setAttribute(`aria-hidden`, `true`)
  anchor.innerHTML = icon_svg
  heading.appendChild(anchor)
}

// Svelte 5 attachment that adds anchor links to headings within a container
// Uses MutationObserver to handle dynamically added headings
export const heading_anchors =
  (options: HeadingAnchorsOptions = {}) => (node: Element) => {
    if (typeof document === `undefined`) return

    // :scope refers to the element on which querySelectorAll is called
    // This works whether the attachment is on <main> or a parent element
    const selector = options.selector ??
      `:scope > :is(h1, h2, h3, h4, h5, h6), :scope > * > :is(h1, h2, h3, h4, h5, h6)`
    const icon_svg = options.icon_svg ?? link_svg

    // Process existing headings
    for (const heading of Array.from(node.querySelectorAll(selector))) {
      add_anchor_to_heading(heading, icon_svg)
    }

    // Watch for new headings - requery the container to respect nesting depth constraints
    const observer = new MutationObserver(() => {
      for (const heading of Array.from(node.querySelectorAll(selector))) {
        add_anchor_to_heading(heading, icon_svg)
      }
    })
    observer.observe(node, { childList: true, subtree: true })

    return () => observer.disconnect()
  }
