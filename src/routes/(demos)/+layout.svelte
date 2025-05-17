<script lang="ts">
  import { page } from '$app/state'
  import { name } from '$root/package.json'
  import { DemoNav } from '$site'
  import { demos } from '$site/stores'
  import type { Snippet } from 'svelte'
  import { PrevNext } from 'svelte-zoo'

  interface Props {
    children?: Snippet
  }
  let { children }: Props = $props()
</script>

<h1>
  <img src="favicon.svg" alt={name} height="50" width="50" />&ensp;Svelte MultiSelect
</h1>

<main>
  <DemoNav style="place-content: center;" />

  {@render children?.()}

  <!-- TODO pass onkeyup=null in next version of svelte-zoo -->
  <PrevNext
    items={$demos}
    current={page.url.pathname}
    style="max-width: var(--main-max-width); margin: auto;"
    on_keyup={() => ({})}
  />
</main>

<style>
  h1 {
    text-align: center;
    display: flex;
    place-content: center;
    place-items: center;
  }
</style>
