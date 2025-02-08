<script lang="ts">
  import type { Snippet } from 'svelte'

  import { Spring } from 'svelte/motion'

  interface Props {
    // bind to this state and set it to true from parent
    wiggle?: boolean
    // intended use case: set max value during wiggle for one of angle, scale, dx, dy through props
    angle?: number // try 20
    scale?: number // try 1.2
    dx?: number // try 10
    dy?: number // try 10
    duration?: number
    stiffness?: number
    damping?: number
    children?: Snippet
  }

  let {
    wiggle = $bindable(false),
    angle = 0,
    scale = 1,
    dx = 0,
    dy = 0,
    duration = 200,
    stiffness = 0.05,
    damping = 0.1,
    children,
  }: Props = $props()

  const store = Spring.of(
    () => (wiggle ? { scale, angle, dx, dy } : { angle: 0, scale: 1, dx: 0, dy: 0 }),
    { stiffness, damping },
  )

  $effect.pre(() => {
    if (wiggle) setTimeout(() => (wiggle = false), duration)
  })
</script>

<span
  style:transform="rotate({store.current.angle}deg) scale({store.current.scale}) translate({store.current.dx}px,
  {store.current.dy}px)"
>
  {@render children?.()}
</span>
