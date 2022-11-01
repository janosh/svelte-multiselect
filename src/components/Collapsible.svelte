<script lang="ts">
  import { tweened } from 'svelte/motion'
  import { slide } from 'svelte/transition'

  export let title: string | string[]
  export let duration: number = 200
  export let open: boolean = false
  export let btn_style: string = ``

  const angle = tweened(180, { duration })

  function toggle() {
    open = !open
    angle.set(open ? 0 : 180)
  }
</script>

<button on:click={toggle} style={btn_style}>
  {#if Array.isArray(title)}
    {open ? title[1] : title[0]}
  {:else}
    {title}
  {/if}
  <span style="display: inline-block; transform: rotate({$angle}deg);">👆</span>
</button>
{#if open}
  <div transition:slide={{ duration }}>
    <slot />
  </div>
{/if}

<style>
  button {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4pt;
    padding: 4pt 1ex;
    transition: 0.3s;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.4);
  }
</style>
