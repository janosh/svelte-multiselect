// Minimal HAST-to-HTML serializer (only handles what starry-night outputs).
// Kept dependency-free so FileDetails.svelte can import it without pulling in
// the eagerly-initialized starry-night instance from highlighter.ts.

// Structural type compatible with hast Root/Element/Text from starry-night
export interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

// each replaceAll below rebuilds the whole string, and most highlighted tokens
// contain nothing to escape, so check once before doing any of that work
const HAS_ESCAPABLE = /[&<>]/u

// Escape HTML special characters in text content (not for attribute values)
export const escape_html_text = (str: string): string =>
  HAS_ESCAPABLE.test(str)
    ? str.replaceAll(`&`, `&amp;`).replaceAll(`<`, `&lt;`).replaceAll(`>`, `&gt;`)
    : str

// starry-night emits one element per token, so rather than allocate an array to
// join at each of the thousands of nodes per code block, concatenate in place
const serialize_children = (children: HastNode[] | undefined): string => {
  let html = ``
  for (const child of children ?? []) html += hast_to_html(child)
  return html
}

// Convert HAST to HTML string
export const hast_to_html = (node: HastNode): string => {
  if (node.type === `text`) return escape_html_text(node.value ?? ``)
  if (node.type === `root`) return serialize_children(node.children)
  // Skip non-element nodes (comment, doctype, raw) - emitting them as elements
  // would produce malformed `<undefined>` tags
  if (node.type !== `element` || !node.tagName) return ``
  const { tagName, properties, children } = node
  const cls_val = properties?.className
  const cls = Array.isArray(cls_val) ? cls_val.join(` `) : undefined
  const attrs = cls ? ` class="${cls}"` : ``
  return `<${tagName}${attrs}>${serialize_children(children)}</${tagName}>`
}
