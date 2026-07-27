<script module lang="ts">
  import type { IconName } from './icons'
  import { is_object } from './utils'

  // Only `value` is required; the rest are display extras any option shape may omit
  export type ButtonGroupOption<Value extends string = string> = {
    value: Value
    label?: string
    tooltip?: string
    icon?: IconName
    disabled?: boolean
    loading?: boolean // trailing spinner, e.g. while this option's data loads
  }

  // The shapes segmented controls are written with in the wild: bare values, a
  // value-to-label record, [value, label] pairs, or full option objects
  export type ButtonGroupOptions<Value extends string = string> =
    | readonly Value[]
    | Readonly<Record<Value, string>>
    | readonly (readonly [Value, string])[]
    | readonly ButtonGroupOption<Value>[]

  const to_option = <Value extends string>(entry: unknown): ButtonGroupOption<Value> => {
    if (typeof entry === `string`) return { value: entry as Value, label: entry }
    if (Array.isArray(entry)) {
      const [value, label] = entry as [Value, string]
      return { value, label: label ?? value }
    }
    if (is_object(entry) && typeof entry.value === `string`) {
      const option = entry as ButtonGroupOption<Value>
      return { ...option, label: option.label ?? option.value }
    }
    throw new Error(`ButtonGroup: unsupported option ${JSON.stringify(entry)}`)
  }
</script>

<script lang="ts" generics="Value extends string = string">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { tooltip } from './attachments'
  import CircleSpinner from './CircleSpinner.svelte'
  import Icon from './Icon.svelte'

  type Props = Omit<HTMLAttributes<HTMLDivElement>, `children`> & {
    options: ButtonGroupOptions<Value>
    label?: string // aria-label for the group, since a bare row of buttons has none
    disabled?: boolean // disables every option, on top of per-option `disabled`
    // opt-in trailing asc/desc button; null (default) renders no arrow at all
    sort_order?: `asc` | `desc` | null
    option?: Snippet<[{ option: ButtonGroupOption<Value>; selected: boolean }]>
    on_change?: (selected: Value | Value[] | null) => void
    tooltip_placement?: `top` | `bottom` | `left` | `right`
    // a div cannot legally sit inside phrasing content, so a group rendered in a
    // heading or a paragraph needs to be a span
    as?: string
  } & (
      | { multiple?: false; selected?: Value | null }
      | { multiple: true; selected?: Value[] }
    )

  let {
    options,
    selected = $bindable(),
    multiple = false,
    label,
    disabled = false,
    sort_order = $bindable(null),
    option,
    on_change,
    tooltip_placement = `bottom`,
    as = `div`,
    ...rest
  }: Props = $props()

  const option_list = $derived(
    (Array.isArray(options) ? options : Object.entries(options)).map(to_option<Value>),
  )
  // buttons the keyboard can reach, in render order, so DOM and option indices line up
  const enabled_options = $derived(
    disabled ? [] : option_list.filter((opt) => !opt.disabled),
  )
  const selected_values = $derived(
    Array.isArray(selected) ? selected : selected == null ? [] : [selected],
  )

  // Roving tabindex: one stop for the whole radio group, on the checked option. A
  // selection pointing at no rendered option would otherwise leave nothing tabbable.
  const roving_value = $derived.by(() => {
    if (multiple) return null
    const checked = enabled_options.find((opt) => opt.value === selected_values[0])
    return (checked ?? enabled_options[0])?.value
  })

  function select(value: Value) {
    if (multiple) {
      selected = selected_values.includes(value)
        ? selected_values.filter((val) => val !== value)
        : [...selected_values, value]
    } else {
      if (selected === value) return // re-picking the checked radio changes nothing
      selected = value
    }
    on_change?.(selected ?? null)
  }

  // Next focused index given the current one, which is -1 when focus enters the group
  // from outside. Math.max keeps that entry case from stopping one short of the end.
  const step_by: Record<string, (idx: number, count: number) => number> = {
    ArrowRight: (idx, count) => (idx + 1) % count,
    ArrowDown: (idx, count) => (idx + 1) % count,
    ArrowLeft: (idx, count) => (Math.max(idx, 0) - 1 + count) % count,
    ArrowUp: (idx, count) => (Math.max(idx, 0) - 1 + count) % count,
    Home: () => 0,
    End: (_idx, count) => count - 1,
  }

  function handle_keydown(event: KeyboardEvent) {
    const step = step_by[event.key]
    if (!step || !(event.currentTarget instanceof HTMLElement)) return
    const selector = `button:not(:disabled)`
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(selector)]
    if (buttons.length === 0) return
    event.preventDefault()
    const idx = buttons.findIndex((button) => button === document.activeElement)
    const next_idx = step(idx, buttons.length)
    buttons[next_idx]?.focus()
    // A radio group carries its selection with focus; independent toggles do not
    const next_option = enabled_options[next_idx]
    if (!multiple && next_option) select(next_option.value)
  }
