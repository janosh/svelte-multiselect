<script module lang="ts">
  type CmdAction = {
    id?: string | number
    label: string
    action: (label: string) => void
    group?: string
    shortcut?: string
    description?: string
  } & Record<string, unknown>
</script>

<script lang="ts" generics="Action extends CmdAction = CmdAction">
  import type { ComponentProps } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { fade } from 'svelte/transition'
  import MultiSelect from './MultiSelect.svelte'
  import type { MultiSelectProps } from './types'
  import { matches_shortcut } from './utils'

  // MultiSelect's option snippet param (option + idx/selected/active/disabled)
  type OptionSnippetParams = Parameters<
    NonNullable<MultiSelectProps<Action>[`option`]>
  >[0]

  let {
    actions,
    triggers = [`k`],
    close_keys = [`Escape`],
    fade_duration = 200,
    dialog_style = ``,
    open = $bindable(false),
    dialog = $bindable(null),
    input = $bindable(null),
    aria_label = `Command palette`,
    placeholder = `Filter actions...`,
    dialog_props,
    global_shortcuts = true,
    recent_actions_key = null,
    max_recent = 20,
    ...rest
  }: Omit<ComponentProps<typeof MultiSelect<Action>>, `options`> & {
    actions: Action[]
    triggers?: string[]
    close_keys?: string[]
    fade_duration?: number // in ms
    dialog_style?: string // inline style for the dialog element
    open?: boolean
    dialog?: HTMLDialogElement | null
    input?: HTMLInputElement | null
    aria_label?: string
    placeholder?: string
    dialog_props?: HTMLAttributes<HTMLDialogElement>
    // run action.shortcut hotkeys globally while the palette is closed (default: true)
    global_shortcuts?: boolean
    // localStorage key to persist recently triggered actions. When set, recent
    // actions rank first in the dropdown (most recent on top). null = disabled
    recent_actions_key?: string | null
    max_recent?: number // cap on persisted recent actions (default: 20)
  } = $props()

  // === Recent actions (frecency ranking) ===
  let recent_action_ids = $state<string[]>([])

  const get_action_id = (action: CmdAction): string => `${action.id ?? action.label}`
  const can_track_recents = $derived(
    new Set(actions.map(get_action_id)).size === actions.length &&
      (actions.every((action) => action.id !== undefined) ||
        new Set(actions.map((action) => action.label)).size === actions.length),
  )

  // load persisted recents (client-only since $effect doesn't run during SSR)
  $effect(() => {
    if (!recent_actions_key || !can_track_recents) return
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(recent_actions_key) ?? `[]`)
      recent_action_ids = Array.isArray(stored)
        ? stored.filter((rec) => typeof rec === `string`)
        : []
    } catch {
      recent_action_ids = [] // ignore corrupted storage
    }
  })

  function record_recent(action: Action) {
    if (!recent_actions_key || !can_track_recents) return
    const action_id = get_action_id(action)
    recent_action_ids = [
      action_id,
      ...recent_action_ids.filter((recent_id) => recent_id !== action_id),
    ].slice(0, max_recent)
    try {
      localStorage.setItem(recent_actions_key, JSON.stringify(recent_action_ids))
    } catch {
      // storage full or unavailable - recents just won't persist
    }
  }

  // recently triggered actions first (most recent on top), rest keep original order
  const sorted_actions = $derived.by(() => {
    if (!recent_actions_key || !can_track_recents || recent_action_ids.length === 0)
      return actions
    const rank = new Map(recent_action_ids.map((action_id, idx) => [action_id, idx]))
    return [...actions].toSorted(
      (left_action, right_action) =>
        (rank.get(get_action_id(left_action)) ?? actions.length) -
        (rank.get(get_action_id(right_action)) ?? actions.length),
    )
  })

  // === Shortcut display ===
  // Map shortcut segments to display symbols (deterministic across platforms)
  const key_symbols: Record<string, string> = {
    meta: `⌘`,
    cmd: `⌘`,
    shift: `⇧`,
    alt: `⌥`,
    ctrl: `Ctrl`,
    enter: `↵`,
    backspace: `⌫`,
    delete: `⌦`,
    escape: `Esc`,
    arrowup: `↑`,
    arrowdown: `↓`,
    arrowleft: `←`,
    arrowright: `→`,
  }
  const format_shortcut = (shortcut: string): string[] =>
    shortcut.split(`+`).map((part) => {
      const key_segment = part.trim().toLowerCase()
      // title-case unknown multi-char segments, upper-case single chars (empty stays empty)
      const title_case = key_segment.charAt(0).toUpperCase() + key_segment.slice(1)
      return (
        key_symbols[key_segment] ??
        (key_segment.length > 1 ? title_case : key_segment.toUpperCase())
      )
    })

  // only swap in the custom option snippet when an action actually uses shortcut/description
  const has_action_meta = $derived(
    actions.some((action) => action.shortcut || action.description),
  )

  $effect(() => {
    if (!dialog || !open || dialog.open) return
    try {
      dialog.showModal()
    } catch {
      // showModal missing (older DOM impls) or dialog not in document
      dialog.setAttribute(`open`, ``)
    }
  })

  $effect(() => {
    if (open && input && document.activeElement !== input) input.focus()
  })

  function toggle(event: KeyboardEvent): boolean {
    const should_open =
      !open && triggers.includes(event.key) && (event.metaKey || event.ctrlKey)
    const should_close = open && close_keys.includes(event.key)
    if (!should_open && !should_close) return false
    event.preventDefault()
    open = should_open
    return true
  }

  function handle_window_keydown(event: KeyboardEvent) {
    if (toggle(event)) return
    // run action hotkeys globally while the palette is closed
    if (open || !global_shortcuts) return
    const action = actions.find((cmd_action) =>
      matches_shortcut(event, cmd_action.shortcut),
    )
    if (!action) return
    event.preventDefault()
    record_recent(action)
    action.action(action.label)
  }

  function close_if_outside(event: MouseEvent) {
    const target = event.target
    if (!open || !(target instanceof HTMLElement)) return
    // backdrop clicks on a modal dialog have target === dialog, so close unless the click
    // is on this palette's MultiSelect (scoped inside the dialog) or its options list
    if (dialog?.contains(target) && target.closest(`div.multiselect`)) return
    const listbox_id = input?.getAttribute(`aria-controls`)
    const listbox = listbox_id && document.querySelector(`#${CSS.escape(listbox_id)}`)
    if (listbox && listbox.contains(target)) return
    open = false
  }

  function trigger_action_and_close({ option }: { option: Action }) {
    if (!option?.action) return
    record_recent(option)
    option.action(option.label)
    open = false
  }
