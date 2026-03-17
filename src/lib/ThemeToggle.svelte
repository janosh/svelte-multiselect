<script lang="ts">
  import { onMount } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { tooltip, type TooltipOptions } from './attachments'
  import Icon from './Icon.svelte'

  type ThemeMode = `light` | `dark` | `system`

  let { tooltip: tooltip_opts = {}, ...rest }: HTMLAttributes<HTMLButtonElement> & {
    tooltip?: TooltipOptions | false
  } = $props()

  const system_preference = (): `light` | `dark` =>
    matchMedia(`(prefers-color-scheme: dark)`).matches ? `dark` : `light`

  const resolve_theme_mode = (): ThemeMode => {
    try {
      const saved = localStorage.getItem(`theme`) ??
        localStorage.getItem(`theme_mode`)
      if (saved === `light` || saved === `dark` || saved === `system`) return saved
    } catch {
      console.error(`Failed to get theme mode from localStorage`)
    }
    return `system`
  }

  let theme_mode: ThemeMode = $state(`system`)
  let is_hydrated = $state(false)

  const mode_cycle = { light: `system`, system: `dark`, dark: `light` } as const
  const mode_icons = { light: `Sun`, dark: `Moon`, system: `Monitor` } as const
  const mode_labels = {
    light: `light`,
    dark: `dark`,
    system: `system (auto)`,
  } as const
  let next_mode = $derived(mode_cycle[theme_mode])
  let title = $derived(`Switch to ${mode_labels[next_mode]} theme`)

  const apply_theme_mode = (mode: ThemeMode): void => {
    theme_mode = mode
    const effective = mode === `system` ? system_preference() : mode
    document.documentElement.style.colorScheme = effective
    document.documentElement.dataset.theme = effective
    try {
      localStorage.setItem(`theme`, mode)
    } catch {
      console.error(`Failed to set theme mode in localStorage`)
    }
  }

  onMount(() => {
    apply_theme_mode(resolve_theme_mode())
    is_hydrated = true

    const mql = matchMedia(`(prefers-color-scheme: dark)`)
    const on_change = () => {
      if (theme_mode === `system`) apply_theme_mode(`system`)
    }
    mql.addEventListener(`change`, on_change)
    return () => mql.removeEventListener(`change`, on_change)
  })
</script>

<button
  type="button"
  onclick={() => apply_theme_mode(next_mode)}
  {title}
  aria-label={title}
  style:visibility={is_hydrated ? `visible` : `hidden`}
  {@attach tooltip_opts !== false
  ? tooltip({
    placement: `bottom`,
    style: `font-size: 0.7rem; padding: 2pt 4pt;`,
    ...tooltip_opts,
  })
  : () => {}}
  {...rest}
>
  {#if is_hydrated}
    <Icon icon={mode_icons[theme_mode]} />
  {/if}
</button>

<style>
  button {
    display: inline-flex;
    place-items: center;
    place-content: center;
    line-height: 1;
    background: transparent;
    border: none;
    padding: 4pt;
    border-radius: 50%;
    cursor: pointer;
  }
  button:hover {
    background: light-dark(rgba(0, 0, 100, 0.1), rgba(200, 200, 255, 0.1));
  }
</style>
