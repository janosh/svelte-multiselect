<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { CmdPalette } from '$lib'
  import { repository } from '$root/package.json'
  import { Footer } from '$site'
  import { type Snippet } from 'svelte'
  import Toc from 'svelte-toc'
  import { CopyButton, GitHubCorner } from 'svelte-zoo'
  import '../app.css'
  import { routes } from './(demos)'

  interface Props {
    children?: Snippet
  }
  let { children }: Props = $props()

  const actions = routes.map(({ route }) => ({ label: route, action: () => goto(route) }))
</script>

<CmdPalette {actions} placeholder="Go to..." />

<GitHubCorner href={repository} />

<CopyButton global />

{#if !page.error && page.url.pathname !== `/`}
  <a href="." aria-label="Back to index page">&laquo; home</a>
{/if}

{@render children?.()}

{#if [`/`, `/changelog`, `/contributing`].includes(page.url.pathname)}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1250}
    --toc-mobile-bg="#1c0e3e"
    --toc-li-padding="3pt 1ex"
    --toc-mobile-btn-color="white"
    --toc-desktop-nav-margin="0 0 0 14em"
    aside_style="max-width: 24em"
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
</style>
