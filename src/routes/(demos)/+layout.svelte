<script lang="ts">
  import { name } from '$root/package.json'
  import { DemoNav, Footer } from '$site'
</script>

<h1>
  <img src="favicon.svg" alt={name} height="50" width="50" />&ensp;Svelte MultiSelect
</h1>

<main>
  <DemoNav style="place-content: center;" />

  <slot />
</main>

<Footer />

<style>
  h1 {
    text-align: center;
    display: flex;
    place-content: center;
    place-items: center;
  }
</style>
