<script lang="ts">
  import { page } from '$app/state'
  import { demo_pages } from '../routes/(demos)'

  interface Props {
    style?: string | null
  }
  let { style = null }: Props = $props()

  let is_current = $derived((path: string) => {
    if (`/${path}` == page.url.pathname) return `page`
    return undefined
  })
</script>

<nav {style}>
  {#each demo_pages as href, idx (href)}
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
