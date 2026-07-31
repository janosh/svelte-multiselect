<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLDialogAttributes } from 'svelte/elements'
  import { backdrop_dismiss, focus_trap, tabbable_selector } from './attachments'
  import { chain_handlers } from './utils'

  type SheetSide = `top` | `right` | `bottom` | `left`
  type SheetControls = { close: () => void }
  type TriggerProps = {
    onclick: () => void
    'aria-controls': string | undefined
    'aria-expanded': boolean
    'aria-haspopup': `dialog`
  }
  type CloseVia = `pointer` | `escape` | `close`

  interface Props extends Omit<HTMLDialogAttributes, `children`> {
    open?: boolean
    side?: SheetSide
    close_on_backdrop?: boolean
    close_on_escape?: boolean
    surface?: HTMLDialogElement | null
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
    id,
    'aria-label': aria_label,
    'aria-labelledby': aria_labelledby,
    ...rest
  }: Props = $props()

  const sheet_id = $derived(id ?? generated_id)
  let trigger_wrapper = $state<HTMLSpanElement | null>(null)

  const close = (via: CloseVia) => {
    if (!open) return
    open = false
    on_close?.({ via })
  }
  const controls: SheetControls = { close: () => close(`close`) }
  const trigger_props: TriggerProps = $derived({
    onclick: () => (open = true),
    'aria-controls': open ? sheet_id : undefined,
    'aria-expanded': open,
    'aria-haspopup': `dialog`,
  })

  const handle_cancel = (event: Event) => {
    if (close_on_escape) close(`escape`)
    else event.preventDefault()
  }

  $effect(() => {
    if (surface && !surface.open) surface.showModal()
  })
</script>

<span bind:this={trigger_wrapper} style="display: contents">
  {@render trigger?.(trigger_props)}
</span>

{#if open}
  <dialog
    bind:this={surface}
    {...rest}
    id={sheet_id}
    class={[`sheet`, rest.class]}
    data-side={side}
    aria-label={aria_label ?? (aria_labelledby ? undefined : `Sheet`)}
    aria-labelledby={aria_labelledby}
    {@attach backdrop_dismiss(() => close_on_backdrop && close(`pointer`))}
    {@attach focus_trap({
      restore: trigger_wrapper?.querySelector(tabbable_selector) ?? undefined,
    })}
    oncancel={chain_handlers(handle_cancel, rest.oncancel)}
    onclose={chain_handlers(() => close(`close`), rest.onclose)}
  >
    {#if header}<header>{@render header(controls)}</header>{/if}
    <div class="sheet-content">{@render children(controls)}</div>
    {#if footer}<footer>{@render footer(controls)}</footer>{/if}
  </dialog>
{/if}

<style>
  :global(:root:has(dialog.sheet[open])) {
    overflow: hidden;
  }
  .sheet:not([open]) {
    display: none;
  }
  .sheet {
    position: fixed;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    inset: auto;
    margin: 0;
    padding: 0;
    width: auto;
    height: auto;
    max-width: 100vw;
    max-height: 100vh;
    overflow: hidden;
    border: var(--sheet-border, 1px solid light-dark(lightgray, #555));
    background: var(--sheet-bg, light-dark(#fff, #2a2a2e));
    color: var(--sheet-color, inherit);
    box-shadow: var(--sheet-shadow, 0 0 18px rgba(0, 0, 0, 0.3));
  }
  .sheet::backdrop {
    background: var(--sheet-backdrop, rgba(0, 0, 0, 0.42));
    backdrop-filter: var(--sheet-backdrop-filter, blur(2px));
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
