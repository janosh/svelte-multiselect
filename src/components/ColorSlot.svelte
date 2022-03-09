<script lang="ts">
  import { Option } from '../lib'

  export let option: Option
  export let idx: number
</script>

<span>
  {idx + 1}
  {option.label}
  <span style:background={option.label} />
</span>

<style>
  span {
    display: flex;
    place-items: center;
    gap: 3pt;
  }
  span > span {
    width: 1em;
    height: 1em;
    display: inline-block;
    border-radius: 3pt;
    vertical-align: middle;
  }
</style>
