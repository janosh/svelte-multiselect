<script module lang="ts">
  // Single-sheet modal chrome: one open sheet makes every other body child inert and
  // locks document scroll. Nested sheets are unsupported.
  type ModalState = {
    host: HTMLElement
    inert_attributes: Map<Element, string | null>
    overflow_value: string
    overflow_priority: string
  }

  let modal_state: ModalState | undefined

  const restore_inert = (element: Element, inert_attribute: string | null) => {
    if (inert_attribute === null) element.removeAttribute(`inert`)
    else element.setAttribute(`inert`, inert_attribute)
  }

  const activate_modal_sheet = (host: HTMLElement): (() => void) => {
    if (modal_state) {
      throw new Error(
        `Sheet does not support nested or concurrent open sheets; close the open sheet first`,
      )
    }

    const doc = host.ownerDocument
    const body_style = doc.body.style
    const inert_attributes = new Map<Element, string | null>()
    for (const sibling of doc.body.children) {
      if (sibling === host) continue
      inert_attributes.set(sibling, sibling.getAttribute(`inert`))
      sibling.setAttribute(`inert`, ``)
    }
    modal_state = {
      host,
      inert_attributes,
      overflow_value: body_style.getPropertyValue(`overflow`),
      overflow_priority: body_style.getPropertyPriority(`overflow`),
    }
    body_style.setProperty(`overflow`, `hidden`)

    return () => {
      if (modal_state?.host !== host) return
      for (const [element, inert_attribute] of modal_state.inert_attributes) {
        restore_inert(element, inert_attribute)
      }
      doc.body.style.setProperty(
        `overflow`,
        modal_state.overflow_value,
        modal_state.overflow_priority,
      )
      modal_state = undefined
    }
  }
</script>

<script lang="ts">
  import { untrack, type Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { click_outside, focus_trap, portal, tabbable_selector } from './attachments'

  type SheetSide = `top` | `right` | `bottom` | `left`
  type SheetControls = { close: () => void }
  type TriggerProps = {
    onclick: () => void
    'aria-controls': string
    'aria-expanded': boolean
    'aria-haspopup': `dialog`
  }
  type CloseVia = `pointer` | `escape` | `close`

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, `children`> {
    open?: boolean
    side?: SheetSide
    close_on_backdrop?: boolean
    close_on_escape?: boolean
    surface?: HTMLDivElement | null
    // Snippets remain owned by the declaring parent. Sheet renders them in that
    // parent's scope and only supplies stable controls; it does not retain them.
    trigger?: Snippet<[TriggerProps]>
    header?: Snippet<[SheetControls]>
    footer?: Snippet<[SheetControls]>
    children: Snippet<[SheetControls]>
    on_close?: (detail: { via: CloseVia }) => void
  }

  const generated_id = $props.id()
  let {
    open = $bindable(false),
    side = `right`,
    close_on_backdrop = true,
    close_on_escape = true,
    surface = $bindable(null),
    trigger,
    header,
    footer,
    children,
    on_close,
    id = generated_id,
    'aria-label': aria_label,
    'aria-labelledby': aria_labelledby,
    ...rest
  }: Props = $props()

  const sheet_id = $derived(id ?? generated_id)
  let trigger_wrapper = $state<HTMLSpanElement | null>(null)
  let portal_host = $state<HTMLElement | null>(null)
  const portal_target = typeof document === `undefined` ? null : document.body
  // `portal` restores its node to the source anchor on cleanup. A component teardown
  // must then remove that restored host rather than leave an empty portal behind.
  const sheet_portal = (node: Element): (() => void) | undefined => {
    const restore = portal(portal_target)(node)
    if (!restore) return undefined
    return () => {
      restore()
      node.remove()
    }
  }

  const close = (via: CloseVia) => {
    if (!open) return
    open = false
    on_close?.({ via })
  }
  const controls: SheetControls = { close: () => close(`close`) }
  const trigger_props: TriggerProps = $derived({
    onclick: () => (open = true),
    'aria-controls': sheet_id,
    'aria-expanded': open,
    'aria-haspopup': `dialog`,
  })

  $effect.pre(() => {
    if (!open || !portal_host) return
    const host = portal_host
    return untrack(() => activate_modal_sheet(host))
  })
</script>

<span bind:this={trigger_wrapper} style="display: contents">
  {@render trigger?.(trigger_props)}
</span>

<div
  bind:this={portal_host}
  class="sheet-portal"
  style="display: contents"
  {@attach sheet_portal}
>
  {#if open}
    <div class="sheet-layer">
      <div class="sheet-backdrop" aria-hidden="true"></div>
      <div
        bind:this={surface}
        {...rest}
        id={sheet_id}
        class={[`sheet`, rest.class]}
        data-side={side}
        role="dialog"
        aria-modal="true"
        aria-label={aria_label ?? (aria_labelledby ? undefined : `Sheet`)}
        aria-labelledby={aria_labelledby}
        {@attach click_outside({
          enabled: close_on_backdrop,
          inside: [trigger_wrapper],
          callback: () => close(`pointer`),
        })}
        {@attach focus_trap({
          restore: trigger_wrapper?.querySelector(tabbable_selector) ?? undefined,
          on_escape: close_on_escape ? () => close(`escape`) : undefined,
        })}
      >
        {#if header}<header>{@render header(controls)}</header>{/if}
        <div class="sheet-content">{@render children(controls)}</div>
        {#if footer}<footer>{@render footer(controls)}</footer>{/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .sheet-layer {
    position: fixed;
    z-index: var(--sheet-z-index, 50);
    inset: 0;
    isolation: isolate;
  }
  .sheet-backdrop {
    position: absolute;
    z-index: -1;
    inset: 0;
    background: var(--sheet-backdrop, rgba(0, 0, 0, 0.42));
    backdrop-filter: var(--sheet-backdrop-filter, blur(2px));
  }
  .sheet {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    max-width: 100vw;
    max-height: 100vh;
    overflow: hidden;
    border: var(--sheet-border, 1px solid light-dark(lightgray, #555));
    background: var(--sheet-bg, light-dark(#fff, #2a2a2e));
    color: var(--sheet-color, inherit);
    box-shadow: var(--sheet-shadow, 0 0 18px rgba(0, 0, 0, 0.3));
  }
  .sheet:is([data-side='right'], [data-side='left']) {
    top: 0;
    bottom: 0;
    width: var(--sheet-size, min(24rem, 100vw));
  }
  .sheet[data-side='right'] {
    right: 0;
  }
  .sheet[data-side='left'] {
    left: 0;
  }
  .sheet:is([data-side='top'], [data-side='bottom']) {
    right: 0;
    left: 0;
    height: var(--sheet-size, min(20rem, 100vh));
  }
  .sheet[data-side='top'] {
    top: 0;
  }
  .sheet[data-side='bottom'] {
    bottom: 0;
  }
  header,
  footer {
    padding: var(--sheet-section-padding, 1rem);
  }
  .sheet-content {
    flex: 1;
    padding: var(--sheet-content-padding, 1rem);
    overflow: auto;
  }
</style>
