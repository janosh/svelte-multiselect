<script lang="ts">
  import { Icon } from '$lib'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { FrontendLib } from './options'

  let { option, idx, onclick, ...rest }:
    & HTMLAttributes<HTMLSpanElement>
    & { option: FrontendLib; idx: number; onclick?: () => void } = $props()
</script>

<span {...rest}>
  {idx + 1}
  <strong>{option.label}</strong>
  <small>
    <a {onclick} href={option.repo} target="_blank" rel="noreferrer">
      <Icon icon="GitHub" style="width: 14pt" />{
        option.repo.replace(`https://github.com/`, ``)
      }
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
