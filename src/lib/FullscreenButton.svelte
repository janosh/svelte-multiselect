<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { sync_fullscreen } from './fullscreen.svelte'
  import Icon from './Icon.svelte'
  import type { IconName } from './icons'
  import { chain_handlers } from './utils'

  let {
    fullscreen = $bindable(false),
    wrapper,
    bg_css_var = `--fullscreen-bg`,
    icons = { enter: `Fullscreen`, exit: `ExitFullscreen` },
    labels = { enter: `Enter fullscreen`, exit: `Exit fullscreen` },
    on_change,
    on_request_error,
    children,
    ...rest
  }: Omit<HTMLButtonAttributes, `children`> & {
    fullscreen?: boolean
    // element to send fullscreen; omit to only toggle the flag and drive fullscreen yourself
    wrapper?: HTMLElement
    bg_css_var?: string
    icons?: { enter: IconName; exit: IconName }
    labels?: { enter: string; exit: string }
    on_change?: (fullscreen: boolean) => void
    on_request_error?: (error: unknown) => void
    children?: Snippet<[{ fullscreen: boolean }]>
  } = $props()

  const label = $derived(fullscreen ? labels.exit : labels.enter)

  // the flag is the single source of truth: clicking flips it, the effects below turn
  // that into requestFullscreen/exitFullscreen and flip it back on Esc
  sync_fullscreen({
    get_wrapper: () => wrapper,
    get_fullscreen: () => fullscreen,
    set_fullscreen: (next_fullscreen) => (fullscreen = next_fullscreen),
    get_bg_css_var: () => bg_css_var,
    on_change: (next_fullscreen) => on_change?.(next_fullscreen),
    on_request_error: (error) => on_request_error?.(error),
  })
</script>

<button
  type="button"
  title={label}
  aria-label={label}
  {...rest}
  aria-pressed={fullscreen}
  class={[`fullscreen-btn`, rest.class]}
  onclick={chain_handlers(() => (fullscreen = !fullscreen), rest.onclick)}
>
  {#if children}
    {@render children({ fullscreen })}
  {:else}
    <Icon icon={fullscreen ? icons.exit : icons.enter} />
  {/if}
</button>

<style>
  .fullscreen-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--fullscreen-btn-padding, 2pt);
    border-radius: var(--fullscreen-btn-border-radius, var(--border-radius, 3pt));
    background: var(--fullscreen-btn-bg, transparent);
    color: var(--fullscreen-btn-color, inherit);
    cursor: pointer;
    transition: background 0.2s;
  }
  .fullscreen-btn:hover,
  .fullscreen-btn:focus-visible {
    background: var(
      --fullscreen-btn-hover-bg,
      color-mix(in srgb, currentcolor 8%, transparent)
    );
  }
</style>
