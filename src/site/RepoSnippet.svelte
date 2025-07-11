<script lang="ts">
  import type { ObjectOption } from '$lib'
  import { Icon } from '$lib'

  interface Props {
    option: ObjectOption
    idx: number
    onclick?: () => void
  }
  let { option, idx, onclick }: Props = $props()
</script>

<span>
  {idx + 1}
  <strong>{option.label}</strong>
  <small>
    <a
      {onclick}
      href="https://github.com/{option.repo_handle}"
      target="_blank"
      rel="noreferrer"
    >
      <Icon icon="GitHub" width="14pt" />{option.repo_handle}
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
