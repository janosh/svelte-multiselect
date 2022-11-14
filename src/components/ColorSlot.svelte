<script lang="ts">
  export let option: string
  export let idx: number
</script>

<div>
  {idx + 1}
  {#if typeof CSS !== `undefined` && CSS.supports(`color`, option)}
    <span style:background={option} />
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
