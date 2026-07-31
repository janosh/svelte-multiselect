<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    color = `cornflowerblue`,
    duration = `1.5s`,
    size = `1em`,
    ...rest
  }: {
    color?: string
    duration?: string
    size?: string
  } & HTMLAttributes<HTMLDivElement> = $props()
</script>

<div
  {...rest}
  class={[`circle-spinner`, rest.class]}
  style:--duration={duration}
  style:border-color="{color} transparent {color}
  {color}"
  style:width={size}
  style:height={size}
></div>

<style>
  .circle-spinner {
    display: inline-block;
    vertical-align: middle;
    margin: 0 3pt;
    border-width: calc(1em / 5);
    border-style: solid;
    border-radius: 50%;
    animation: var(--duration) infinite rotate;
  }
  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
</style>
