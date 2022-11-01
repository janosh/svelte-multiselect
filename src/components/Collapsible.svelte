<script lang="ts">
  import { tweened } from 'svelte/motion'
  import { slide } from 'svelte/transition'

  export let title: string | string[]

  const duration = 200
  const angle = tweened(180, { duration })

  let isOpen = false

  function toggle() {
    isOpen = !isOpen
    angle.set(isOpen ? 0 : 180)
  }
</script>

<button on:click={toggle}>
  {#if Array.isArray(title)}{isOpen ? title[1] : title[0]}{:else}{title}{/if}
  <span style="display:inline-block; transform: rotate({$angle}deg);">👆</span>
</button>
{#if isOpen}
  <div transition:slide={{ duration }}>
    <slot />
  </div>
{/if}

<style>
  button {
    cursor: pointer;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4pt;
    width: max-content;
    padding: 4pt 1ex;
    box-sizing: border-box;
    transition: 0.3s;
    border: none;
    color: white;
    position: absolute;
    top: 1ex;
    right: 1ex;
  }
  button:hover {
    transform: scale(1.01);
    background: rgba(255, 255, 255, 0.4);
  }
</style>
