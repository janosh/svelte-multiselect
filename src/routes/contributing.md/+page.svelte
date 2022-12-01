<script lang="ts">
  import Toc from 'svelte-toc'
  import Contributing from '../../../contributing.md'
</script>

<a href="." aria-label="Back to index page">&laquo; back</a>

<main>
  <Contributing />
</main>

<Toc headingSelector="main > :where(h2)" breakpoint={1250} />

<style>
  :global(aside.toc.desktop) {
    position: fixed;
    top: 3em;
    left: calc(50vw + 50em / 2);
    max-width: 16em;
  }
</style>
