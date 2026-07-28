export * from './heading-anchors'
export { default as ButtonGroup } from './ButtonGroup.svelte'
export { default as CircleSpinner } from './CircleSpinner.svelte'
export { default as CommandMenu } from './CommandMenu.svelte'
export { default as ConfirmDialog } from './ConfirmDialog.svelte'
export { default as ContextMenu } from './ContextMenu.svelte'
export { default as ContributorList } from './ContributorList.svelte'
export { default as Popover } from './Popover.svelte'
export { default as PageSearch } from './PageSearch.svelte'
export { default as CodeExample } from './CodeExample.svelte'
export { default as CopyButton } from './CopyButton.svelte'
export { default as DraggablePane } from './DraggablePane.svelte'
export { default as FileDetails } from './FileDetails.svelte'
export { default as Footer } from './Footer.svelte'
export { default as FullscreenButton } from './FullscreenButton.svelte'
export { default as GitHubCorner } from './GitHubCorner.svelte'
export { default as Icon } from './Icon.svelte'
export { icon_data, type IconName } from './icons'
export { default as LiteYouTubeEmbed } from './LiteYouTubeEmbed.svelte'
export { default as Masonry } from './Masonry.svelte'
export { default, default as MultiSelect } from './MultiSelect.svelte'
export { default as Nav } from './Nav.svelte'
export { default as PrevNext } from './PrevNext.svelte'
export { default as SubpageGrid } from './SubpageGrid.svelte'
export { default as Toast } from './Toast.svelte'
export { default as Toc } from './Toc.svelte'
export { default as Toggle } from './Toggle.svelte'
export { default as ThemeToggle } from './ThemeToggle.svelte'
export type * from './types'
export * from './utils'
export { default as Wiggle } from './Wiggle.svelte'

// Firefox lacks support for scrollIntoViewIfNeeded (https://caniuse.com/scrollintoviewifneeded).
// See https://github.com/janosh/svelte-widgets/issues/87
// Polyfill copied from
// https://github.com/nuxodin/lazyfill/blob/a8e63/polyfills/Element/prototype/scrollIntoViewIfNeeded.js
export function scroll_into_view_if_needed_polyfill(
  element: Element,
  centerIfNeeded: boolean = true,
): IntersectionObserver {
  const observer = new IntersectionObserver(([entry], obs) => {
    obs.disconnect()
    const ratio = entry.intersectionRatio
    if (ratio >= 1) return
    const place = ratio <= 0 && centerIfNeeded ? `center` : `nearest`
    element.scrollIntoView({ block: place, inline: place })
  })
  observer.observe(element)

  return observer
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
