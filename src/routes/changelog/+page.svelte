<script lang="ts">
  let { data }: { data: { changelog?: { code?: string } } } = $props()
</script>

<main>
  {@html data.changelog?.code}
</main>
