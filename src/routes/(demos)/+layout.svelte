<script lang="ts">
  import { page } from '$app/state'
  import { PrevNext } from '$lib'
  import { name } from '$root/package.json'
  import { DemoNav } from '$site'
  import type { Snippet } from 'svelte'
  import { demo_pages } from './index'

  let { children }: { children?: Snippet<[]> } = $props()
</script>

<h1>
  <img src="favicon.svg" alt={name} height="50" width="50" />&ensp;Svelte MultiSelect
</h1>

<main>
  <DemoNav style="place-content: center" />

  {@render children?.()}

  <PrevNext
    items={demo_pages}
    current={page.url.pathname}
    style="max-width: var(--main-max-width); margin: auto"
    onkeyup={null}
  />
</main>

<style>
  h1 {
    text-align: center;
    display: flex;
    place-content: center;
    place-items: center;
  }
  main :global(h2) {
    margin-top: 2em;
  }
</style>
