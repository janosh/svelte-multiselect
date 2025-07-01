import type { Option, OptionStyle } from './types'

// Get the label key from an option object or the option itself
// if it's a string or number
export const get_label = (opt: Option) => {
  if (opt instanceof Object) {
    if (opt.label === undefined) {
      const opt_str = JSON.stringify(opt)
      console.error(`MultiSelect option ${opt_str} is an object but has no label key`)
    }
    return opt.label
  }
  return `${opt}`
}

// This function is used extract CSS strings from a {selected, option} style
// object to be used in the style attribute of the option.
// If the style is a string, it will be returned as is
export function get_style(
  option: { style?: OptionStyle; [key: string]: unknown } | string | number,
  key: `selected` | `option` | null = null,
) {
  let css_str = ``
  if (![`selected`, `option`, null].includes(key)) {
    console.error(`MultiSelect: Invalid key=${key} for get_style`)
  }
  if (typeof option === `object` && option.style) {
    if (typeof option.style === `string`) {
      css_str = option.style
    }
    if (typeof option.style === `object`) {
      if (key && key in option.style) return option.style[key] ?? ``
      else {
        console.error(
          `Invalid style object for option=${JSON.stringify(option)}`,
        )
      }
    }
  }
  // ensure css_str ends with a semicolon
  if (css_str.trim() && !css_str.trim().endsWith(`;`)) css_str += `;`
  return css_str
}

// Highlights text nodes that matching the string query
export function highlight_matching_nodes(
  element: HTMLElement, // parent element
  query?: string, // search query
  noMatchingOptionsMsg?: string, // text for empty node
) {
  if (typeof CSS === `undefined` || !CSS.highlights || !query) return // abort if CSS highlight API not supported

  // clear previous ranges from HighlightRegistry
  CSS.highlights.clear()

  const tree_walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // don't highlight text in the "no matching options" message
      if (node?.textContent === noMatchingOptionsMsg) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const text_nodes: Node[] = []
  let current_node = tree_walker.nextNode()
  while (current_node) {
    text_nodes.push(current_node)
    current_node = tree_walker.nextNode()
  }

  // iterate over all text nodes and find matches
  const ranges = text_nodes.map((el) => {
    const text = el.textContent?.toLowerCase()
    const indices = []
    let start_pos = 0
    while (text && start_pos < text.length) {
      const index = text.indexOf(query, start_pos)
      if (index === -1) break
      indices.push(index)
      start_pos = index + query.length
    }

    // create range object for each str found in the text node
    return indices.map((index) => {
      const range = new Range()
      range.setStart(el, index)
      range.setEnd(el, index + query.length)
      return range
    })
  })

  // create Highlight object from ranges and add to registry
  CSS.highlights.set(`sms-search-matches`, new Highlight(...ranges.flat()))
}
