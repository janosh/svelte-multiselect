<script lang="ts">
  import type { ObjectOption } from '$lib'
  import { Octocat } from '$lib/icons'

  export let option: ObjectOption
  export let idx: number
</script>

<span>
  {idx + 1}
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
  a {
    display: flex;
    gap: 3pt;
    font-weight: lighter;
  }
</style>
