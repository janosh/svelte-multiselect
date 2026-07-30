<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { DismissConfig } from './attachments'
  import { click_outside, float, focus_trap, tabbable_selector } from './attachments'
  import { chain_handlers, type Placement } from './utils'

  // Attributes for the trigger to spread, so consumers keep their own markup
  type TriggerProps = {
    onclick?: (event: MouseEvent) => void
    onmouseenter?: (event: MouseEvent) => void
    onmouseleave?: (event: MouseEvent) => void
    onfocusin?: (event: FocusEvent) => void
    onfocusout?: (event: FocusEvent) => void
    'aria-expanded': boolean
    'aria-haspopup': `dialog`
    'aria-controls': string
  }
  type TriggerMode = `click` | `hover` | `focus`

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, `children`> {
    open?: boolean
    placement?: Placement | `auto`
    align?: `center` | `start`
    offset?: number
    padding?: number // closest the surface may come to a viewport edge
    match_width?: boolean // size the surface to the trigger, for dropdown-like menus
    // `fixed` escapes overflow: hidden ancestors but is clipped by a transformed one
    strategy?: `fixed` | `absolute`
    escape?: boolean
    dismiss_on?: DismissConfig[`dismiss_on`] // see dismiss_on_outside_press
    trap_focus?: boolean
    open_delay?: number
    close_delay?: number
    surface?: HTMLDivElement | null
    // Snippets remain owned by the component that declares them. Popover invokes the
    // trigger and body in that owner's scope; it does not retain either past teardown.
    trigger?: Snippet<[TriggerProps]>
    trigger_mode?: TriggerMode
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
    open_delay = 0,
    close_delay,
    surface = $bindable(null),
    trigger,
    trigger_mode = `click`,
    children,
    on_close,
    ...rest
  }: Props = $props()

  const surface_id = $props.id()
  let trigger_wrapper = $state<HTMLSpanElement | null>(null)
  // The wrapper is `display: contents` and has no box of its own — measuring it would
  // pin every popover to the viewport corner. Anchor to what the snippet rendered.
  const anchor = $derived(trigger_wrapper?.firstElementChild ?? trigger_wrapper)
  const resolved_close_delay = $derived(
    close_delay ?? (trigger_mode === `click` ? 0 : 150),
  )
  let open_timeout: ReturnType<typeof setTimeout> | undefined
  let close_timeout: ReturnType<typeof setTimeout> | undefined
  let pointer_inside = false
  let focus_inside = false
  let focus_open_blocked = false

  const clear_open_timeout = () => {
    clearTimeout(open_timeout)
    open_timeout = undefined
  }
  const clear_close_timeout = () => {
    clearTimeout(close_timeout)
    close_timeout = undefined
  }
  const clear_timeouts = () => {
    clear_open_timeout()
    clear_close_timeout()
  }

  const close = (via: `pointer` | `escape` | `trigger`) => {
    clear_timeouts()
    if (!open) return
    focus_open_blocked = via === `escape` && focus_inside
    pointer_inside = false
    open = false
    on_close?.({ via })
  }

  const open_after_delay = () => {
    clear_timeouts()
    if (open) return
    const scheduled_mode = trigger_mode
    open_timeout = setTimeout(() => {
      open_timeout = undefined
      if (trigger_mode === scheduled_mode) open = true
    }, open_delay)
  }
  const close_after_delay = () => {
    clear_timeouts()
    if (!open) return
    const scheduled_mode = trigger_mode
    close_timeout = setTimeout(() => {
      close_timeout = undefined
      if (trigger_mode === scheduled_mode) close(`trigger`)
    }, resolved_close_delay)
  }
  const contains_interaction_target = (target: EventTarget | null) =>
    target instanceof Node &&
    Boolean(trigger_wrapper?.contains(target) || surface?.contains(target))
  const close_if_interaction_ended = () => {
    if (focus_inside || (trigger_mode === `hover` && pointer_inside))
      clear_close_timeout()
    else close_after_delay()
  }
  const enter_pointer = () => {
    pointer_inside = true
    open_after_delay()
  }
  const leave_pointer = (event: MouseEvent) => {
    pointer_inside = contains_interaction_target(event.relatedTarget)
    close_if_interaction_ended()
  }
  const enter_focus = () => {
    focus_inside = true
    if (!focus_open_blocked) open_after_delay()
  }
  const leave_focus = (event: FocusEvent) => {
    focus_inside = contains_interaction_target(event.relatedTarget)
    if (!focus_inside) focus_open_blocked = false
    close_if_interaction_ended()
  }
  const toggle_from_click = () => {
    clear_timeouts()
    if (open) close(`trigger`)
    else open = true
  }

  const trigger_props: TriggerProps = $derived.by(() => {
    const aria = {
      'aria-expanded': open,
      'aria-haspopup': `dialog` as const,
      'aria-controls': surface_id,
    }
    if (trigger_mode === `click`) {
      // the press already went through click_outside, which counts the trigger as
      // inside — so this click toggles rather than fighting a dismissal
      return { ...aria, onclick: toggle_from_click }
    }
    const focus_handlers = {
      onfocusin: enter_focus,
      onfocusout: leave_focus,
    }
    if (trigger_mode === `focus`) return { ...aria, ...focus_handlers }
    // Hover also opens on focus so the same content remains keyboard-reachable.
    return {
      ...aria,
      ...focus_handlers,
      onmouseenter: enter_pointer,
      onmouseleave: leave_pointer,
    }
  })

  $effect(() => clear_timeouts)
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
      // Hover/focus opening must not steal focus merely because the surface appeared.
      initial: trigger_mode === `click` ? undefined : false,
      // hand the keyboard back to the trigger, not to wherever the pointer left it
      restore: trigger_wrapper?.querySelector(tabbable_selector) ?? false,
    })}
    onmouseenter={chain_handlers(
      trigger_mode === `hover` ? enter_pointer : undefined,
      rest.onmouseenter,
    )}
    onmouseleave={chain_handlers(
      trigger_mode === `hover` ? leave_pointer : undefined,
      rest.onmouseleave,
    )}
    onfocusin={chain_handlers(
      trigger_mode === `click` ? undefined : enter_focus,
      rest.onfocusin,
    )}
    onfocusout={chain_handlers(
      trigger_mode === `click` ? undefined : leave_focus,
      rest.onfocusout,
    )}
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
