<script lang="ts">
  import { ObjectOption } from '../lib'

  export let option: ObjectOption
  export let idx: number
</script>

<span>
  <small>{idx + 1}</small>
  <span style:background={option.label} />
  {option.label}
</span>

<style>
  span {
    display: flex;
    place-items: center;
    gap: 3pt;
  }
  span small {
    width: 10pt;
    text-align: right;
  }
  span > span {
    width: 1em;
    height: 1em;
    display: inline-block;
    border-radius: 2pt;
    margin: 0 5pt;
    vertical-align: middle;
  }
</style>
