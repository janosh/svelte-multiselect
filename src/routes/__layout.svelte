<script lang="ts">
  import { page } from '$app/stores'
  import GitHubCorner from 'svelte-github-corner'
  import '../app.css'

  const routes = Object.keys(import.meta.glob(`./*.svx`)).map(
    (filename) => filename.split(`.`)[1]
  )
</script>

<GitHubCorner href="https://github.com/janosh/svelte-multiselect" />

{#if $page?.url?.pathname !== `/`}
  <a href="/" class="back" aria-label="Back to index page">&laquo; back</a>
  <h1>
    <img src="/favicon.svg" alt="Svelte MultiSelect" height="50" width="50" />&ensp;Svelte
    MultiSelect
  </h1>

  <p>Other examples</p>
  <nav>
    {#each routes as route, idx}
      {#if idx > 0}<strong>&bull;</strong>{/if}
      <a href={route}>{route}</a>
    {/each}
  </nav>

  <main>
    <slot />
  </main>
{:else}
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
  a.back {
    font-size: 3ex;
    position: absolute;
    top: 2em;
    left: 2em;
  }
  nav {
    display: flex;
    gap: 1ex;
    place-content: center;
    margin: 1em 0;
  }
</style>
