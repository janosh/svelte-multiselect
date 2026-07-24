<script module lang="ts">
  import type {
    CmdAction,
    LoadOptionsParams,
    LoadOptionsResult,
    PageSearchNavigateDetails,
  } from './types'
  import { cmd_action_matches, slug_to_title } from './utils'

  type PagefindAction = CmdAction & { url?: string }

  type PagefindSubResult = { title: string; url: string; plain_excerpt: string }

  type PagefindResultData = {
    url: string
    plain_excerpt: string
    meta: Record<string, string>
    sub_results: PagefindSubResult[]
  }

  type PagefindResult = { id: string; data: () => Promise<PagefindResultData> }

  type PagefindApi = {
    search: (query: string) => Promise<{ results: PagefindResult[] } | null>
  }

  type PagefindSearchCache = {
    query: string
    results: Promise<PagefindResult[]>
    actions: PagefindAction[]
    next_result_idx: number
  }

  type PagefindLoaderOptions = {
    fallback_actions?: PagefindAction[]
    fuzzy?: boolean
    load_pagefind?: () => Promise<PagefindApi>
    navigate?: (url: string, details: PageSearchNavigateDetails) => unknown
    pagefind_path?: string
    transform_url?: (url: string) => string
  }

  const MAX_DESCRIPTION_LENGTH = 240

  const strip_html_extension = (url: string): string => {
    const suffix_start = url.search(/[?#]/)
    const [path, suffix] =
      suffix_start < 0 ? [url, ``] : [url.slice(0, suffix_start), url.slice(suffix_start)]
    return `${path.replace(/\/index\.html$/, `/`).replace(/\.html$/, ``)}${suffix}`
  }

  const paginate_actions = (
    actions: PagefindAction[],
    offset: number,
    limit: number,
  ): LoadOptionsResult<PagefindAction> => ({
    options: actions.slice(offset, offset + limit),
    hasMore: offset + limit < actions.length,
  })

  const decode_html_entities = (text: string): string => {
    const textarea = document.createElement(`textarea`)
    textarea.innerHTML = text
    return textarea.value
  }

  const page_title_from_url = (url: string): string => {
    const path = url
      .split(/[?#]/)[0]
      .replace(/(?:\/index)?\.html$/, ``)
      .replace(/\/+$/, ``)
    if (!path) return `Home`
    const final_segment = path.slice(path.lastIndexOf(`/`) + 1)
    return slug_to_title(decodeURIComponent(final_segment))
  }

  const pagefind_result_to_actions = (
    result_id: string,
    query: string,
    result: PagefindResultData,
    navigate: (url: string, details: PageSearchNavigateDetails) => unknown,
    transform_url: (url: string) => string,
  ): PagefindAction[] => {
    const page_title = result.meta.title || page_title_from_url(result.url)
    const sections = result.sub_results.length ? result.sub_results : [undefined]

    return sections.map((section, section_idx) => {
      const url = transform_url(section?.url ?? result.url)
      const section_title = section?.title.trim()
      const label =
        section_title && section_title !== page_title
          ? `${page_title} › ${section_title}`
          : page_title
      const full_description = decode_html_entities(
        section?.plain_excerpt ?? result.plain_excerpt,
      )
        .replaceAll(/\s+/g, ` `)
        .trim()
      const description =
        full_description.length > MAX_DESCRIPTION_LENGTH
          ? `${full_description.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`
          : full_description

      return {
        id: `pagefind:${result_id}:${section_idx}:${url}`,
        label,
        description,
        url,
        action: () => void navigate(url, { query, label, description }),
      }
    })
  }

  const create_pagefind_loader = ({
    fallback_actions = [],
    fuzzy = false,
    load_pagefind,
    navigate = (url) => globalThis.location.assign(url),
    pagefind_path = `/pagefind/pagefind.js`,
    transform_url = (url) => url,
  }: PagefindLoaderOptions = {}) => {
    let pagefind_api_promise: Promise<PagefindApi> | undefined
    let search_cache: PagefindSearchCache | undefined
    const load_api =
      load_pagefind ??
      (async () => (await import(/* @vite-ignore */ pagefind_path)) as PagefindApi)

    return async ({
      search,
      offset,
      limit,
    }: LoadOptionsParams): Promise<LoadOptionsResult<PagefindAction>> => {
      const query = search.trim()
      if (!query) return paginate_actions(fallback_actions, offset, limit)
      const fallback_result = () =>
        paginate_actions(
          fallback_actions.filter((action) => cmd_action_matches(action, query, fuzzy)),
          offset,
          limit,
        )
      try {
        if (offset === 0 || search_cache?.query !== query) {
          search_cache = {
            query,
            results: (async () => {
              const pagefind_api = await (pagefind_api_promise ??= load_api())
              return (await pagefind_api.search(query))?.results ?? []
            })(),
            actions: [],
            next_result_idx: 0,
          }
        }
        const cache = search_cache
        const page_results = await cache.results
        if (page_results.length === 0) return fallback_result()
        const target_count = offset + limit

        while (
          cache.actions.length < target_count &&
          cache.next_result_idx < page_results.length
        ) {
          const result_batch = page_results.slice(
            cache.next_result_idx,
            cache.next_result_idx + limit,
          )
          cache.next_result_idx += result_batch.length
          const settled_results = await Promise.allSettled(
            result_batch.map(async (result) =>
              pagefind_result_to_actions(
                result.id,
                query,
                await result.data(),
                navigate,
                transform_url,
              ),
            ),
          )
          cache.actions.push(
            ...settled_results.flatMap((result) =>
              result.status === `fulfilled` ? result.value : [],
            ),
          )
        }
        if (cache.actions.length === 0) return fallback_result()

        return {
          options: cache.actions.slice(offset, target_count),
          hasMore:
            cache.actions.length > target_count ||
            cache.next_result_idx < page_results.length,
        }
      } catch {
        pagefind_api_promise = undefined
        return fallback_result()
      }
    }
  }
</script>

<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import CommandMenu from './CommandMenu.svelte'

  type Props = Omit<
    ComponentProps<typeof CommandMenu>,
    | `actions`
    | `dialog`
    | `input`
    | `loadOptions`
    | `max_recent`
    | `open`
    | `recent_actions_key`
  > &
    PagefindLoaderOptions & {
      batch_size?: number
      debounce_ms?: number
      dialog?: HTMLDialogElement | null
      input?: HTMLInputElement | null
      open?: boolean
      strip_html_suffix?: boolean
    }

  let {
    fallback_actions = [],
    load_pagefind,
    navigate,
    pagefind_path,
    transform_url,
    strip_html_suffix = false,
    batch_size = 12,
    debounce_ms = 120,
    fuzzy = false,
    open = $bindable(false),
    dialog = $bindable(null),
    input = $bindable(null),
    ...rest
  }: Props = $props()

  const load_options = $derived(
    create_pagefind_loader({
      fallback_actions,
      fuzzy,
      load_pagefind,
      navigate,
      pagefind_path,
      transform_url: (url) => {
        const normalized_url = strip_html_suffix ? strip_html_extension(url) : url
        return transform_url?.(normalized_url) ?? normalized_url
      },
    }),
  )
</script>

<CommandMenu
  actions={fallback_actions}
  bind:open
  bind:dialog
  bind:input
  {fuzzy}
  aria_label="Site search"
  loadOptions={{
    fetch: load_options,
    debounceMs: debounce_ms,
    batchSize: Number.isFinite(batch_size) ? Math.max(1, Math.floor(batch_size)) : 12,
  }}
  placeholder="Search every page..."
  noMatchingOptionsMsg="No matching pages"
  {...rest}
/>
