<script lang="ts">
  import { base } from '$app/paths'
  import { page } from '$app/state'
  import { heading_anchors, PrevNext } from '$lib'
  import type { Snippet } from 'svelte'
  import { demo_pages } from './index'

  let { children }: { children?: Snippet<[]> } = $props()

  const demo_paths = demo_pages.map((route) => `${base}${route}`)
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
