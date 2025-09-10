<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  interface Props extends HTMLAttributes<HTMLLabelElement> {
    checked?: boolean // whether the toggle is on or off
    required?: boolean
    input_style?: string
    id?: string | null
    onclick?: (event: MouseEvent) => void
    onchange?: (event: Event) => void
    onblur?: (event: FocusEvent) => void
    onkeydown?: (event: KeyboardEvent) => void
    children?: Snippet<[]>
  }
  let {
    checked = $bindable(false),
    required = false,
    input_style = ``,
    id = null,
    onclick,
    onchange,
    onblur,
    onkeydown,
    children,
    ...rest
  }: Props = $props()

  // normally input type=checkbox toggles on space bar, this handler also responds to enter
  function handle_keydown(event: KeyboardEvent) {
    onkeydown?.(event)
    if (event.key === `Enter`) {
      event.preventDefault()
      const target = event.target as HTMLInputElement
      target.click() // simulate real user toggle so 'change' is dispatched
    }
  }
</script>

<label {...rest}>
  {@render children?.()}
  <input
    type="checkbox"
    bind:checked
    {id}
    {required}
    onkeydown={handle_keydown}
    {onchange}
    {onblur}
    {onclick}
    style={input_style}
  />
  <span></span>
</label>

<style>
  label {
    display: var(--toggle-label-display, inline-flex);
    align-items: var(--toggle-label-align-items, center);
    width: var(--toggle-label-width, max-content);
    vertical-align: var(--toggle-label-vertical-align, middle);
  }
  span {
    box-sizing: border-box;
    height: var(--toggle-knob-height, 1.5em);
    width: var(--toggle-knob-width, 3em);
    padding: var(--toggle-knob-padding, 0.1em);
    border: var(--toggle-knob-border, 1px solid lightgray);
    border-radius: var(--toggle-knob-border-radius, 0.75em);
    transition: var(--toggle-knob-transition, 0.3s);
  }
  input:checked + span {
    background: var(--toggle-background, black);
  }
  input {
    position: absolute;
    opacity: 0;
    width: var(--toggle-input-width, 1em);
  }
  input + span::after {
    content: '';
    display: var(--toggle-knob-after-display, block);
    height: var(--toggle-knob-after-height, 1.2em);
    width: var(--toggle-knob-after-width, 1.2em);
    border-radius: var(--toggle-knob-after-border-radius, 50%);
    background: var(--toggle-knob-after-background, gray);
    transition: var(--toggle-knob-after-transition, 0.3s);
  }
  input:checked + span::after {
    background: var(--toggle-knob-after-background, green);
    transform: var(
      --toggle-knob-after-transform,
      translate(
        calc(
          var(--toggle-knob-width, 3em) - var(--toggle-knob-height, 1.5em)
            + var(--toggle-knob-padding, 0.1em)
            - var(--toggle-knob-border, 2px)
        )
      )
    );
  }
  input:focus + span {
    border: var(--toggle-knob-focus-border, 1px solid cornflowerblue);
  }
</style>
