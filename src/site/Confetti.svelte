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

  let confetti: { emoji: string; x: number; y: number; r: number }[] = $derived(
    Array.from({ length: n_items }, (_, idx) => ({
      emoji: emojis[idx % emojis.length],
      x: Math.random() * 100,
      y: -20 - Math.random() * 100,
      r: 0.1 + Math.random(),
    })).toSorted((conf_a, conf_b) => conf_a.r - conf_b.r),
  )
  let frame_id: number | undefined
  let is_running = false

  function loop() {
    if (typeof requestAnimationFrame === `undefined`) return
    if (freeze) return

    frame_id = requestAnimationFrame(loop)
    is_running = true

    confetti = confetti.map(({ emoji, x, r, y }) => {
      const new_y = y + speed * r
      return { emoji, x, r, y: new_y > 120 ? -20 : new_y }
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
  <!-- key by index, not content: x/y change every frame, so a content-based key
  would destroy and recreate every span on each animation frame -->
  {#each confetti as con, idx (idx)}
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
