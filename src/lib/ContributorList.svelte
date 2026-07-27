<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { tooltip, type TooltipOptions } from './attachments'
  import type { Contributor } from './types'

  let {
    contributors,
    tooltip_options,
    ...rest
  }: Omit<HTMLAttributes<HTMLUListElement>, `children`> & {
    contributors: Contributor[]
    tooltip_options?: Omit<TooltipOptions, `content`>
  } = $props()
</script>

<ul {...rest}>
  {#each contributors as { avatar_url, html_url, login } (login)}
    <li>
      <a href={html_url} {@attach tooltip({ ...tooltip_options, content: login })}>
        <!-- contributor lists run long and sit below the fold, so never block on them -->
        <img src={avatar_url} alt={login} loading="lazy" />
      </a>
    </li>
  {/each}
</ul>

<style>
  ul {
    display: flex;
    flex-wrap: wrap;
    place-content: center;
    list-style: none;
    padding: 0;
    gap: var(--contributor-gap, 1ex);
  }
  ul img {
    width: var(--contributor-avatar-size, 60px);
    border-radius: 50%;
    display: block;
    filter: grayscale(100%);
    transition: filter 0.3s ease-in-out;
  }
  ul img:hover {
    filter: none;
  }
</style>
