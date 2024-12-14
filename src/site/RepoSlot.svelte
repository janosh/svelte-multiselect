<script lang="ts">
  import { createBubbler, stopPropagation } from 'svelte/legacy';

  const bubble = createBubbler();
  import type { ObjectOption } from '$lib'
  import { Octocat } from '$lib/icons'

  interface Props {
    option: ObjectOption;
    idx: number;
  }

  let { option, idx }: Props = $props();
</script>

<span>
  {idx + 1}
  <strong>{option.label}</strong>
  <small>
    <a
      onclick={stopPropagation(bubble('click'))}
      href="https://github.com/{option.repo_handle}"
      target="_blank"
      rel="noreferrer"
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
