export { default as CircleSpinner } from './CircleSpinner.svelte'
export { default as CmdPalette } from './CmdPalette.svelte'
export { default, default as MultiSelect } from './MultiSelect.svelte'
export * from './types'
export { default as Wiggle } from './Wiggle.svelte'

// Firefox lacks support for scrollIntoViewIfNeeded (https://caniuse.com/scrollintoviewifneeded).
// See https://github.com/janosh/svelte-multiselect/issues/87
// Polyfill copied from
// https://github.com/nuxodin/lazyfill/blob/a8e63/polyfills/Element/prototype/scrollIntoViewIfNeeded.js
// exported for testing
export function scroll_into_view_if_needed_polyfill(
  element: Element,
  centerIfNeeded: boolean = true,
) {
  const observer = new IntersectionObserver(([entry], obs) => {
    const ratio = entry.intersectionRatio
    if (ratio < 1) {
      const place = ratio <= 0 && centerIfNeeded ? `center` : `nearest`
      element.scrollIntoView({
        block: place,
        inline: place,
      })
    }
    obs.disconnect()
  })
  observer.observe(element)

  return observer // return for testing
}

if (
  typeof Element !== `undefined` &&
  !Element.prototype?.scrollIntoViewIfNeeded &&
  typeof IntersectionObserver !== `undefined`
) {
  Element.prototype.scrollIntoViewIfNeeded = function scrollIntoViewIfNeeded() {
    scroll_into_view_if_needed_polyfill(this)
  }
}
