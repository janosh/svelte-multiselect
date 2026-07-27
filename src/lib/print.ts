// Print one element as a document of its own: the print dialog offers no handle on the
// suggested PDF filename (it comes from document.title) or on pagination (a long element
// is chopped across sheets), so both are set up here and undone on afterprint.

export interface PrintOptions {
  // Suggested PDF filename, applied by swapping document.title for the duration of the
  // print and restoring it afterwards. Omit to leave the title alone.
  filename?: string
  // Size the page to the element instead of paginating it, so the output is a single
  // continuous sheet however long the element is.
  single_page?: boolean
  // Printed page width in mm, only used with single_page. Defaults to A4 portrait.
  page_width_mm?: number
  // Converts the measured height into the mm @page takes. 96 is the CSS definition of an
  // inch and what every engine prints at; override it where zoom scales absolute units,
  // so a rect measured there converts at the ratio actually in force.
  px_per_inch?: number
}

// `prefix-YYYY-MM-DD`, the shape most people want out of a "save as PDF" button.
export const format_print_filename = (prefix: string, date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, `0`)
  const day = String(date.getDate()).padStart(2, `0`)
  return `${prefix}-${date.getFullYear()}-${month}-${day}`
}

// Marks the element the injected rules apply to, so nothing about the caller's markup
// (a class, an id, a tag name) has to be known here.
const print_attr = `data-print-target`

export const print_element = (node: HTMLElement, options: PrintOptions = {}): void => {
  const { filename, single_page = false, page_width_mm = 210, px_per_inch = 96 } = options

  const original_title = document.title
  let style: HTMLStyleElement | null = null

  const cleanup = () => {
    document.title = original_title
    node.removeAttribute(print_attr)
    style?.remove()
  }

  // afterprint covers both outcomes: the dialog is dismissed the same way whether the
  // user saved a PDF or cancelled, and until then the swapped title has to stand.
  globalThis.addEventListener(`afterprint`, cleanup, { once: true })
  if (filename !== undefined) document.title = filename

  if (single_page) {
    node.setAttribute(print_attr, ``)
    // Measured as the element stands on screen (getBoundingClientRect flushes layout): an
    // @media print rule of the caller's own that changes it is not reflected here.
    const height_px = node.getBoundingClientRect().height
    const height_mm = Math.ceil((height_px * 25.4) / px_per_inch)

    // Ancestors are cleared as well, since a scrolling container clips the element to
    // its own height and prints only what was in view.
    style = document.createElement(`style`)
    style.textContent = `@media print {
  @page { size: ${page_width_mm}mm ${height_mm}mm; margin: 0 }
  [${print_attr}] { width: ${page_width_mm}mm !important; max-width: none !important; margin: 0 !important; box-sizing: border-box !important; box-shadow: none !important }
  html, body, [${print_attr}] { height: auto !important; max-height: none !important; overflow: visible !important }
}`
    document.head.append(style)
  }

  globalThis.print()
}
