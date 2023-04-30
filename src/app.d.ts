/// <reference types="@sveltejs/kit" />
/// <reference types="mdsvex/globals" />

declare module '*.md'
declare module '*package.json'

// temporary until TS recognizes CSS highlight API
// https://caniuse.com/mdn-api_css_highlights
declare class Highlight {
  constructor(...ranges: Range[])
}

interface Element {
  scrollIntoViewIfNeeded(centerIfNeeded?: boolean): void
}
