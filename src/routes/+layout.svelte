<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { CmdPalette, CopyButton, GitHubCorner } from '$lib'
  import { name, repository } from '$root/package.json'
  import { DemoNav, Footer } from '$site'
  import type { Snippet } from 'svelte'
  import { Toc } from 'svelte-toc'
  import '../app.css'
  import { routes } from './(demos)'

  let { children }: { children?: Snippet<[]> } = $props()
  let toc_desktop = $state(true)

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(route),
  }))

  if (browser) {
    const saved_theme_mode = localStorage.getItem(`theme`)
    if (saved_theme_mode === `light` || saved_theme_mode === `dark`) {
      document.documentElement.style.colorScheme = saved_theme_mode
      document.documentElement.dataset.theme = saved_theme_mode
    }
  }
</script>

{#if page.url.pathname !== `/`}
  <h1>
    <img src="favicon.svg" alt={name} height="50" width="50" />&ensp;Svelte MultiSelect
  </h1>
{/if}

{#if page.url.pathname !== `/`}
  <DemoNav --nav-item-padding="1pt 4pt" />
{/if}

<CmdPalette {actions} placeholder="Go to..." />

<GitHubCorner href={repository} />

<CopyButton global global_selector="pre:not(li > pre) > code" />

{@render children?.()}

{#if page.url.pathname === `/`}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1500}
    bind:desktop={toc_desktop}
    asideStyle={toc_desktop
    ? `position: fixed; right: 2em; font-size: 0.7rem; max-width: 17rem;`
    : ``}
    openButtonStyle="display: flex; padding: 3px;"
    --toc-mobile-bg="light-dark(#fff, #222226)"
    --toc-padding="1em 0 1em 1em"
    --toc-active-color="var(--accent)"
  />
{/if}

<Footer />
