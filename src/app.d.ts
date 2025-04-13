/// <reference types="@sveltejs/kit" />
/// <reference types="mdsvex/globals" />

declare module '*.md'
declare module '*package.json'

interface Element {
  scrollIntoViewIfNeeded(centerIfNeeded?: boolean): void
}
