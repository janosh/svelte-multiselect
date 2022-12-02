<script lang="ts">
  import Toc from 'svelte-toc'
  import Changelog from '../../../changelog.md'
</script>

<main>
  <Changelog />
</main>

<Toc headingSelector="main > :where(h3, h4)" breakpoint={1250} />

<style>
  :global(aside.toc.desktop) {
    position: fixed;
    top: 3em;
    left: calc(50vw + 50em / 2);
    max-width: 16em;
  }
</style>
