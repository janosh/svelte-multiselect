<script lang="ts">
  import { run } from 'svelte/legacy';

  import { spring } from 'svelte/motion'

  
  

  interface Props {
    // bind to this state and set it to true from parent
    wiggle?: boolean;
    // intended use case: set max value during wiggle for one of angle, scale, dx, dy through props
    angle?: number; // try 20
    scale?: number; // try 1.2
    dx?: number; // try 10
    dy?: number; // try 10
    duration?: number;
    stiffness?: number;
    damping?: number;
    children?: import('svelte').Snippet;
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
    children
  }: Props = $props();

  let rest_state = { angle: 0, scale: 1, dx: 0, dy: 0 }
  let store = spring(rest_state, { stiffness, damping })

  run(() => {
    store.set(wiggle ? { scale, angle, dx, dy } : rest_state)
  });
  run(() => {
    if (wiggle) setTimeout(() => (wiggle = false), duration)
  });
</script>

<span
  style:transform="rotate({$store.angle}deg) scale({$store.scale}) translate({$store.dx}px,
  {$store.dy}px)"
>
  {@render children?.()}
</span>
