<script lang="ts">
  import { page } from '$app/state'
  import { heading_anchors, PrevNext } from '$lib'
  import type { Snippet } from 'svelte'
  import { demo_pages } from './index'

  let { children }: { children?: Snippet<[]> } = $props()

  let is_visible_demo = $derived(demo_pages.includes(page.url.pathname))
</script>

<main {@attach heading_anchors()}>
  {@render children?.()}

  {#if is_visible_demo}
    {@const style = `max-width: var(--main-max-width); margin: 2em auto`}
    <PrevNext items={demo_pages} current={page.url.pathname} onkeyup={null} {style} />
  {/if}
</main>

<style>
  main :global(h2) {
    margin-top: 2em;
  }
</style>
