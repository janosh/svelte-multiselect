<script lang="ts">
  import Icon from '@iconify/svelte'

  interface Props {
    option: string;
    pack?: any;
    gap?: any;
  }

  let { option, pack = `octicon`, gap = `9pt` }: Props = $props();
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
