import { tick } from 'svelte'
import type { PortalParams } from './types'

type PortalActionParams = PortalParams & { open: boolean }

// MultiSelect's behavior-preserving portal action. This stays separate from
// caret-based floating geometry because it owns element-width matching and
// restoration to the dropdown's original DOM position.
export function portal_action(node: HTMLElement, initial_params: PortalActionParams) {
  if (typeof globalThis.document === `undefined`) {
    return { update: () => undefined, destroy: () => undefined }
  }

  let params = initial_params
  let home_parent: ParentNode | null = null
  let home_anchor: Node | null = null

  const update_position = (): void => {
    if (!home_parent) return
    const { target_node, open, placement = `auto` } = params
    if (!target_node || !open) {
      node.hidden = true
      return
    }
    const rect = target_node.getBoundingClientRect()
    node.style.left = `${rect.left}px`
    node.style.width = `${rect.width}px`
    node.hidden = false
    const dropdown_height = node.offsetHeight
    const space_below = globalThis.innerHeight - rect.bottom
    const place_above =
      placement === `top` ||
      (placement === `auto` &&
        dropdown_height > 0 &&
        dropdown_height > space_below &&
        rect.top > space_below)
    if (place_above) {
      // oxlint-disable-next-line unicorn/prefer-number-coercion -- computed CSS lengths include units
      const margin_top = Number.parseFloat(getComputedStyle(node).marginTop) || 0
      node.style.top = `${Math.max(0, rect.top - dropdown_height - margin_top)}px`
    } else node.style.top = `${rect.bottom}px`
    node.dataset.placement = place_above ? `top` : `bottom`
  }

  const stop_tracking_viewport = () => {
    globalThis.removeEventListener(`scroll`, update_position, true)
    globalThis.removeEventListener(`resize`, update_position)
  }

  const activate = () => {
    if (home_parent || !node.isConnected) return
    home_parent = node.parentNode
    home_anchor = node.nextSibling
    document.body.append(node)
    node.style.position = `fixed`
    globalThis.addEventListener(`scroll`, update_position, true)
    globalThis.addEventListener(`resize`, update_position)
    if (params.open) void tick().then(update_position)
    else node.hidden = true
  }

  const deactivate = () => {
    if (!home_parent) return
    stop_tracking_viewport()
    // insertBefore handles missing/stale anchors; Node.before is absent from native previews.
    // oxlint-disable-next-line unicorn/prefer-modern-dom-apis
    home_parent.insertBefore(
      node,
      home_anchor?.parentNode === home_parent ? home_anchor : null,
    )
    for (const property of [`position`, `left`, `top`, `width`]) {
      node.style.removeProperty(property)
    }
    delete node.dataset.placement
    node.hidden = false
    home_parent = null
    home_anchor = null
  }

  if (initial_params.active) activate()

  return {
    update(next_params: PortalActionParams) {
      params = next_params
      if (params.active && !home_parent) activate()
      else if (!params.active && home_parent) deactivate()
      if (!home_parent) return
      if (params.open && params.target_node) void tick().then(update_position)
      else node.hidden = true
    },
    destroy() {
      if (!home_parent) return
      stop_tracking_viewport()
      node.remove()
    },
  }
}
