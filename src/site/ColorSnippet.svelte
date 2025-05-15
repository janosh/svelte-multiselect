<script lang="ts">
  interface Props {
    option: string
    idx?: number | null
    style?: string | null
  }
  let { option, idx = null, style = null }: Props = $props()
</script>

<div {style}>
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
