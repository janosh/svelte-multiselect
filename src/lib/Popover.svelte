<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { DismissConfig } from './attachments'
  import { click_outside, float, focus_trap, tabbable_selector } from './attachments'
  import { get_uuid, type Placement } from './utils'

  // Attributes for the trigger to spread, so consumers keep their own markup
  type TriggerProps = {
    onclick: (event: MouseEvent) => void
    'aria-expanded': boolean
    'aria-haspopup': `dialog`
    'aria-controls': string
  }

  interface Props extends HTMLAttributes<HTMLDivElement> {
    open?: boolean
    placement?: Placement | `auto`
    align?: `center` | `start`
    offset?: number
    padding?: number // closest the surface may come to a viewport edge
    match_width?: boolean // size the surface to the trigger, for dropdown-like menus
    // `fixed` escapes overflow: hidden ancestors but is clipped by a transformed one
    strategy?: `fixed` | `absolute`
    escape?: boolean
    dismiss_on?: DismissConfig[`dismiss_on`] // `release`: pan-behind / no-click trigger
    trap_focus?: boolean
    surface?: HTMLDivElement | null
    trigger?: Snippet<[TriggerProps]>
    children: Snippet
    on_close?: (detail: { via: `pointer` | `escape` | `trigger` }) => void
  }

  let {
    open = $bindable(false),
    placement = `bottom`,
    align = `center`,
    offset = 8,
    padding = 8,
    match_width = false,
    strategy = `fixed`,
    escape = true,
    dismiss_on = `press`,
    trap_focus = true,
    surface = $bindable(null),
    trigger,
    children,
    on_close,
    ...rest
  }: Props = $props()

  const surface_id = `popover-${get_uuid()}`
  let trigger_wrapper = $state<HTMLSpanElement | null>(null)
  // The wrapper is `display: contents` and has no box of its own — measuring it would
  // pin every popover to the viewport corner. Anchor to what the snippet rendered.
  const anchor = $derived(trigger_wrapper?.firstElementChild ?? trigger_wrapper)

  const close = (via: `pointer` | `escape` | `trigger`) => {
    open = false
    on_close?.({ via })
  }

  const trigger_props: TriggerProps = $derived({
    // the press already went through click_outside, which counts the trigger as
    // inside — so this click toggles rather than fighting a dismissal
    onclick: () => (open ? close(`trigger`) : (open = true)),
    'aria-expanded': open,
    'aria-haspopup': `dialog`,
    'aria-controls': surface_id,
  })
</script>

<span bind:this={trigger_wrapper} style="display: contents">
  {@render trigger?.(trigger_props)}
</span>

{#if open}
  <div
    bind:this={surface}
    role="dialog"
    {...rest}
    id={surface_id}
    class={[`popover`, rest.class]}
    {@attach float({ anchor, placement, align, offset, padding, match_width, strategy })}
    {@attach click_outside({
      inside: [trigger_wrapper],
      escape,
      dismiss_on,
      callback: (_node, _config, { via }) => close(via),
    })}
    {@attach focus_trap({
      enabled: trap_focus,
      // hand the keyboard back to the trigger, not to wherever the pointer left it
      restore: trigger_wrapper?.querySelector(tabbable_selector) ?? false,
    })}
  >
    {@render children()}
  </div>
{/if}

<style>
  .popover {
    z-index: var(--popover-z-index, 10);
    background: var(--popover-bg, var(--sms-options-bg, light-dark(#fff, #2a2a2e)));
    color: var(--popover-color, inherit);
    border: var(--popover-border, 1px solid light-dark(lightgray, #555));
    border-radius: var(--popover-radius, 5pt);
    padding: var(--popover-padding, 6pt 8pt);
    box-shadow: var(--popover-shadow, 0 3px 12px rgba(0, 0, 0, 0.3));
    max-width: var(--popover-max-width, min(90vw, 30rem));
  }
</style>
