<script lang="ts">
  import { FileDetails } from '$lib'
</script>

## Dynamic Options Loading

For large datasets or server-side data, use `loadOptions` to dynamically load options as the user scrolls and searches. The component handles all state management, debouncing, and pagination automatically.

This addresses [GitHub discussion #342](https://github.com/janosh/svelte-multiselect/discussions/342).

### Basic Example

Just provide a `loadOptions` function that fetches data:

```svelte example id="load-basic"
<script lang="ts">
  import MultiSelect from '$lib'

  // Simulated large dataset - in practice, this would be a database/API
  const all_items = Array.from({ length: 10000 }, (_, idx) => `Item ${idx + 1}`)

  async function load_options({ search, offset, limit }) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Filter and paginate
    const filtered = search
      ? all_items.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
      : all_items

    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
    }
  }
</script>

<MultiSelect loadOptions={load_options} placeholder="Search 10,000 items..." />
```

That's it! No state management needed. The component handles:

- Loading initial options when dropdown opens
- Loading more as user scrolls
- Debounced search with automatic reset
- Loading indicators

### REST API Example

Connect to a real API:

```svelte example id="load-api"
<script lang="ts">
  import MultiSelect from '$lib'

  // Simulated API
  async function fetch_users({ search, offset, limit }) {
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Simulated database
    const all_users = Array.from({ length: 2000 }, (_, idx) => ({
      label: `User ${idx + 1}`,
      email: `user${idx + 1}@example.com`,
      id: idx + 1,
    }))

    const filtered = search
      ? all_users.filter((user) =>
        user.label.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      )
      : all_users

    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
    }
  }
</script>

<MultiSelect
  loadOptions={fetch_users}
  placeholder="Search users by name or email..."
>
  {#snippet children({ option })}
    <div>
      <strong>{option.label}</strong>
      <small style="opacity: 0.7; margin-left: 8px">{option.email}</small>
    </div>
  {/snippet}
</MultiSelect>
```

### Configuration Options

For advanced control, pass an object with `fetch` function and config:

```svelte example id="load-config"
<script lang="ts">
  import MultiSelect from '$lib'

  const all_items = Array.from({ length: 500 }, (_, idx) => `Option ${idx + 1}`)

  async function load_options({ search, offset, limit }) {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const filtered = search
      ? all_items.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
      : all_items

    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
    }
  }
</script>

<MultiSelect
  loadOptions={{ fetch: load_options, debounceMs: 500, batchSize: 20 }}
  placeholder="Custom config (500ms debounce, 20 items per batch)"
/>
```

### Object Options with Custom Display

Use object options with custom snippets:

```svelte example id="load-objects"
<script lang="ts">
  import MultiSelect from '$lib'

  const all_languages = [
    { label: `JavaScript`, year: 1995 },
    { label: `TypeScript`, year: 2012 },
    { label: `Python`, year: 1991 },
    { label: `Rust`, year: 2010 },
    { label: `Go`, year: 2009 },
    { label: `Java`, year: 1995 },
    { label: `C++`, year: 1985 },
    { label: `C#`, year: 2000 },
    { label: `Ruby`, year: 1995 },
    { label: `Swift`, year: 2014 },
  ]

  async function load_options({ search, offset, limit }) {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const filtered = search
      ? all_languages.filter((lang) =>
        lang.label.toLowerCase().includes(search.toLowerCase())
      )
      : all_languages

    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
    }
  }
</script>

<MultiSelect loadOptions={load_options} placeholder="Search languages...">
  {#snippet children({ option })}
    <span>{option.label} <small style="opacity: 0.6">({option.year})</small></span>
  {/snippet}
</MultiSelect>
```

### Lazy Loading on Open

By default, options load when the dropdown opens. Set `onOpen: false` to disable:

```svelte example id="load-lazy"
<script lang="ts">
  import MultiSelect from '$lib'

  const items = Array.from({ length: 100 }, (_, idx) => `Item ${idx + 1}`)

  async function load_options({ search, offset, limit }) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const filtered = search
      ? items.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
      : items
    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
    }
  }

  let selected = $state([])
</script>

<MultiSelect
  loadOptions={{ fetch: load_options, onOpen: false }}
  bind:selected
  placeholder="Type to search (won't load on open)..."
/>

<p>Selected: {selected.join(`, `) || `none`}</p>
```

## Props Reference

The `loadOptions` prop accepts either a function (simple) or an object (with config):

```typescript
// Simple: just a function
loadOptions={myFetchFn}

// With config: object with fetch + options
loadOptions={{ fetch: myFetchFn, debounceMs: 500, batchSize: 20, onOpen: false }}
```

| Config Key   | Type      | Default | Description                                 |
| ------------ | --------- | ------- | ------------------------------------------- |
| `fetch`      | `fn`      | —       | Async function to load options (required)   |
| `debounceMs` | `number`  | `300`   | Debounce delay for search queries           |
| `batchSize`  | `number`  | `50`    | Number of options to load per batch         |
| `onOpen`     | `boolean` | `true`  | Whether to load options when dropdown opens |

### LoadOptions Parameters

```typescript
interface LoadOptionsParams {
  search: string // Current search text
  offset: number // Number of options already loaded (for pagination)
  limit: number // Batch size to load
}

interface LoadOptionsResult<T> {
  options: T[] // Array of options to add
  hasMore: boolean // Whether more options are available
}
```
