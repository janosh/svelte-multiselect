/**
 * Highlights text nodes that matching the string query
 * @param element Parent element
 * @param query Search query
 * @param noMatchingOptionsMsg Text for empty node
 */
export function highlight_matching_nodes(element: HTMLElement, query?: string, noMatchingOptionsMsg?: string) {
  if (typeof CSS == `undefined` || !CSS.highlights || !query) return // abort if CSS highlight API not supported

  // clear previous ranges from HighlightRegistry
  CSS.highlights.clear()

  const tree_walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // don't highlight text in the "no matching options" message
        if (node?.textContent === noMatchingOptionsMsg)
          return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )
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