</script>

<svelte:window onkeydown={handle_window_keydown} onclick={close_if_outside} />

{#snippet action_item({ option }: OptionSnippetParams)}
  <span class="cmd-action">
    <span class="cmd-label">
      {option.label}
      {#if option.description}
        <small class="cmd-description">{option.description}</small>
      {/if}
    </span>
    {#if option.shortcut}
      <span class="cmd-shortcut" aria-hidden="true">
        {#each format_shortcut(option.shortcut) as part, idx (idx)}
          <kbd>{part}</kbd>
        {/each}
      </span>
    {/if}
  </span>
{/snippet}

{#if open}
  <dialog
    bind:this={dialog}
    transition:fade={{ duration: fade_duration }}
    style={dialog_style}
    aria-label={aria_label}
    onclose={() => (open = false)}
    {...dialog_props}
  >
    <MultiSelect
      options={sorted_actions}
      bind:input
      {placeholder}
      key={get_action_id}
      onadd={trigger_action_and_close}
      onkeydown={toggle}
      option={has_action_meta ? action_item : undefined}
      {...rest}
      --sms-bg="var(--sms-options-bg)"
      --sms-width="min(20em, 90vw)"
      --sms-max-width="none"
      --sms-placeholder-color="lightgray"
      --sms-padding="3pt"
      --sms-options-margin="1px 0"
      --sms-options-border-radius="0 0 1ex 1ex"
    />
  </dialog>
{/if}

<style>
  .cmd-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    min-width: 0;
  }
  .cmd-description {
    display: block;
    opacity: 0.6;
    font-size: var(--cmd-description-font-size, 0.75em);
  }
  .cmd-shortcut {
    flex-shrink: 0;
    display: flex;
    gap: 2pt;
  }
  .cmd-shortcut kbd {
    background: var(
      --cmd-kbd-bg,
      light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.15))
    );
    border-radius: 3pt;
    padding: 0 4pt;
    font-size: var(--cmd-kbd-font-size, 0.8em);
    line-height: 1.5;
  }
  :where(dialog) {
    position: fixed;
    top: 30%;
    left: 0;
    right: 0;
    bottom: auto;
    margin: 0 auto;
    border: none;
    padding: var(--cmd-dialog-padding, 6pt);
    background-color: transparent;
    display: flex;
    /* Let command results/popovers escape the dialog; default clipping hides suggestions. */
    overflow: visible;
    color: light-dark(#222, #eee);
    z-index: var(--cmd-palette-z-index, 10);
    font-size: 2.4ex;
  }
</style>
