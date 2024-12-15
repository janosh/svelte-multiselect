<script lang="ts">
  import Readme from '$root/readme.md'
  import { DemoNav, Examples } from '$site'
  import Toc from 'svelte-toc'
</script>

<main>
  <Readme>
    {#snippet examples()}
        <Examples  />
      {/snippet}
    {#snippet nav()}

        <h2>📝 &thinsp; More examples</h2>
        <p>
          Some more in-depth examples for specific features of
          <code>svelte-multiselect</code>:
        </p>
        <DemoNav />

      {/snippet}
  </Readme>
</main>

<Toc headingSelector="main > :where(h2, h3)" breakpoint={1250} />

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
