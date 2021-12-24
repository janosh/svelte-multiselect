export function onClickOutside(
  node: HTMLElement,
  cb?: () => void
): { destroy(): void } {
  const dispatchOnClickOutside = (event: Event) => {
    const clickWasOutside = node && !node.contains(event.target as Node)

    if (clickWasOutside && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent(`clickOutside`))
      if (cb) cb()
    }
  }

  document.addEventListener(`click`, dispatchOnClickOutside)

  return {
    destroy() {
      document.removeEventListener(`click`, dispatchOnClickOutside)
    },
  }
}
