<script lang="ts">
  import type { ObjectOption } from '$lib'
  import { Icon } from '$lib'
  import type { HTMLAttributes } from 'svelte/elements'

  let { option, idx, onclick, ...rest }: {
    option: ObjectOption
    idx: number
    onclick?: () => void
  } & HTMLAttributes<HTMLSpanElement> = $props()
</script>

<span {...rest}>
  {idx + 1}
  <strong>{option.label}</strong>
  <small>
    <a
      {onclick}
      href="https://github.com/{option.repo_handle}"
      target="_blank"
      rel="noreferrer"
    >
      <Icon icon="GitHub" style="width: 14pt" />{option.repo_handle}
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
