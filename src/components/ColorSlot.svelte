<script lang="ts">
  import { ObjectOption } from '../lib'

  export let option: ObjectOption
  export let idx: number
</script>

<span>
  {idx + 1}
  <span style:background={option.label} />
  {option.label}
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
    border-radius: 2pt;
    margin: 0 3pt;
    vertical-align: middle;
  }
</style>
