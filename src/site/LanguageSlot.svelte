<script lang="ts">
  export let option: string
  export let idx: number | undefined = undefined
  export let height = `20px`
  export let gap = `5pt`

  $: lang = option.toLowerCase().replaceAll(`+`, `plus`).replace(`#`, `sharp`)

  $: src = `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${lang}/${lang}-original.svg`

  let hidden = false
  // default back to visible every time src changes to see if the image loads successfully
  $: src, (hidden = false)
</script>

<span style:gap>
  {#if idx !== undefined}
    <strong>{idx + 1}</strong>
  {/if}
  <img {src} {height} alt={option} {hidden} on:error={() => (hidden = true)} />
  {option}
</span>

<style>
  span {
    display: flex;
  }
</style>
