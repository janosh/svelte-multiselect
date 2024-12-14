<script lang="ts">
  import { tick } from 'svelte'
  import { fade } from 'svelte/transition'
  import Select from './MultiSelect.svelte'

  
  interface Props {
    actions: Action[];
    triggers?: string[];
    close_keys?: string[];
    fade_duration?: number; // in ms
    style?: string; // for dialog
    // for span in option slot, has no effect when passing a slot
    span_style?: string;
    open?: boolean;
    dialog?: HTMLDialogElement | null;
    input?: HTMLInputElement | null;
    placeholder?: string;
    children?: import('svelte').Snippet;
    [key: string]: any
  }

  let {
    actions,
    triggers = [`k`],
    close_keys = [`Escape`],
    fade_duration = 200,
    style = ``,
    span_style = ``,
    open = $bindable(false),
    dialog = $bindable(null),
    input = $bindable(null),
    placeholder = `Filter actions...`,
    children,
    ...rest
  }: Props = $props();

  type Action = { label: string; action: () => void }

  async function toggle(event: KeyboardEvent) {
    if (triggers.includes(event.key) && event.metaKey && !open) {
      // open on cmd+trigger
      open = true
      await tick() // wait for dialog to open and input to be mounted
      input?.focus()
    } else if (close_keys.includes(event.key) && open) {
      open = false
    }
  }

  function close_if_outside(event: MouseEvent) {
    if (open && !dialog?.contains(event.target as Node)) {
      open = false
    }
  }

  function trigger_action_and_close(event: CustomEvent<{ option: Action }>) {
    event.detail.option.action(event.detail.option.label)
    open = false
  }

  const children_render = $derived(children);
</script>

<svelte:window onkeydown={toggle} onclick={close_if_outside} />

{#if open}
  <dialog open bind:this={dialog} transition:fade={{ duration: fade_duration }} {style}>
    <Select
      options={actions}
      bind:input
      {placeholder}
      on:add={trigger_action_and_close}
      on:keydown={toggle}
      {...rest}
      
    >
      {#snippet children({ option })}
            <!-- wait for https://github.com/sveltejs/svelte/pull/8304 -->
        {#if children_render}{@render children_render()}{:else}
          <span style={span_style}>{option.label}</span>
        {/if}
                {/snippet}
        </Select>
  </dialog>
{/if}

<style>
  :where(:global(dialog)) {
    position: fixed;
    top: 30%;
    border: none;
    padding: 0;
    background-color: transparent;
    display: flex;
    color: white;
    z-index: 10;
    font-size: 2.4ex;
  }
  dialog :global(div.multiselect) {
    --sms-bg: var(--sms-options-bg);
    --sms-width: min(20em, 90vw);
    --sms-max-width: none;
    --sms-placeholder-color: lightgray;
    --sms-options-margin: 1px 0;
    --sms-options-border-radius: 0 0 1ex 1ex;
  }
</style>
