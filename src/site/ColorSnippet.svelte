<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  let { option, idx = null, ...rest }: {
    option: string
    idx?: number | null
  } & HTMLAttributes<HTMLDivElement> = $props()
</script>

<div {...rest}>
  {#if idx !== null}{idx + 1}{/if}
  {#if typeof CSS !== `undefined` && CSS.supports(`color`, option)}
    <span style:background={option}></span>
  {/if}
  {option}
</div>

<style>
  div {
    display: flex;
    place-items: center;
    gap: 5pt;
  }
  div > span {
    width: 1em;
    height: 1em;
    border-radius: 2pt;
  }
</style>