</script>

<svelte:element this={as} {...rest} class={[`button-group`, rest.class]}>
  <!-- span, not div: it is display: flex either way and stays valid when `as` is a span -->
  <span
    class="options"
    role={multiple ? `group` : `radiogroup`}
    aria-label={label}
    onkeydown={handle_keydown}
  >
    {#each option_list as opt (opt.value)}
      {@const is_selected = selected_values.includes(opt.value)}
      <button
        type="button"
        role={multiple ? undefined : `radio`}
        aria-checked={multiple ? undefined : is_selected}
        aria-pressed={multiple ? is_selected : undefined}
        tabindex={multiple ? undefined : opt.value === roving_value ? 0 : -1}
        disabled={disabled || opt.disabled}
        data-value={opt.value}
        onclick={() => select(opt.value)}
        {@attach tooltip({ content: opt.tooltip, placement: tooltip_placement })}
      >
        {#if option}
          {@render option({ option: opt, selected: is_selected })}
        {:else}
          {#if opt.icon}<Icon icon={opt.icon} />{/if}
          {opt.label}
          {#if opt.loading}<CircleSpinner size="0.8em" />{/if}
        {/if}
      </button>
    {/each}
  </span>
  {#if sort_order}
    <button
      type="button"
      class="sort-order"
      {disabled}
      aria-label="Sort {sort_order === `asc` ? `ascending` : `descending`}"
      onclick={() => (sort_order = sort_order === `asc` ? `desc` : `asc`)}
    >
      {sort_order === `asc` ? `↑` : `↓`}
    </button>
  {/if}
</svelte:element>

<style>
  .button-group {
    display: var(--btn-group-display, inline-flex);
    flex-wrap: wrap;
    align-items: center;
    gap: var(--btn-group-gap, 4pt);
    padding: var(--btn-group-padding, 0);
    background: var(--btn-group-bg, transparent);
    border: var(--btn-group-border, none);
    border-radius: var(--btn-group-radius, 4pt);
    .options {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: inherit;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: var(--btn-group-btn-gap, 0.4em);
      padding: var(--btn-group-btn-padding, 2pt 6pt);
      background: var(--btn-group-btn-bg, transparent);
      color: var(--btn-group-btn-color, inherit);
      border: var(--btn-group-btn-border, 1px solid transparent);
      border-radius: var(--btn-group-btn-radius, 3pt);
      /* longhands rather than the `font` shorthand, which would also set weight and
         style: this selector outranks a consumer's own `button {}` rule, so the
         shorthand silently overrode their global button typography */
      font-family: var(--btn-group-btn-font-family, inherit);
      font-size: var(--btn-group-btn-font-size, inherit);
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      background: var(
        --btn-group-btn-hover-bg,
        light-dark(rgba(0, 0, 0, 0.07), rgba(255, 255, 255, 0.12))
      );
    }
    button:is([aria-checked='true'], [aria-pressed='true']) {
      background: var(
        --btn-group-btn-active-bg,
        light-dark(rgba(0, 0, 0, 0.13), rgba(255, 255, 255, 0.22))
      );
      color: var(--btn-group-btn-active-color, inherit);
      border-color: var(--btn-group-btn-active-border-color, transparent);
    }
    button:disabled {
      opacity: var(--btn-group-btn-disabled-opacity, 0.5);
      cursor: not-allowed;
    }
  }
</style>
