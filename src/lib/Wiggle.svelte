<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { Spring } from 'svelte/motion'

  let {
    wiggle = $bindable(false),
    angle = 0,
    scale = 1,
    dx = 0,
    dy = 0,
    duration = 200,
    spring_options = $bindable({ stiffness: 0.05, damping: 0.1 }),
    children,
    ...rest
  }: HTMLAttributes<HTMLSpanElement> & {
    // bind to this state and set it to true from parent
    wiggle?: boolean
    // intended use case: set max value during wiggle for one of angle, scale, dx, dy through props
    angle?: number // try 20
    scale?: number // try 1.2
    dx?: number // try 10
    dy?: number // try 10
    duration?: number
    spring_options?: { stiffness: number; damping: number }
    children?: Snippet
  } = $props()

  const store = Spring.of(
    () => (wiggle ? { scale, angle, dx, dy } : { angle: 0, scale: 1, dx: 0, dy: 0 }),
    spring_options,
  )

  // update spring physics when options change
  $effect(() => {
    store.stiffness = spring_options.stiffness
    store.damping = spring_options.damping
  })

  $effect.pre(() => {
    if (wiggle) setTimeout(() => (wiggle = false), duration)
  })
</script>

<span
  {...rest}
  style:display="inline-block"
  style:transform="rotate({store.current.angle}deg) scale({store.current.scale})
  translate({store.current.dx}px, {store.current.dy}px)"
>
  {@render children?.()}
</span>
