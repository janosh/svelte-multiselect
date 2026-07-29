<script lang="ts">
  // Mount once high in the app tree; it renders the head of the shared dialog queue.
  import type { HTMLDialogAttributes } from 'svelte/elements'
  import { backdrop_dismiss, focus_trap } from './attachments'
  import { answer_dialog, dialog_queue } from './dialogs.svelte'
  import { chain_handlers } from './utils'

  // An app mounting this alongside its own dialogs needs its card class on the element
  let { ...rest }: Omit<HTMLDialogAttributes, `children`> = $props()

  const request = $derived(dialog_queue[0])
  let dialog_el = $state<HTMLDialogElement | null>(null)

  // showModal() puts the dialog in the top layer with native Escape handling. focus_trap
  // re-runs on every request, which is what moves the keyboard into each new question
  // (answering removes the button that had focus) and hands it back to the opener.
  $effect(() => {
    if (!dialog_el) return
    if (!request) dialog_el.close()
    else if (!dialog_el.open) dialog_el.showModal()
  })
</script>

<dialog
  bind:this={dialog_el}
  {...rest}
  class={[`confirm-dialog`, rest.class]}
  aria-labelledby="confirm-dialog-title"
  {@attach focus_trap({ enabled: Boolean(request) })}
  {@attach backdrop_dismiss()}
  onclose={chain_handlers(() => {
    // Escape and backdrop clicks land here. Answering already shifted the queue, so the
    // close that follows sees no request and resolves nothing.
    if (request) answer_dialog(request.dismiss_id)
  }, rest.onclose)}
>
  {#if request}
    <h2 id="confirm-dialog-title">{request.title}</h2>
    <p>{request.message}</p>
    <!-- Rebuilds the buttons between questions. Keyed on choice id alone, Svelte reused
    the same DOM nodes when consecutive requests offer the same ids, so the second half
    of a double-click landed on the button that now answers the NEXT question. -->
    {#key request}
      <div class="actions">
        {#each request.choices as choice (choice.id)}
          <button
            type="button"
            class={choice.tone}
            onclick={() => answer_dialog(choice.id)}
          >
            {choice.label}
          </button>
        {/each}
      </div>
    {/key}
  {/if}
</dialog>

<style>
  .confirm-dialog {
    /* zero margins are what center a modal dialog in the top layer */
    margin: auto;
    inline-size: var(--confirm-dialog-width, min(30rem, calc(100vw - 2rem)));
    padding: var(--confirm-dialog-padding, 1rem 1.1rem);
    border: var(--confirm-dialog-border, 1px solid light-dark(lightgray, #555));
    border-radius: var(--confirm-dialog-radius, 5pt);
    background: var(--confirm-dialog-bg, light-dark(#fff, #2a2a2e));
    color: var(--confirm-dialog-color, light-dark(#222, #eee));
    box-shadow: var(--confirm-dialog-shadow, 0 3px 12px rgba(0, 0, 0, 0.3));
    &::backdrop {
      background: var(--confirm-dialog-backdrop, rgba(0, 0, 0, 0.42));
      backdrop-filter: var(--confirm-dialog-backdrop-filter, blur(4px));
    }
  }
  h2 {
    margin: 0 0 0.4rem;
    font-size: 1em;
  }
  p {
    margin: 0;
    /* paths and directory lists are long and must not be clipped */
    overflow-wrap: anywhere;
    opacity: 0.8;
    font-size: 0.9em;
    line-height: 1.45;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    margin-block-start: 1rem;
    button {
      padding: var(--confirm-dialog-button-padding, 3pt 8pt);
      border: 1px solid transparent;
      border-radius: 3pt;
      background: var(--confirm-dialog-button-bg, rgba(125, 125, 125, 0.2));
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.accent {
      background: var(--confirm-dialog-accent-bg, cornflowerblue);
      color: var(--confirm-dialog-accent-color, white);
    }
    button.danger {
      background: var(--confirm-dialog-danger-bg, darkred);
      color: var(--confirm-dialog-danger-color, white);
    }
    button:hover {
      border-color: currentColor;
    }
  }
</style>
