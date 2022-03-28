<script lang="ts">
  import { page } from '$app/stores'

  const routes = Object.keys(import.meta.glob(`./*.svx`)).map((filename) =>
    filename.split(`.`)[1].split(`/`).at(-1)
  ) as string[]

  $: isCurrent = (path: string) => {
    if (path === $page.url.pathname) return `page`
    if (path !== `/` && $page.url.pathname.includes(path)) return `page`
    return undefined
  }
</script>

<a href="/" sveltekit:prefetch aria-label="Back to index page">&laquo; back</a>
<h1>
  <img src="/favicon.svg" alt="Svelte MultiSelect" height="50" width="50" />&ensp;Svelte
  MultiSelect
</h1>

<p>Other examples</p>
<nav>
  {#each routes as route, idx}
    {#if idx > 0}<strong>&bull;</strong>{/if}
    <a href={route} sveltekit:prefetch aria-current={isCurrent(route)}>/{route}</a>
  {/each}
</nav>

<main>
  <slot />
</main>

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
  nav > a {
    padding-bottom: 2pt;
  }
  nav > a[aria-current='page'] {
    font-weight: bold;
  }
  nav {
    display: flex;
    gap: 1ex;
    place-content: center;
    margin: 1em 0 3em;
  }
</style>
