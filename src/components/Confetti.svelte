<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  export let speed = 0.4
  export let nItems = 50

  const emojis = [`🥳`, `🎉`, `✨`]

  let confetti = [...Array(nItems).keys()]
    .map((idx) => ({
      emoji: emojis[idx % emojis.length],
      x: Math.random() * 100,
      y: -20 - Math.random() * 100,
      r: 0.1 + Math.random() * 1,
    }))
    .sort((a, b) => a.r - b.r)

  onMount(() => {
    let frameId: number

    function loop() {
      frameId = requestAnimationFrame(loop)

      confetti = confetti.map((emoji) => {
        emoji.y += speed * emoji.r
        if (emoji.y > 120) emoji.y = -20
        return emoji
      })
    }

    loop()

    return () => cancelAnimationFrame(frameId)
  })
</script>

<div transition:fade>
  {#each confetti as c}
    <span style="left: {c.x}%; top: {c.y}%; transform: scale({c.r})">{c.emoji}</span>
  {/each}
</div>

<style>
  span {
    z-index: 10;
    position: fixed;
    font-size: 5vw;
    user-select: none;
  }
</style>
