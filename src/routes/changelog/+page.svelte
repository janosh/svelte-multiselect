<script lang="ts">
  import Toc from 'svelte-toc'
  import Changelog from '../../../changelog.md'
</script>

<main>
  <Changelog />
</main>

<Toc headingSelector="main > :where(h3, h4)" breakpoint={1250} />
