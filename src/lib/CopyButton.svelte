<script lang="ts">
  import { CopyButton, Icon } from '$lib'
  import type { Snippet } from 'svelte'
  import { mount } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { IconName } from './icons'

  type State = `ready` | `success` | `error`

  let {
    content = ``,
    state = $bindable(`ready`),
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
    global_selector?: string | null
    global?: boolean
    skip_selector?: string | null
    as?: string
    labels?: Record<State, { icon: IconName; text: string }>
    children?: Snippet<[{ state: State; icon: IconName; text: string }]>
  } = $props()

  $effect(() => {
    if (!global && !global_selector) return

    const apply_copy_buttons = () => {
      const btn_style = `position: absolute; top: 6pt; right: 6pt; ${
        rest.style ?? ``
      }`
      const skip_sel = skip_selector ?? as
      for (const code of document.querySelectorAll(global_selector ?? `pre > code`)) {
        const pre = code.parentElement
        const content = code.textContent ?? ``
        if (
          pre && !pre.querySelector(`[data-sms-copy]`) &&
          !(skip_sel && pre.querySelector(skip_sel))
        ) {
          mount(CopyButton, {
            target: pre,
            props: {
              content,
              as,
              labels,
              ...rest,
              style: btn_style,
              'data-sms-copy': ``,
            },
          })
        }
      }
    }

    apply_copy_buttons()
    const observer = new MutationObserver(apply_copy_buttons)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  })

  async function copy() {
    try {
      await navigator.clipboard.writeText(content)
      state = `success`
    } catch (err) {
      console.error(err)
      state = `error`
    }
    setTimeout(() => (state = `ready`), 2000)
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
    tabindex={0}
    data-sms-copy=""
    {...rest}
  >
    {#if children}
      {@render children({ state, icon, text })}
    {:else}
      <Icon {icon} />{@html text}
    {/if}
  </svelte:element>
{/if}
