<script lang="ts">
  import { onMount } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import Icon from './Icon.svelte'

  type ThemeMode = `light` | `dark`

  let { ...rest }: HTMLAttributes<HTMLButtonElement> = $props()

  const resolve_theme_mode = (): ThemeMode => {
    try {
      const saved_theme_mode = localStorage.getItem(`theme`) ??
        localStorage.getItem(`theme_mode`)
      if (saved_theme_mode === `light` || saved_theme_mode === `dark`) {
        return saved_theme_mode
      }
    } catch {
      console.error(`Failed to get theme mode from localStorage`)
    }
    return matchMedia(`(prefers-color-scheme: dark)`).matches ? `dark` : `light`
  }

  let theme_mode: ThemeMode = $state(`dark`)
  let is_hydrated = $state(false)
  let next_mode = $derived(({ light: `dark`, dark: `light` } as const)[theme_mode])
  let title = $derived(`Switch to ${next_mode} theme`)

  const apply_theme_mode = (mode: ThemeMode): void => {
    theme_mode = mode
    document.documentElement.style.colorScheme = mode
    document.documentElement.dataset.theme = mode
    try {
      localStorage.setItem(`theme`, mode)
    } catch {
      console.error(`Failed to set theme mode in localStorage`)
    }
  }

  onMount(() => {
    apply_theme_mode(resolve_theme_mode())
    is_hydrated = true
  })
</script>

<button
  type="button"
  onclick={() => apply_theme_mode(next_mode)}
  {title}
  aria-label={title}
  style:visibility={is_hydrated ? `visible` : `hidden`}
  {...rest}
>
  {#if is_hydrated}
    <Icon icon={({ light: `Sun`, dark: `Moon` } as const)[theme_mode]} />
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
