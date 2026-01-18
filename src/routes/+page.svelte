<script lang="ts">
  import { heading_anchors } from '$lib'
  import Readme from '$root/readme.md'
  import { DemoNav, Examples } from '$site'
</script>

<main {@attach heading_anchors()}>
  <Readme>
    {#snippet examples()}
      <h2>📚 &thinsp; Demos</h2>
      <DemoNav menu_props={{ style: `justify-content: start !important` }} />
      <Examples />
    {/snippet}
  </Readme>
</main>

<style>
  @media (max-width: 600px) {
    :global(h1[align='center']) {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  }
  :global(.hide-in-docs) {
    display: none;
  }
</style>
