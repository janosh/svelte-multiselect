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

// Escape HTML special characters in text content (not for attribute values)
export const escape_html_text = (str: string): string =>
  str.replaceAll(`&`, `&amp;`).replaceAll(`<`, `&lt;`).replaceAll(`>`, `&gt;`)

// Convert HAST to HTML string
export const hast_to_html = (node: HastNode): string => {
  if (node.type === `text`) return escape_html_text(node.value ?? ``)
  if (node.type === `root`)
    return (node.children ?? []).map((child) => hast_to_html(child)).join(``)
  // Skip non-element nodes (comment, doctype, raw) - emitting them as elements
  // would produce malformed `<undefined>` tags
  if (node.type !== `element` || !node.tagName) return ``
  const { tagName, properties, children } = node
  const cls_val = properties?.className
  const cls = Array.isArray(cls_val) ? cls_val.join(` `) : undefined
  const attrs = cls ? ` class="${cls}"` : ``
  const inner = children?.map((child) => hast_to_html(child)).join(``) ?? ``
  return `<${tagName}${attrs}>${inner}</${tagName}>`
}
