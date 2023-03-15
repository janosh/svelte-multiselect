<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { CmdPalette } from '$lib'
  import { repository } from '$root/package.json'
  import { Footer } from '$site'
  import { demos } from '$site/stores'
  import { GitHubCorner } from 'svelte-zoo'
  import '../app.css'

  const routes = Object.keys(import.meta.glob(`./**/+page.{svx,svelte,md}`)).map(
    (filename) => {
      const parts = filename.split(`/`).filter((part) => !part.startsWith(`(`)) // remove hidden route segments
      return { route: `/${parts.slice(1, -1).join(`/`)}`, filename }
    }
  )

  if (routes.length < 3) {
    console.error(`Too few demo routes found: ${routes.length}`)
  }

  $demos = routes
    .filter(({ filename }) => filename.includes(`/(demos)/`))
    .map(({ route }) => route)

  const actions = routes.map(({ route }) => ({ label: route, action: () => goto(route) }))
</script>

<CmdPalette {actions} placeholder="Go to..." />

<GitHubCorner href={repository} />

{#if !$page.error && $page.url.pathname !== `/`}
  <a href="." aria-label="Back to index page">&laquo; home</a>
{/if}

<slot />

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
