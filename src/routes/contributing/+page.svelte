<script lang="ts">
  import Contributing from '$root/contributing.md'
  import Toc from 'svelte-toc'
</script>

<main>
  <Contributing />
</main>

<Toc headingSelector="main > :where(h2)" breakpoint={1250} />
