<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  export type Item = string | [string, unknown]
  type T = $$Generic<Item>
  const min_items = 3

  interface Props extends Omit<HTMLAttributes<HTMLElement>, `children` | `onkeyup`> {
    items?: T[]
    node?: string
    current?: string
    log?: `verbose` | `errors` | `silent`
    nav_options?: { replace_state: boolean; no_scroll: boolean }
    titles?: { prev: string; next: string }
    onkeyup?: ((obj: { prev: Item; next: Item }) => Record<string, string>) | null
    prev_snippet?: Snippet<[{ item: Item }]>
    children?: Snippet<[{ kind: `prev` | `next`; item: Item }]>
    between?: Snippet<[]>
    next_snippet?: Snippet<[{ item: Item }]>
  }
  let {
    items = [],
    node = `nav`,
    current = ``,
    log = `errors`,
    nav_options = { replace_state: true, no_scroll: true },
    titles = { prev: `&larr; Previous`, next: `Next &rarr;` },
    onkeyup = ({ prev, next }) => ({
      ArrowLeft: prev[0],
      ArrowRight: next[0],
    }),
    prev_snippet,
    children,
    between,
    next_snippet,
    ...rest
  }: Props = $props()

  // Convert items to consistent [key, value] format
  let items_arr = $derived(
    (items ?? []).map((
      itm,
    ) => (typeof itm === `string` ? [itm, itm] : itm)) as Item[],
  )

  // Calculate prev/next items with wraparound
  let idx = $derived(items_arr.findIndex(([key]) => key === current))
  let prev = $derived(items_arr[idx - 1] ?? items_arr[items_arr.length - 1])
  let next = $derived(items_arr[idx + 1] ?? items_arr[0])

  // Validation and logging
  $effect.pre(() => {
    if (log !== `silent`) {
      if (items_arr.length < min_items && log === `verbose`) {
        console.warn(
          `PrevNext received ${items_arr.length} items - minimum of ${min_items} expected`,
        )
      }

      if (idx < 0 && log === `errors`) {
        const valid = items_arr.map(([key]) => key)
        console.error(
          `PrevNext received invalid current=${current}, expected one of ${valid}`,
        )
      }
    }
  })

  function handle_keyup(event: KeyboardEvent) {
    if (!onkeyup) return
    if ((items_arr?.length ?? 0) < min_items) return
    const key_map = onkeyup({ prev, next })
    const to = key_map[event.key]
    if (to) {
      const { replace_state, no_scroll } = nav_options
      const [scroll_x, scroll_y] = no_scroll
        ? [window.scrollX, window.scrollY]
        : [0, 0]
      const goto = window.history[replace_state ? `replaceState` : `pushState`]
      goto.call(window.history, {}, ``, to) // Navigate using appropriate history method

      if (no_scroll) window.scrollTo(scroll_x, scroll_y) // Restore scroll position if needed
    }
  }
</script>

<svelte:window onkeyup={handle_keyup} />

{#if items_arr.length >= min_items}
  <svelte:element this={node} class="prev-next" {...rest}>
    <!-- ensures `prev` is a defined [key, value] tuple.
      Due to prior normalization of the `items` prop, any defined `prev` item
      is guaranteed to be a 2-element array except if `prev` is null.
    -->
    {#if prev?.length >= 2}
      {#if prev_snippet}
        {@render prev_snippet({ item: prev })}
      {:else if children}
        {@render children({ kind: `prev`, item: prev })}
      {:else}
        <div>
          {#if titles.prev}<span>{@html titles.prev}</span>{/if}
          <a href={prev[0]}>{prev[0]}</a>
        </div>
      {/if}
    {/if}
    {@render between?.()}
    {#if next?.length >= 2}
      {#if next_snippet}
        {@render next_snippet({ item: next })}
      {:else if children}
        {@render children({ kind: `next`, item: next })}
      {:else}
        <div>
          {#if titles.next}<span>{@html titles.next}</span>{/if}
          <a href={next[0]}>{next[0]}</a>
        </div>
      {/if}
    {/if}
  </svelte:element>
{/if}

<style>
  .prev-next {
    display: flex;
    list-style: none;
    place-content: space-between;
    gap: var(--prev-next-gap, 2em);
    padding: var(--prev-next-padding, 0);
    margin: var(--prev-next-margin, 3em auto);
  }
  .prev-next a {
    color: var(--prev-next-color);
    background: var(--prev-next-link-bg);
    padding: var(--prev-next-link-padding);
    border-radius: var(--prev-next-link-border-radius);
  }
  .prev-next span {
    display: block;
    margin: var(--prev-next-label-margin, 0 auto 1ex);
  }
  .prev-next > div:nth-child(2) {
    text-align: right;
  }
</style>
