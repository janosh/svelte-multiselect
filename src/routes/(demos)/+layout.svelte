<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import type { Pathname } from '$app/types'
  import { heading_anchors, PrevNext } from '$lib'
  import type { Snippet } from 'svelte'
  import { demo_pages } from './index'

  let { children }: { children?: Snippet<[]> } = $props()

  // resolve's arg type distributes over the Pathname union, so a dynamic route can't
  // match a single arm; every demo page is param-free
  const resolve_path = resolve as (path: Pathname) => string
  const demo_paths = demo_pages.map(resolve_path)
</script>

<main {@attach heading_anchors()}>
  {@render children?.()}

  {#if demo_paths.includes(page.url.pathname)}
    {@const style = `max-width: var(--main-max-width); margin: 2em auto`}
    <PrevNext items={demo_paths} current={page.url.pathname} onkeyup={null} {style} />
  {/if}
</main>

<style>
  main :global(h2) {
    margin-top: 2em;
  }
</style>
