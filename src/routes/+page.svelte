<script lang="ts">
  import Readme from '$root/readme.md'
  import { Examples } from '$site'
</script>

<main>
  <Readme>
    {#snippet examples()}
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
