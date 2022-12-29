<script lang="ts">
  import { page } from '$app/stores'
  import GitHubCorner from 'svelte-github-corner'
  import { repository } from '../../package.json'
  import '../app.css'
  import { _demo_routes } from './+layout'

  $: is_current = (path: string) => {
    if (path === $page.url.pathname) return `page`
    if (path !== `/` && $page.url.pathname.includes(path)) return `page`
    return undefined
  }
</script>

<GitHubCorner href={repository} />

{#if !$page.error && $page.url.pathname !== `/`}
  <a href="." aria-label="Back to index page">&laquo; home</a>
{/if}
{#if _demo_routes.some((route) => $page.url.pathname.endsWith(route))}
  <h1>
    <img src="favicon.svg" alt="Svelte MultiSelect" height="50" width="50" />&ensp;Svelte
    MultiSelect Examples
  </h1>

  <nav>
    {#each _demo_routes as route, idx}
      {#if idx > 0}<strong>&bull;</strong>{/if}
      <a href={route} aria-current={is_current(route)}>{route}</a>
    {/each}
  </nav>

  <main>
    <slot />
  </main>
{:else}
  <!-- handles non-svx routes index.svelte and +error.svelte -->
  <slot />
{/if}

<style>
  h1 {
    text-align: center;
    display: flex;
    place-content: center;
    place-items: center;
  }
  nav {
    display: flex;
    gap: 1em 1ex;
    place-content: center;
    margin: 1em auto 3em;
    max-width: 45em;
    flex-wrap: wrap;
  }
  nav > a {
    padding: 0 4pt;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 3pt;
    transition: 0.2s;
  }
  nav > a[aria-current='page'] {
    color: mediumseagreen;
  }
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
