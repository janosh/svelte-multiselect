<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  let { option, idx, height = `20px`, gap = `5pt`, ...rest }: {
    option: string
    idx?: number | undefined
    height?: string
    gap?: string
  } & HTMLAttributes<HTMLSpanElement> = $props()

  let lang = $derived(
    option.toLowerCase().replaceAll(`+`, `plus`).replace(`#`, `sharp`),
  )
  let src = $derived(
    `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${lang}/${lang}-original.svg`,
  )
  let hidden = $state(false)

  // default back to visible every time src changes to see if image loads successfully
  $effect(() => {
    if (src) hidden = false
  })
</script>

<span style:gap {...rest}>
  {#if idx !== undefined}
    <strong>{idx + 1}</strong>
  {/if}
  <!-- style:height since the HTML height attribute only allows integers, not CSS lengths like 20px -->
  <img {src} style:height alt={option} {hidden} onerror={() => (hidden = true)} />
  {option}
</span>

<style>
  span {
    display: flex;
    align-items: center;
  }
  img[alt='Rust'] {
    filter: invert(1);
  }
</style>
