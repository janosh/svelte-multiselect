# Live Examples

The optional `svelte-widgets/live-examples` subpath provides the mdsvex
remark transform, Vite plugin, and code highlighter used by the documentation's
live code examples.

Install its optional peer dependency in apps that import this subpath:

```sh
npm install --dev @wooorm/starry-night
```

The Vite plugin uses Vite's built-in `parseSync` AST parser, which requires
`vite >= 8` (declared as optional peer dependency).

## Custom grammars

`starry_night` and `starry_night_highlighter` cover starry-night's common bundle plus
Svelte, and are created eagerly when the module loads. For any other language, build an
instance with `create_highlighter`, which loads and compiles nothing until first use.
Import it from its own subpath, since the `live-examples` barrel pulls in the eager
instance:

```ts
import grammar_typst from '@wooorm/starry-night/source.typst'
import { create_highlighter } from 'svelte-widgets/live-examples/create-highlighter'

const highlighter = create_highlighter([grammar_typst])

// highlighted HTML with no wrapper element
const html = await highlighter.highlight(`#let x = 1`, `typ`)
// same <pre class="highlight highlight-typ"> markup as starry_night_highlighter
const block = await highlighter.highlight_block(`#let x = 1`, `typ`)
// the starry-night instance itself, for flagToScope and repeated synchronous highlighting
const instance = await highlighter.ready()
```
