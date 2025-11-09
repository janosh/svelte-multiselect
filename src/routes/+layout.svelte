<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { CmdPalette, CopyButton, GitHubCorner } from '$lib'
  import { repository } from '$root/package.json'
  import { Footer } from '$site'
  import { type Snippet } from 'svelte'
  import { Toc } from 'svelte-toc'
  import '../app.css'
  import { routes } from './(demos)'

  let { children }: { children?: Snippet<[]> } = $props()

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(route),
  }))
</script>

<CmdPalette {actions} placeholder="Go to..." />

<GitHubCorner href={repository} />

<CopyButton global />

{#if !page.error && page.url.pathname !== `/`}
  <a href="." aria-label="Back to index page">&laquo; home</a>
{/if}

{@render children?.()}

{#if page.url.pathname === `/`}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1500}
    open_button_style="transform: scale(1.4); display: flex; aspect-ratio: 1;"
    --toc-mobile-bg="rgb(30, 40, 50)"
  />
{/if}

<Footer />

<style>
  a[href='.'] {
    font-size: 15pt;
    position: absolute;
    top: 2em;
    left: 2em;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1pt 5pt;
    border-radius: 3pt;
    transition: 0.2s;
  }
  a[href='.']:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  :global(aside.toc.desktop) {
    position: fixed;
    font-size: 9pt;
    left: calc(50vw + var(--main-max-width) / 2 + 200px);
  }
</style>
