<script lang="ts">
  import { page } from '$app/stores'
  import GitHubCorner from 'svelte-github-corner'
  import '../app.css'

  export const prerender = true

  const demo_routes = Object.keys(import.meta.glob(`./*.svx`)).map(
    (filename) => filename.split(`.`)[1]
  )

  $: isCurrent = (path: string) => {
    if (path === $page.url.pathname) return `page`
    if (path !== `/` && $page.url.pathname.includes(path)) return `page`
    return undefined
  }
</script>

<GitHubCorner href="https://github.com/janosh/svelte-multiselect" />

{#if demo_routes.includes($page.url.pathname)}
  <a href="/" sveltekit:prefetch aria-label="Back to index page">&laquo; back</a>
  <h1>
    <img src="/favicon.svg" alt="Svelte MultiSelect" height="50" width="50" />&ensp;Svelte
    MultiSelect
  </h1>

  <p>Other examples</p>
  <nav>
    {#each demo_routes as route, idx}
      {#if idx > 0}<strong>&bull;</strong>{/if}
      <a href={route} sveltekit:prefetch aria-current={isCurrent(route)}>{route}</a>
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
  h1,
  p {
    text-align: center;
    display: flex;
    place-content: center;
    place-items: center;
  }
  a[href='/'] {
    font-size: 16pt;
    position: absolute;
    top: 2em;
    left: 2em;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1pt 5pt;
    border-radius: 3pt;
    transition: 0.2s;
  }
  a[href='/']:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  nav {
    display: flex;
    gap: 1ex;
    place-content: center;
    margin: 1em auto 3em;
    max-width: 45em;
    flex-wrap: wrap;
  }
  nav > a {
    padding-bottom: 2pt;
  }
  nav > a[aria-current='page'] {
    font-weight: bold;
  }
</style>
