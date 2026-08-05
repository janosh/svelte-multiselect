<script lang="ts">
  import type { Snippet } from 'svelte'
  import { mount, unmount } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  // eslint-disable-next-line import/no-self-import -- global mode mounts this component onto external code blocks
  import Self from './CopyButton.svelte'
  import ActionButton from './ActionButton.svelte'
  import Icon from './Icon.svelte'
  import { Alert, Check, Copy, type IconData } from './icons'
  import type { ActionState } from './types'

  type State = Exclude<ActionState, `pending`>

  let {
    content = ``,
    state = $bindable(`ready`),
    disabled = false,
    reset_sec = 2,
    on_copy_success = (_content: string) => {},
    on_copy_error = (_error: unknown, _content: string) => {},
    global_selector = null,
    global = false,
    skip_selector = `button`,
    as = `button`,
    labels = {
      ready: { icon: Copy, text: `` },
      success: { icon: Check, text: `` },
      error: { icon: Alert, text: `` },
    },
    children: copy_children,
    ...rest
  }: Omit<HTMLAttributes<HTMLButtonElement>, `children`> & {
    content?: string
    state?: State
    disabled?: boolean
    reset_sec?: number
    on_copy_success?: (content: string) => void
    on_copy_error?: (error: unknown, content: string) => void
    global_selector?: string | null
    global?: boolean
    skip_selector?: string | null
    as?: string
    labels?: Record<State, { icon: IconData; text: string }>
    children?: Snippet<
      [{ state: State; icon: IconData; text: string; disabled: boolean }]
    >
  } = $props()

  const copy_button_selector = `[data-sms-copy]`

  $effect(() => {
    if (!global && !global_selector) return

    type MountedCopyButton = Parameters<typeof unmount>[0]
    const mounted_copy_buttons: { pre: HTMLElement; component: MountedCopyButton }[] = []
    const apply_copy_buttons = () => {
      const style = `position: absolute; top: 6pt; inset-inline-end: 6pt; ${
        rest.style ?? ``
      }`
      const skip_sel = skip_selector ?? as
      for (const code of document.querySelectorAll(global_selector ?? `pre > code`)) {
        const pre = code.parentElement
        if (!pre) continue
        const existing_copy_button = pre.querySelector(copy_button_selector)
        const already_mounted = mounted_copy_buttons.some((entry) => entry.pre === pre)
        // If a stale button from a previous effect pass still exists, remove it synchronously
        // so this pass can mount a fresh button with updated props/callbacks.
        if (
          existing_copy_button &&
          (!already_mounted || existing_copy_button.localName !== as)
        ) {
          existing_copy_button.remove()
        }
        if (existing_copy_button?.isConnected) continue
        if (skip_sel && pre.querySelector(skip_sel)) continue

        const mounted_copy_button = mount(Self, {
          target: pre,
          props: {
            content: code.textContent ?? ``,
            as,
            labels,
            disabled,
            reset_sec,
            on_copy_success,
            on_copy_error,
            ...rest,
            style,
            'data-sms-copy': ``,
          },
        })
        mounted_copy_buttons.push({ pre, component: mounted_copy_button })
      }
    }

    apply_copy_buttons()
    const observer = new MutationObserver(apply_copy_buttons)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      for (const { pre, component } of mounted_copy_buttons) {
        // unmount() is async; remove marker node now to avoid blocking remount on next effect run.
        pre.querySelector(copy_button_selector)?.remove()
        void unmount(component)
      }
    }
  })

  const handle_action_state = (next_state: ActionState): void => {
    if (next_state !== `pending`) state = next_state
  }
</script>

{#if !(global || global_selector)}
  <ActionButton
    {...rest}
    action={() => navigator.clipboard.writeText(content)}
    {state}
    disabled={disabled || !content}
    reset_ms={reset_sec * 1000}
    {as}
    on_state_change={handle_action_state}
    on_success={() => on_copy_success(content)}
    on_error={(error) => on_copy_error(error, content)}
    data-sms-copy=""
  >
    {#snippet children({ state: action_state, disabled })}
      {@const copy_state = action_state === `pending` ? state : action_state}
      {@const { text, icon } = labels[copy_state]}
      {#if copy_children}
        {@render copy_children({ state: copy_state, icon, text, disabled })}
      {:else}
        <span>
          <Icon {icon} />
          {#if text}<span>{@html text}</span>{/if}
        </span>
      {/if}
    {/snippet}
  </ActionButton>
{/if}
