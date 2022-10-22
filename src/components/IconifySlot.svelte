<script lang="ts">
  import Icon from '@iconify/svelte'

  export let option: string
  export let pack = `octicon`
  export let gap = `9pt`
</script>

<span style:gap>
  <Icon icon="{pack}:{option}" inline />
  {option.replaceAll(`-`, ` `)}
</span>

<style>
  span {
    display: flex;
    align-items: center;
    text-transform: capitalize;
  }
</style>
