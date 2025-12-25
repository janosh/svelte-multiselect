<script
  lang="ts"
  generics="Action extends { label: string; action: (label: string) => void } & Record<string, unknown> = { label: string; action: (label: string) => void }"
>
  import type { ComponentProps } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { fade } from 'svelte/transition'
  import MultiSelect from './MultiSelect.svelte'

  let {
    actions,
    triggers = [`k`],
    close_keys = [`Escape`],
    fade_duration = 200,
    dialog_style = ``,
    open = $bindable(false),
    dialog = $bindable(null),
    input = $bindable(null),
    placeholder = `Filter actions...`,
    dialog_props,
    ...rest
  }: Omit<ComponentProps<typeof MultiSelect<Action>>, `options`> & {
    actions: Action[]
    triggers?: string[]
    close_keys?: string[]
    fade_duration?: number // in ms
    dialog_style?: string // for dialog
    // for span in option snippet, has no effect when specifying a custom option snippet
    open?: boolean
    dialog?: HTMLDialogElement | null
    input?: HTMLInputElement | null
    placeholder?: string
    dialog_props?: HTMLAttributes<HTMLDialogElement>
  } = $props()

  $effect(() => {
    if (open && input && document.activeElement !== input) input.focus()
  })

  async function toggle(event: KeyboardEvent) {
    const is_trigger = triggers.includes(event.key) &&
      (event.metaKey || event.ctrlKey)
    if (is_trigger && !open) open = true
    else if (close_keys.includes(event.key) && open) open = false
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
    option.action(option.label)
    open = false
  }
</script>

<svelte:window onkeydown={toggle} onclick={close_if_outside} />

{#if open}
  <dialog
    open
    bind:this={dialog}
    transition:fade={{ duration: fade_duration }}
    style={dialog_style}
    {...dialog_props}
  >
    <MultiSelect
      options={actions}
      bind:input
      {placeholder}
      onadd={trigger_action_and_close}
      onkeydown={toggle}
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
  :where(dialog) {
    position: fixed;
    top: 30%;
    border: none;
    padding: 0;
    background-color: transparent;
    display: flex;
    color: light-dark(#222, #eee);
    z-index: 10;
    font-size: 2.4ex;
  }
</style>
