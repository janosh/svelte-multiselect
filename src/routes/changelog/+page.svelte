<script lang="ts">
  import Changelog from '$root/changelog.md'
  import Toc from 'svelte-toc'
</script>

<main>
  <Changelog />
</main>

<Toc headingSelector="main > :where(h3, h4)" breakpoint={1250} />
