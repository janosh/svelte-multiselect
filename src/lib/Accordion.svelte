<script lang="ts" generics="Value extends string = string">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { AccordionItem, AccordionValue } from './types'
  import { chain_handlers, step_focus } from './utils'

  // Headless styling hooks: .accordion, .accordion-item, .accordion-heading,
  // .accordion-trigger and .accordion-panel. Items and panels expose data-state.
  type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
  type Props = Omit<HTMLAttributes<HTMLDivElement>, `children`> & {
    items: readonly AccordionItem<Value>[]
    heading_level?: HeadingLevel
    trigger?: Snippet<[{ item: AccordionItem<Value>; open: boolean }]>
    panel?: Snippet<[{ item: AccordionItem<Value>; open: boolean }]>
    multiple?: boolean
    value?: AccordionValue<Value>
    on_change?: (value: AccordionValue<Value>) => void
  }

  let {
    items,
    multiple = false,
    value = $bindable(multiple ? [] : null),
    heading_level = 3,
    trigger,
    panel,
    on_change,
    ...rest
  }: Props = $props()

  const component_id = $props.id()
  const base_id = `accordion-${component_id}`
  // `value` is an array in multiple mode and a single value or null otherwise. Anything
  // that does not match the current mode reads as nothing open.
  const open_values = $derived.by(() => {
    if (Array.isArray(value)) return multiple ? value : []
    return multiple || value == null ? [] : [value]
  })
  const trigger_id = (item: AccordionItem<Value>) =>
    `${base_id}-trigger-${encodeURIComponent(item.value)}`
  const panel_id = (item: AccordionItem<Value>) =>
    `${base_id}-panel-${encodeURIComponent(item.value)}`

  function toggle(item: AccordionItem<Value>) {
    const is_open = open_values.includes(item.value)
    const next_value: AccordionValue<Value> = multiple
      ? is_open
        ? open_values.filter((entry) => entry !== item.value)
        : [...open_values, item.value]
      : is_open
        ? null
        : item.value
    value = next_value
    on_change?.(next_value)
  }

  function handle_keydown(event: KeyboardEvent & { currentTarget: HTMLElement }) {
    const root = event.currentTarget
    const { target } = event
    // A nested accordion's own root claims its triggers, so the outer root ignores them.
    if (
      !(target instanceof HTMLButtonElement) ||
      !target.classList.contains(`accordion-trigger`) ||
      target.closest(`.accordion`) !== root
    )
      return
    const buttons = [
      ...root.querySelectorAll<HTMLButtonElement>(
        `:scope > .accordion-item > .accordion-heading > button.accordion-trigger:not(:disabled)`,
      ),
    ]
    step_focus(event, buttons)
  }
</script>

<div
  {...rest}
  class={[`accordion`, rest.class]}
  onkeydown={chain_handlers(handle_keydown, rest.onkeydown)}
>
  {#each items as item (item.value)}
    {@const open = open_values.includes(item.value)}
    <div class="accordion-item" data-state={open ? `open` : `closed`}>
      <svelte:element this={`h${heading_level}`} class="accordion-heading">
        <button
          class="accordion-trigger"
          type="button"
          id={trigger_id(item)}
          aria-controls={panel_id(item)}
          aria-expanded={open}
          aria-disabled={item.disabled || undefined}
          disabled={item.disabled}
          onclick={() => toggle(item)}
        >
          {#if trigger}
            {@render trigger({ item, open })}
          {:else}
            {item.label ?? item.value}
          {/if}
        </button>
      </svelte:element>
      <div
        class="accordion-panel"
        role="region"
        id={panel_id(item)}
        aria-labelledby={trigger_id(item)}
        hidden={!open}
        data-state={open ? `open` : `closed`}
      >
        {@render panel?.({ item, open })}
      </div>
    </div>
  {/each}
</div>
