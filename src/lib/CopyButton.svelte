<script lang="ts">
  import type { Snippet } from 'svelte'
  import { mount, onDestroy, unmount } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import CopyButton from './CopyButton.svelte'
  import Icon from './Icon.svelte'
  import type { IconName } from './icons'

  type State = `ready` | `success` | `error`

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
      ready: { icon: `Copy`, text: `` },
      success: { icon: `Check`, text: `` },
      error: { icon: `Alert`, text: `` },
    },
    children,
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
    labels?: Record<State, { icon: IconName; text: string }>
    children?: Snippet<[{ state: State; icon: IconName; text: string }]>
  } = $props()

  let reset_timeout: ReturnType<typeof setTimeout> | null = null
  const clear_reset_timeout = (): void => {
    if (reset_timeout === null) return
    clearTimeout(reset_timeout)
    reset_timeout = null
  }
  onDestroy(clear_reset_timeout)

  $effect(() => {
    if (!global && !global_selector) return

    type MountedCopyButton = Parameters<typeof unmount>[0]
    const mounted_copy_buttons: { pre: HTMLElement; component: MountedCopyButton }[] =
      []
    const apply_copy_buttons = () => {
      const style = `position: absolute; top: 6pt; right: 6pt; ${rest.style ?? ``}`
      const skip_sel = skip_selector ?? as
      for (const code of document.querySelectorAll(global_selector ?? `pre > code`)) {
        const pre = code.parentElement
        if (!pre) continue
        const existing_copy_button = pre.querySelector(`[data-sms-copy]`)
        if (existing_copy_button && existing_copy_button.localName !== as) {
          existing_copy_button.remove()
        }
        const already_mounted = mounted_copy_buttons.some((entry) =>
          entry.pre === pre
        )
        // If a stale button from a previous effect pass still exists, remove it synchronously
        // so this pass can mount a fresh button with updated props/callbacks.
        if (!already_mounted) pre.querySelector(`[data-sms-copy]`)?.remove()
        const content = code.textContent ?? ``
        if (
          !pre.querySelector(`[data-sms-copy]`) &&
          !(skip_sel && pre.querySelector(skip_sel))
        ) {
          const mounted_copy_button = mount(CopyButton, {
            target: pre,
            props: {
              content,
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
          }) as MountedCopyButton
          mounted_copy_buttons.push({ pre, component: mounted_copy_button })
        }
      }
    }

    apply_copy_buttons()
    const observer = new MutationObserver(apply_copy_buttons)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      for (const { pre, component } of mounted_copy_buttons) {
        // unmount() is async; remove marker node now to avoid blocking remount on next effect run.
        pre.querySelector(`[data-sms-copy]`)?.remove()
        void unmount(component)
      }
    }
  })

  async function copy() {
    if (disabled || !content) return
    clear_reset_timeout()
    try {
      await navigator.clipboard.writeText(content)
      state = `success`
      on_copy_success(content)
    } catch (err) {
      console.error(err)
      state = `error`
      on_copy_error(err, content)
    }
    if (reset_sec > 0) {
      reset_timeout = setTimeout(() => {
        state = `ready`
        reset_timeout = null
      }, reset_sec * 1000)
    }
  }
</script>

{#if !(global || global_selector)}
  {@const { text, icon } = labels[state]}
  <svelte:element
    this={as}
    onclick={copy}
    onkeydown={(event) => {
      if (event.key === `Enter` || event.key === ` `) {
        event.preventDefault()
        copy()
      }
    }}
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled || undefined}
    {...(as === `button` ? { disabled } : {})}
    data-sms-copy=""
    {...rest}
  >
    {#if children}
      {@render children({ state, icon, text })}
    {:else}
      <span>
        <Icon {icon} />
        <span>{@html text}</span>
      </span>
    {/if}
  </svelte:element>
{/if}

<style>
  [data-sms-copy] > span {
    display: inline-flex;
    gap: 0.35em;
    align-items: center;
    line-height: 1;
    vertical-align: middle;
    > span {
      line-height: 1;
    }
    :global(svg) {
      display: block;
    }
  }
</style>
