<script lang="ts">
  let { events, item }: { events: number[]; item: { id: number } } = $props()

  $effect(() => {
    events.push(item.id)
  })
</script>

<span>{item.id}</span>
