<script lang="ts">
  import { page } from '$app/stores'
  import { demos } from './stores'

  export let style: string | null = null

  $: is_current = (path: string) => {
    if (`/${path}` == $page.url.pathname) return `page`
    return undefined
  }
</script>

<nav {style}>
  {#each $demos as href, idx}
    {#if idx > 0}<strong>&bull;</strong>{/if}
    <a {href} aria-current={is_current(href)}>{href}</a>
  {/each}
</nav>

<style>
  nav {
    display: flex;
    gap: 1em 1ex;
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
</style>
