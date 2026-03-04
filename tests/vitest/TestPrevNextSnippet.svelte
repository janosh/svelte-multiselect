<script lang="ts">
  import { PrevNext } from '$lib'
  import type { ComponentProps } from 'svelte'

  let { ...rest }: ComponentProps<typeof PrevNext> = $props()
</script>

<PrevNext {...rest}>
  {#snippet children({ kind, item, index, total })}
    <span
      class="prevnext-snippet"
      data-kind={kind}
      data-index={index}
      data-total={total}
    >{item[0]}</span>
  {/snippet}
</PrevNext>
