// Decoder for the flat span encoding the Rust backend sends (SpanList in types.ts).
// Its offsets are UTF-16 code units, matching Rust's `encode_utf16`, so they index a JS
// string directly: slicing a line by span offsets is always correct, including for
// astral-plane characters (an emoji spans two code units and never gets split, because
// the backend never emits a boundary inside a surrogate pair).
//
// The decoder is deliberately defensive. A malformed span list is a backend bug, but
// throwing here would blank the whole editor; every degradation below falls back to
// unstyled text instead.

import { clamp } from './edit-ops'
import { CLASS_MASK, EMPHASIS_BIT, TOKEN_CLASS_NAMES } from './types'
import type { SpanList, TokenClassName } from './types'

export interface DecodedSpan {
  start: number // inclusive, UTF-16 code units
  end: number // exclusive, UTF-16 code units
  class_name: TokenClassName
  emphasized: boolean
}

const PLAIN: TokenClassName = `plain`

// Decode one line's spans into a gap-free, non-overlapping, strictly increasing list
// of ranges covering `[0, line_length)`. Two degenerate inputs the renderers rely on:
// `line_length === 0` returns `[]` (an empty line has nothing to paint, and a
// zero-width span would produce a stray empty `<span>` per line), and an empty or
// entirely unusable span list on a non-empty line returns a single Plain span covering
// the line, so callers never special-case the "not highlighted / past the highlight
// size limit" path.
export const decode_spans = (spans: SpanList, line_length: number): DecodedSpan[] => {
  const length = Number.isFinite(line_length) ? Math.max(0, Math.floor(line_length)) : 0
  if (length === 0) return []

  const whole_line_plain: DecodedSpan[] = [
    { start: 0, end: length, class_name: PLAIN, emphasized: false },
  ]
  if (!Array.isArray(spans)) return whole_line_plain
  // A trailing odd element is a truncated pair with no class; drop it.
  const pair_count = Math.floor(spans.length / 2)
  if (pair_count === 0) return whole_line_plain

  // Force the starts monotonic first so ends (which are the next start) can never
  // precede their own start, no matter how scrambled the input is.
  const starts: number[] = []
  let lowest_allowed = 0
  for (let pair_idx = 0; pair_idx < pair_count; pair_idx++) {
    const raw_start = spans[pair_idx * 2]
    const start = Number.isFinite(raw_start)
      ? clamp(Math.floor(raw_start), lowest_allowed, length)
      : lowest_allowed
    starts.push(start)
    lowest_allowed = start
  }

  const decoded: DecodedSpan[] = []
  // A first span starting past 0 would silently drop the line's prefix, so paint
  // the prefix as Plain rather than losing characters.
  if (starts[0] > 0) {
    decoded.push({ start: 0, end: starts[0], class_name: PLAIN, emphasized: false })
  }
  for (let pair_idx = 0; pair_idx < pair_count; pair_idx++) {
    const start = starts[pair_idx]
    const end = pair_idx + 1 < pair_count ? starts[pair_idx + 1] : length
    if (end <= start) continue // zero-width span, nothing to render
    const raw_packed = spans[pair_idx * 2 + 1]
    const packed = Number.isFinite(raw_packed) ? Math.floor(raw_packed) : 0
    decoded.push({
      start,
      end,
      // An out-of-range class index means the two sides of the wire contract
      // drifted; render the text unstyled instead of crashing the line.
      class_name: TOKEN_CLASS_NAMES[packed & CLASS_MASK] ?? PLAIN,
      emphasized: (packed & EMPHASIS_BIT) !== 0,
    })
  }
  // Never empty: the guards above ensure at least one pair covers a non-empty line,
  // and a gap before the first span is filled by the prefix push.
  return decoded
}

export interface RenderedToken {
  start: number // doubles as the keyed-each identity
  text: string
  css: string
}

// One line's spans resolved into the pieces a renderer emits. Shared by the editor and
// the diff view, keeping the wire rule for UTF-16 span slicing in one place.
export const render_tokens = (text: string, spans: SpanList): RenderedToken[] =>
  decode_spans(spans, text.length).map((span) => ({
    start: span.start,
    text: text.slice(span.start, span.end),
    css: css_class_for(span.class_name, span.emphasized),
  }))

// The class string every renderer (editor and diff) puts on a token element, and the
// source of truth for those names: `tok-<name>` is styled from the `--tok-<name>`
// variables in editor.css, and `tok-emph` is the intra-line diff highlight, which
// composes with any class and takes its color from the enclosing row.
// tests/editor/token-css.test.ts fails if editor.css drifts.
export const css_class_for = (class_name: TokenClassName, emphasized: boolean): string =>
  emphasized ? `tok-${class_name} tok-emph` : `tok-${class_name}`
