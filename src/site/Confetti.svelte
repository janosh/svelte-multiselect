<script lang="ts">
  // let emojis rain across the screen to playfully show some event was triggered
  import { onMount } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { fade } from 'svelte/transition'

  let { speed = 0.5, n_items = 50, freeze = false, ...rest }: {
    speed?: number
    n_items?: number
    freeze?: boolean
  } & HTMLAttributes<HTMLDivElement> = $props()

  const emojis = [`🥳`, `🎉`, `✨`]

  let confetti: { emoji: string; x: number; y: number; r: number }[] = $state(
    Array(n_items)
      .fill(0)
      .map((_, idx) => ({
        emoji: emojis[idx % emojis.length],
        x: Math.random() * 100,
        y: -20 - Math.random() * 100,
        r: 0.1 + Math.random() * 1,
      }))
      .sort((a, b) => a.r - b.r),
  )
  let frame_id: number | undefined
  let is_running = false

  function loop() {
    if (typeof requestAnimationFrame == `undefined`) return
    if (freeze) return

    frame_id = requestAnimationFrame(loop)
    is_running = true

    confetti = confetti.map((emoji) => {
      emoji.y += speed * emoji.r
      if (emoji.y > 120) emoji.y = -20
      return emoji
    })
  }

  function start_animation() {
    if (!is_running && !freeze) loop()
  }

  function stop_animation() {
    if (frame_id) {
      cancelAnimationFrame(frame_id)
      frame_id = undefined
      is_running = false
    }
  }

  onMount(() => {
    start_animation()
    return stop_animation
  })

  $effect(() => {
    if (freeze) stop_animation()
    else start_animation()
  })
</script>

<div transition:fade {...rest}>
  {#each confetti as con (JSON.stringify(con))}
    <span style:left="{con.x}%" style:top="{con.y}%" style:transform="scale({con.r})">
      {con.emoji}
    </span>
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
