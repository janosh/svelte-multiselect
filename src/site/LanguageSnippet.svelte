<script lang="ts">
  interface Props {
    option: string
    idx?: number | undefined
    height?: string
    gap?: string
  }
  let { option, idx = undefined, height = `20px`, gap = `5pt` }: Props = $props()

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

<span style:gap>
  {#if idx !== undefined}
    <strong>{idx + 1}</strong>
  {/if}
  <img {src} {height} alt={option} {hidden} onerror={() => (hidden = true)} />
  {option}
</span>

<style>
  span {
    display: flex;
  }
  img {
    transform: translateY(2px);
  }
  img[alt='Rust'] {
    filter: invert(1);
  }
</style>
