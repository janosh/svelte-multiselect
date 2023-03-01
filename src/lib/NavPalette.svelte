<script lang="ts">
  import { goto } from '$app/navigation'
  import { tick } from 'svelte/internal'
  import Select from '.'

  export let routes: string[] | { label: string; route: string }[]
  export let trigger: string = `k`

  let open = false
  let dialog: HTMLDialogElement
  let input: HTMLInputElement

  async function toggle(event: KeyboardEvent) {
    if (event.key === trigger && event.metaKey && !open) {
      // open on cmd+k
      open = true
      await tick() // wait for dialog to open and input to be mounted
      input?.focus()
    } else if (event.key === `Escape` && open) {
      // close on escape
      open = false
    }
  }

  function close_if_outside(event: MouseEvent) {
    if (open && !dialog?.contains(event.target as Node)) {
      open = false
    }
  }

  function move(
    event: CustomEvent<{ option: string | { label: string; route: string } }>
  ) {
    const { option } = event.detail
    if (typeof option == `object`) goto(option.route)
    else goto(option)
    open = false
  }
</script>

<svelte:window on:keydown={toggle} on:click={close_if_outside} />

{#if open}
  <dialog class:open bind:this={dialog}>
    <Select
      options={routes}
      bind:input
      placeholder="Go to..."
      on:add={move}
      on:keydown={toggle}
      --sms-bg="var(--sms-options-bg)"
      --sms-width="min(20em, 90vw)"
      --sms-max-width="none"
    />
  </dialog>
{/if}

<style>
  dialog {
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
</style>
