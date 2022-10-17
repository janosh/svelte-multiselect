<script lang="ts">
  import type { ObjectOption } from '$lib'
  import { Octocat } from '$lib/icons'

  export let option: ObjectOption
  export let idx: number
</script>

<span>
  <small>{idx + 1}</small>
  <strong>{option.label}</strong>
  <small>
    <a
      href="https://github.com/{option.repo_handle}"
      target="_blank"
      rel="noreferrer"
      on:click|stopPropagation
    >
      <Octocat width="14pt" />{option.repo_handle}
    </a>
  </small>
</span>

<style>
  span {
    display: flex;
    place-items: center;
    gap: 10pt;
  }
  span small:first-child {
    width: 6pt;
    text-align: right;
  }
  a {
    display: flex;
    gap: 3pt;
    font-style: normal;
    font-weight: lighter;
    place-items: center;
  }
</style>
