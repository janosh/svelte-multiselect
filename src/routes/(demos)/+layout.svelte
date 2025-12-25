<script lang="ts">
  import { page } from '$app/state'
  import { PrevNext } from '$lib'
  import type { Snippet } from 'svelte'
  import { demo_pages } from './index'

  let { children }: { children?: Snippet<[]> } = $props()
</script>

<main>
  {@render children?.()}

  <PrevNext
    items={demo_pages}
    current={page.url.pathname}
    style="max-width: var(--main-max-width); margin: 2em auto"
    onkeyup={null}
    link_props={{
      style: `background: var(--surface); padding: 2pt 6pt; border-radius: 3px;`,
    }}
  />
</main>

<style>
  main :global(h2) {
    margin-top: 2em;
  }
</style>
