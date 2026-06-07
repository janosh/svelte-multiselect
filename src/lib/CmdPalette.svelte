<script
  lang="ts"
  generics="Action extends { label: string; action: (label: string) => void; group?: string; shortcut?: string; description?: string } & Record<string, unknown> = { label: string; action: (label: string) => void; group?: string; shortcut?: string; description?: string }"
>
  import type { ComponentProps } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { fade } from 'svelte/transition'
  import MultiSelect from './MultiSelect.svelte'
  import type { MultiSelectProps } from './types'
  import { matches_shortcut } from './utils'

  // MultiSelect's option snippet type and its param (option + idx/selected/active/disabled)
  type OptionSnippet = NonNullable<MultiSelectProps<Action>[`option`]>
  type OptionSnippetParams = Parameters<OptionSnippet>[0]

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
  let recent_labels = $state<string[]>([])

  // load persisted recents (client-only since $effect doesn't run during SSR)
  $effect(() => {
    if (!recent_actions_key) return
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem(recent_actions_key) ?? `[]`,
      )
      recent_labels = Array.isArray(stored)
        ? stored.filter((rec) => typeof rec === `string`)
        : []
    } catch {
      recent_labels = [] // ignore corrupted storage
    }
  })

  function record_recent(label: string) {
    if (!recent_actions_key) return
    recent_labels = [label, ...recent_labels.filter((rec) => rec !== label)]
      .slice(0, max_recent)
    try {
      localStorage.setItem(recent_actions_key, JSON.stringify(recent_labels))
    } catch {
      // storage full or unavailable - recents just won't persist
    }
  }

  // recently triggered actions first (most recent on top), rest keep original order
  const sorted_actions = $derived.by(() => {
    if (!recent_actions_key || recent_labels.length === 0) return actions
    const rank = new Map(recent_labels.map((label, idx) => [label, idx]))
    // actions.length as fallback keeps non-recent actions in original order (stable sort)
    return [...actions].toSorted((act1, act2) =>
      (rank.get(act1.label) ?? actions.length) - (rank.get(act2.label) ?? actions.length)
    )
  })

  // === Shortcut display ===
  // Map shortcut segments to display symbols (deterministic across platforms)
  const KEY_SYMBOLS: Record<string, string> = {
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
      const seg = part.trim().toLowerCase()
      // title-case unknown multi-char segments, upper-case single chars (empty stays empty)
      return KEY_SYMBOLS[seg] ??
        (seg.length > 1 ? seg[0].toUpperCase() + seg.slice(1) : seg.toUpperCase())
    })

  // only swap in the custom option snippet when an action actually uses shortcut/description
  const has_action_meta = $derived(
    actions.some((act) => act.shortcut || act.description),
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

  function toggle(event: KeyboardEvent) {
    const is_trigger = triggers.includes(event.key) &&
      (event.metaKey || event.ctrlKey)
    if (is_trigger && !open) open = true
    else if (close_keys.includes(event.key) && open) open = false
  }

  function handle_window_keydown(event: KeyboardEvent) {
    toggle(event)
    // run action hotkeys globally while the palette is closed
    if (open || !global_shortcuts) return
    const action = actions.find((act) => matches_shortcut(event, act.shortcut))
    if (action) {
      event.preventDefault()
      record_recent(action.label)
      action.action(action.label)
    }
  }

  function close_if_outside(event: MouseEvent) {
    const target = event.target
    if (!target || !(target instanceof HTMLElement)) return
    if (open && !dialog?.contains(target) && !target.closest(`ul.options`)) {
      open = false
    }
  }

  function trigger_action_and_close({ option }: { option: Action }) {
    if (!option?.action) return
    record_recent(option.label)
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
        {#each format_shortcut(option.shortcut) as part, idx (idx)}<kbd>{part}</kbd>{/each}
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
      onadd={trigger_action_and_close}
      onkeydown={toggle}
      option={has_action_meta
        // svelte2tsx types inline snippets as `() => ReturnType<Snippet>`, whose
        // unique-symbol brand doesn't unify with Snippet<[...]> (svelte#13670). A
        // plain assertion suffices since the shapes are otherwise identical.
        ? action_item as OptionSnippet
        : undefined}
      {...rest}
      --sms-bg="var(--sms-options-bg)"
      --sms-width="min(20em, 90vw)"
      --sms-max-width="none"
      --sms-placeholder-color="lightgray"
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
    padding: 0;
    background-color: transparent;
    display: flex;
    /* Let command results/popovers escape the dialog; default clipping hides suggestions. */
    overflow: visible;
    color: light-dark(#222, #eee);
    z-index: var(--cmd-palette-z-index, 10);
    font-size: 2.4ex;
  }
</style>
