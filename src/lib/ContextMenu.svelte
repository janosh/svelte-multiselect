<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { click_outside, float, focus_trap } from './attachments'
  import type { CmdAction } from './types'
  import { format_shortcut } from './utils'

  interface Props extends HTMLAttributes<HTMLMenuElement> {
    actions: CmdAction[]
    // Where the menu is open, as viewport coordinates. null while closed.
    at?: { x: number; y: number } | null
    // Region the right-click applies to. Omit and the whole document qualifies.
    children?: Snippet
    disabled?: boolean
    item?: Snippet<[{ action: CmdAction }]>
    on_select?: (action: CmdAction) => void
  }

  let {
    actions,
    at = $bindable(null),
    children,
    disabled = false,
    item,
    on_select,
    ...rest
  }: Props = $props()

  // A right-click is a zero-size anchor: the menu hangs off the pointer itself
  const anchor = $derived(at && { top: at.y, bottom: at.y, left: at.x, right: at.x })

  function open_at(event: MouseEvent) {
    if (disabled || actions.length === 0) return
    event.preventDefault() // replace the browser's own menu
    at = { x: event.clientX, y: event.clientY }
  }

  function run(action: CmdAction) {
    at = null
    action.action(action.label)
    on_select?.(action)
  }
</script>

<svelte:body oncontextmenu={children ? undefined : open_at} />

{#if children}
  <!-- svelte-ignore a11y_no_static_element_interactions -- the menu itself carries the semantics; this is only the region a right-click applies to -->
  <div oncontextmenu={open_at} style="display: contents">{@render children()}</div>
{/if}

{#if anchor}
  <menu
    role="menu"
    {...rest}
    class="context-menu {rest.class ?? ``}"
    {@attach float({ anchor, placement: `bottom`, align: `start`, padding: 8 })}
    {@attach click_outside({ escape: true, callback: () => (at = null) })}
    {@attach focus_trap()}
  >
    {#each actions as action (action.id ?? action.label)}
      <li role="none">
        <button
          type="button"
          role="menuitem"
          disabled={action.disabled}
          title={action.description}
          onclick={() => run(action)}
        >
          {#if item}
            {@render item({ action })}
          {:else}
            <span>{action.label}</span>
            {#if action.shortcut}
              <span aria-hidden="true">
                {#each format_shortcut(action.shortcut) as part, idx (idx)}
                  <kbd>{part}</kbd>
                {/each}
              </span>
            {/if}
          {/if}
        </button>
      </li>
    {/each}
  </menu>
{/if}

<style>
  .context-menu {
    z-index: var(--context-menu-z-index, 20);
    margin: 0;
    padding: var(--context-menu-padding, 3pt);
    list-style: none;
    min-width: var(--context-menu-min-width, 10rem);
    background: var(--context-menu-bg, var(--sms-options-bg, light-dark(#fff, #2a2a2e)));
    border: var(--context-menu-border, 1px solid light-dark(lightgray, #555));
    border-radius: var(--context-menu-radius, 5pt);
    box-shadow: var(--context-menu-shadow, 0 3px 12px rgba(0, 0, 0, 0.3));
    button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1em;
      width: 100%;
      padding: var(--context-menu-item-padding, 3pt 6pt);
      background: none;
      border: none;
      border-radius: 3pt;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    button:hover:not(:disabled),
    button:focus-visible {
      background: var(--context-menu-item-hover-bg, rgba(255, 255, 255, 0.15));
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    kbd {
      font-size: 0.8em;
      opacity: 0.7;
    }
  }
</style>
