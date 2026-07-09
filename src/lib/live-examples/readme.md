# Live Examples

The optional `svelte-multiselect/live-examples` subpath provides the mdsvex
remark transform, Vite plugin, and code highlighter used by the documentation's
live code examples.

Install its optional peer dependency in apps that import this subpath:

```sh
npm install --dev @wooorm/starry-night
```

The Vite plugin uses Vite's built-in `parseSync` AST parser, which requires
`vite >= 8` (declared as optional peer dependency).
