<script lang="ts">
  import { spring } from 'svelte/motion'

  // bind to this state and set it to true from parent
  export let wiggle = false
  // intended use case: set max value during wiggle for one of angle, scale, dx, dy through props
  export let angle = 0 // try 20
  export let scale = 1 // try 1.2
  export let dx = 0 // try 10
  export let dy = 0 // try 10

  export let duration = 200
  export let stiffness = 0.05
  export let damping = 0.1

  let rest_state = { angle: 0, scale: 1, dx: 0, dy: 0 }
  let store = spring(rest_state, { stiffness, damping })

  $: store.set(wiggle ? { scale, angle, dx, dy } : rest_state)
  $: if (wiggle) setTimeout(() => (wiggle = false), duration)
</script>

<span
  style:transform="rotate({$store.angle}deg) scale({$store.scale}) translate({$store.dx}px,
  {$store.dy}px)"
>
  <slot />
</span>
