<script lang="ts">
  import { type Snippet, untrack } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { hotkey } from './attachments'
  import {
    toast as default_store,
    type ToastItem,
    type ToastPosition,
    type ToastPriority,
    type ToastStore,
  } from './toast-queue.svelte.ts'

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, `children`> {
    store?: ToastStore
    position?: ToastPosition
    dismissible?: boolean
    // Hovering suspends the countdown. Focus always does, hover or not.
    pause_on_hover?: boolean
    // Moves the keyboard to the toast's own controls from anywhere on the page, since a
    // toast lives at the end of the DOM and Tab may be a long way from it. `null` opts out.
    focus_hotkey?: string | string[] | null
    // Rendered into the assertive live region, interrupting whatever is being read
    assertive?: readonly ToastPriority[]
    dismiss_label?: string
    children?: Snippet<[ToastItem]>
  }

  let {
    store = default_store,
    position = `bottom-right`,
    dismissible = true,
    pause_on_hover = true,
    // Option+T types `†` on Apple keyboards, so the shortcut is bound under both
    // spellings rather than silently doing nothing on macOS
    focus_hotkey = [`alt+t`, `alt+†`],
    assertive = [`warning`, `error`],
    dismiss_label = `Dismiss notification`,
    children,
    ...rest
  }: Props = $props()

  let stack: HTMLDivElement | null = $state(null)
  let hovered = $state(false)
  let focused = $state(false)

  const active = $derived(store.active)
  const is_assertive = $derived(active !== null && assertive.includes(active.priority))

  const sync_pause = () => {
    if (hovered || focused) store.pause()
    else store.resume()
  }
  // pause_on_hover gates entering only: a hover that got through still clears on leave
  const set_hovered = (value: boolean) => {
    if (value && !pause_on_hover) return
    hovered = value
    sync_pause()
  }
  const set_focused = (value: boolean) => {
    focused = value
    sync_pause()
  }
  // A toast promoted while the pointer or keyboard is still on the stack has no enter
  // event to pause it, so it would start counting down under a reader who never left.
  $effect(() => {
    if (active && (hovered || focused)) untrack(() => store.pause())
  })

  const bindings = $derived(
    focus_hotkey?.length
      ? [
          {
            keys: focus_hotkey,
            allow_in_inputs: true,
            handler: () => stack?.querySelector(`button`)?.focus(),
          },
        ]
      : [],
  )
  // Scoped to the stack, so Escape only dismisses when the keyboard is already in the
  // toast — a global Escape would fight every dialog on the page for the same key.
  const escape_binding = $derived(
    active ? [{ keys: `Escape`, handler: () => store.dismiss(active.id) }] : [],
  )
</script>

{#snippet toast_card(item: ToastItem)}
  {@const count = store.pending.length}
  <div class="toast" data-priority={item.priority}>
    {#if children}
      {@render children(item)}
    {:else}
      <span class="toast-message" style="min-width: 0">{item.message}</span>
    {/if}
    {#if count > 0}
      <span
        class="toast-pending"
        aria-label="{count} more {count === 1 ? `notification` : `notifications`} pending"
        >+{count}</span
      >
    {/if}
    {#if item.action}
      <button
        class="toast-action"
        type="button"
        onclick={() => store.run_action(item.id)}
      >
        {item.action.label}
      </button>
    {/if}
    {#if dismissible}
      <button
        class="toast-dismiss"
        type="button"
        aria-label={dismiss_label}
        onclick={() => store.dismiss(item.id)}>&times;</button
      >
    {/if}
  </div>
{/snippet}

<!-- Both regions stay mounted and empty rather than being created with their first
toast: a live region inserted at the same moment as its content is announced by only
some screen readers. Two of them, because swapping aria-live on one region mid-flight
is just as unreliable. -->
<div
  bind:this={stack}
  {...rest}
  class="toast-stack {rest.class ?? ``}"
  data-position={position}
  onpointerenter={() => set_hovered(true)}
  onpointerleave={() => set_hovered(false)}
  onfocusin={() => set_focused(true)}
  onfocusout={() => set_focused(false)}
  {@attach hotkey({ bindings, global: true })}
  {@attach hotkey({ bindings: escape_binding })}
>
  <div role="status" aria-live="polite" aria-atomic="true">
    {#if active && !is_assertive}
      {#key active.id}{@render toast_card(active)}{/key}
    {/if}
  </div>
  <div role="alert" aria-live="assertive" aria-atomic="true">
    {#if active && is_assertive}
      {#key active.id}{@render toast_card(active)}{/key}
    {/if}
  </div>
</div>

<style>
  .toast-stack {
    position: var(--toast-stack-position, fixed);
    z-index: var(--toast-z-index, 30);
    display: flex;
    flex-direction: column;
    gap: var(--toast-gap, 0.4em);
    max-width: var(--toast-max-width, min(90vw, 28rem));
    /* the empty region is a zero-height box, but the stack still spans the viewport
    edge, so it must not swallow presses meant for the page underneath */
    pointer-events: none;
    &[data-position^='top'] {
      top: var(--toast-inset, 1rem);
    }
    &[data-position^='bottom'] {
      bottom: var(--toast-inset, 1rem);
    }
    &[data-position$='left'] {
      left: var(--toast-inset, 1rem);
    }
    &[data-position$='right'] {
      right: var(--toast-inset, 1rem);
    }
    &[data-position$='center'] {
      left: 50%;
      transform: translateX(-50%);
    }
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--toast-item-gap, 0.6em);
    padding: var(--toast-padding, 6pt 8pt);
    border: var(--toast-border, 1px solid light-dark(lightgray, #555));
    border-left: 3px solid var(--toast-accent, transparent);
    border-radius: var(--toast-radius, 5pt);
    background: var(--toast-bg, var(--sms-options-bg, light-dark(#fff, #2a2a2e)));
    color: var(--toast-color, inherit);
    box-shadow: var(--toast-shadow, 0 3px 12px rgba(0, 0, 0, 0.3));
    font-size: var(--toast-font-size, inherit);
    overflow-wrap: anywhere;
    button {
      flex: 0 0 auto;
      padding: var(--toast-button-padding, 2pt 5pt);
      border: none;
      border-radius: 3pt;
      background: var(--toast-button-bg, rgba(255, 255, 255, 0.15));
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:hover,
    button:focus-visible {
      background: var(--toast-button-hover-bg, rgba(255, 255, 255, 0.3));
    }
    .toast-pending {
      flex: 0 0 auto;
      margin-left: auto;
      opacity: 0.7;
      font-size: 0.85em;
    }
    .toast-dismiss {
      background: none;
      font-size: 1.2em;
      line-height: 1;
    }
    &[data-priority='success'] {
      --toast-accent: var(--toast-success-color, forestgreen);
    }
    &[data-priority='warning'] {
      --toast-accent: var(--toast-warning-color, orange);
    }
    &[data-priority='error'] {
      --toast-accent: var(--toast-error-color, crimson);
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .toast {
      animation: toast-in 0.15s ease-out;
    }
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(0.4em);
    }
  }
</style>
