<script lang="ts">
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

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(route),
  }))
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

<CopyButton global />

{@render children?.()}

{#if page.url.pathname === `/`}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1500}
    open_button_style="display: flex; padding: 3px;"
    --toc-mobile-bg="light-dark(#fff, #1a1a1a)"
    --toc-padding="1em 0 1em 1em"
  />
{/if}

<Footer />

<style>
  :global(aside.toc.desktop) {
    position: fixed;
    font-size: 0.6rem;
    left: calc(50vw + var(--main-max-width) / 2 + 210px);
    max-width: 12rem;
  }
</style>
