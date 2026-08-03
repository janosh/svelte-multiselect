// Pure text transformations behind the editor's keyboard commands. Nothing here touches
// a textarea: every function takes an `EditorState` snapshot and returns the state the
// caller should apply, so the same logic runs identically in a test and in the
// component. Offsets are UTF-16 code units throughout, matching
// `textarea.selectionStart` and the span offsets in types.ts.
//
// The tail of the file (from `editor_line_height` down) is a second, unrelated group:
// view-layer arithmetic shared by anything that renders lines, DiffView included, none
// of which hold an `EditorState`.

import { SvelteSet } from 'svelte/reactivity'
import { clamp } from '../utils'

export interface EditorState {
  text: string
  selection_start: number
  selection_end: number
}

// A text insertion replacing the current selection. Callers that want the browser's
// native undo stack should insert `insert_text` with `execCommand('insertText')` and
// move the caret back `cursor_back` code units; callers that manage undo themselves
// can use `apply_insertion`.
export interface TextInsertion {
  insert_text: string
  cursor_back: number
}

// A replacement of one contiguous range, which is what every block command actually
// is. Returning this rather than a rewritten document matters: assigning
// `textarea.value` wipes the browser's undo stack, fires no `input` event (so the line
// index and the backend both go silently stale) and rebuilds a multi-megabyte string
// to insert two spaces. Applied as `setSelectionRange(range_start, range_end)` then
// `execCommand('insertText', replacement)`, a RangeEdit keeps native undo and emits a
// real `insertText` event that `derive_line_splice` handles like any other edit.
export interface RangeEdit {
  range_start: number
  range_end: number
  replacement: string
  selection_start: number
  selection_end: number
}

// A command over the lines a selection touches. The string argument is the
// command's unit: the indent for indent/dedent, the comment token for toggling.
type BlockCommand = (state: EditorState, unit: string) => RangeEdit | null

// For callers that manage their own undo, and for tests that want to assert on
// the resulting document rather than on the edit.
export const apply_range_edit = (state: EditorState, edit: RangeEdit): EditorState => ({
  text:
    state.text.slice(0, edit.range_start) +
    edit.replacement +
    state.text.slice(edit.range_end),
  selection_start: edit.selection_start,
  selection_end: edit.selection_end,
})

// Selections arriving from a DOM textarea are always sane, but tests and
// programmatic callers are not, and an inverted selection would silently corrupt
// text rather than fail. A non-finite end falls back to the start, i.e. collapsed.
const clamp_selection = (state: EditorState): [number, number] => {
  const limit = state.text.length
  const offset = (value: number, low: number): number =>
    Number.isFinite(value) ? clamp(Math.floor(value), low, limit) : low
  const start = offset(state.selection_start, 0)
  return [start, offset(state.selection_end, start)]
}

const line_start_offset = (text: string, offset: number): number =>
  offset <= 0 ? 0 : text.lastIndexOf(`\n`, offset - 1) + 1

const line_end_offset = (text: string, offset: number): number => {
  const newline_idx = text.indexOf(`\n`, Math.max(0, offset))
  return newline_idx === -1 ? text.length : newline_idx
}

// The offsets of the whole lines a selection touches, even partially. A selection
// ending exactly at a line start (just past a newline) shows no highlight on that
// line, so editors conventionally exclude it. Dragging down one full line then
// hitting Tab should not indent the line below.
const touched_line_range = (
  text: string,
  sel_start: number,
  sel_end: number,
): [number, number] => {
  const block_start = line_start_offset(text, sel_start)
  const effective_end =
    sel_end > sel_start && text[sel_end - 1] === `\n` ? sel_end - 1 : sel_end
  return [block_start, line_end_offset(text, effective_end)]
}

const leading_whitespace = (line: string): string => /^[ \t]*/.exec(line)?.[0] ?? ``

// Every block command has the same shape: take the whole lines the selection touches,
// rewrite each one, and replace exactly that span. `make_rewrite` sees all the lines
// first, so a command that has to survey the block before deciding (comment toggling
// does) can do it once; returning `null` from it means there is nothing to do,
// matching `auto_close_pair`, so the caller skips the DOM work rather than applying a
// no-op edit that would still collapse the selection. The selection shift falls out of
// the line lengths. The first line's delta moves selection_start; the block's total
// delta moves selection_end, so callers cannot update one and accidentally let the
// other drift.
const rewrite_block = (
  state: EditorState,
  make_rewrite: (lines: string[]) => ((line: string, line_idx: number) => string) | null,
): RangeEdit | null => {
  const [sel_start, sel_end] = clamp_selection(state)
  const [block_start, block_end] = touched_line_range(state.text, sel_start, sel_end)
  const lines = state.text.slice(block_start, block_end).split(`\n`)
  const rewrite_line = make_rewrite(lines)
  if (!rewrite_line) return null

  let first_delta = 0
  let total_delta = 0
  const next_block = lines
    .map((line, line_idx) => {
      const next_line = rewrite_line(line, line_idx)
      const delta = next_line.length - line.length
      if (line_idx === 0) first_delta = delta
      total_delta += delta
      return next_line
    })
    .join(`\n`)
  // Nothing changed, so there is no edit to make: a no-op one would cost an undo entry,
  // emit an `input` event that sends a pointless splice to the backend. Because callers
  // preventDefault when they get an edit, it would also swallow the keystroke.
  if (total_delta === 0) return null

  const next_start =
    sel_start <= block_start
      ? block_start
      : Math.max(block_start, sel_start + first_delta)
  return {
    range_start: block_start,
    range_end: block_end,
    replacement: next_block,
    selection_start: next_start,
    selection_end: Math.max(next_start, sel_end + total_delta),
  }
}

export const indent_selection: BlockCommand = (state, indent) => {
  const [sel_start, sel_end] = clamp_selection(state)
  if (indent === ``) return null
  // A collapsed selection means Tab was pressed with no selection: users expect an
  // indent inserted AT THE CURSOR (mid-line included), not at the line start.
  if (sel_start === sel_end) {
    const caret = sel_start + indent.length
    return {
      range_start: sel_start,
      range_end: sel_start,
      replacement: indent,
      selection_start: caret,
      selection_end: caret,
    }
  }
  // Indenting an empty line would leave trailing whitespace behind.
  return rewrite_block(state, () => (line) => (line === `` ? line : indent + line))
}

// How many leading whitespace characters one dedent step removes. A tab always
// counts as one full indent level regardless of the configured unit, which is what
// makes dedent work on files that mix tabs and spaces.
const dedent_width = (line: string, indent: string): number => {
  if (line.startsWith(`\t`)) return 1
  const unit_width = indent.includes(`\t`) ? 1 : Math.max(1, indent.length)
  let width = 0
  while (width < unit_width && line[width] === ` `) width++
  return width
}

// Unlike indent, dedent always works on whole lines: there is no meaningful "remove
// an indent at the cursor" operation. Lines with less indentation than one unit (or
// none at all) just lose whatever they have; dedent must never eat non-whitespace.
export const dedent_selection: BlockCommand = (state, indent) =>
  rewrite_block(state, () => (line) => line.slice(dedent_width(line, indent)))

// Comment every touched line if any is uncommented; otherwise uncomment all. The
// standard "toggle" semantics, which keeps a partially-commented block from
// ping-ponging. Blank lines are left alone so toggling twice is a no-op.
export const toggle_line_comment: BlockCommand = (state, token) => {
  if (token === ``) return null

  return rewrite_block(state, (lines) => {
    const content_idxs = new SvelteSet<number>()
    // Survey once: use the shallowest indent without spreading huge selections into Math.min.
    let all_commented = true
    let comment_column = Infinity
    for (const [line_idx, line] of lines.entries()) {
      if (line.trim() === ``) continue
      content_idxs.add(line_idx)
      all_commented &&= line.trimStart().startsWith(token)
      comment_column = Math.min(comment_column, leading_whitespace(line).length)
    }
    if (content_idxs.size === 0) return null

    return (line, line_idx) => {
      if (!content_idxs.has(line_idx)) return line
      if (!all_commented) {
        return `${line.slice(0, comment_column)}${token} ${line.slice(comment_column)}`
      }
      const indent_width = leading_whitespace(line).length
      const rest = line.slice(indent_width + token.length)
      // Commenting inserted one space after the token, so uncommenting takes it
      // back; a line the user typed without that space is unaffected.
      return line.slice(0, indent_width) + (rest.startsWith(` `) ? rest.slice(1) : rest)
    }
  })
}

type CharMap = Record<string, string | undefined>
const OPENER_TO_CLOSER: CharMap = { '(': `)`, '[': `]`, '{': `}` }

// The text Enter should insert: a newline carrying the current line's indentation, one
// level deeper after an opener. When the character right after the cursor is the
// matching closer, that closer is pushed onto its own line at the outer indentation
// and the caret left on the blank line between them (the classic brace expansion).
export const auto_indent_newline = (
  state: EditorState,
  indent: string,
): TextInsertion => {
  const [sel_start, sel_end] = clamp_selection(state)
  // Taking the indentation from the text BEFORE the cursor (rather than the whole
  // line) keeps Enter inside a line's leading whitespace sane.
  const before_cursor = state.text.slice(
    line_start_offset(state.text, sel_start),
    sel_start,
  )
  const base_indent = leading_whitespace(before_cursor)
  const last_char = before_cursor.trimEnd().at(-1) ?? ``
  const closer = OPENER_TO_CLOSER[last_char]
  // A trailing `:` opens a block in Python and YAML, and in a brace language it is
  // a label or object key, where the extra indent is also useful,
  // so this needs no per-language switch.
  const opens = Boolean(closer) || last_char === `:`
  const inner_indent = opens ? base_indent + indent : base_indent

  if (closer !== undefined && state.text.slice(sel_end, sel_end + 1) === closer) {
    return {
      insert_text: `\n${inner_indent}\n${base_indent}`,
      cursor_back: base_indent.length + 1,
    }
  }
  return { insert_text: `\n${inner_indent}`, cursor_back: 0 }
}

// Apply a TextInsertion to a state, for callers not routing through execCommand.
// Kept here so the caret arithmetic exists in exactly one place.
export const apply_insertion = (
  state: EditorState,
  insertion: TextInsertion,
): EditorState => {
  const [sel_start, sel_end] = clamp_selection(state)
  const caret =
    sel_start +
    insertion.insert_text.length -
    clamp(insertion.cursor_back, 0, insertion.insert_text.length)
  return {
    text:
      state.text.slice(0, sel_start) + insertion.insert_text + state.text.slice(sel_end),
    selection_start: caret,
    selection_end: caret,
  }
}

const CLOSER_TO_OPENER: CharMap = { ')': `(`, ']': `[`, '}': `{` }
const QUOTES = new SvelteSet([`\``, `'`, `"`])
// Unicode-aware so auto-close is not "smarter" inside non-ASCII identifiers.
const WORD_CHAR_RE = /[\p{L}\p{N}_$]/u

// Decide what typing `typed` should do, or null when the character should be
// inserted normally by the browser. Two behaviors: closing over an existing closer
// (type-over) and inserting a matching pair.
export const auto_close_pair = (
  state: EditorState,
  typed: string,
): EditorState | null => {
  if (typed.length !== 1) return null
  const [sel_start, sel_end] = clamp_selection(state)
  // With a range selected the browser replaces it; wrapping the selection in the
  // pair would be a different (and unrequested) feature.
  if (sel_start !== sel_end) return null

  const next_char = state.text.slice(sel_start, sel_start + 1)
  const prev_char = sel_start > 0 ? state.text[sel_start - 1] : ``
  // Both outcomes below leave the caret one code unit past where it started.
  const advanced = { selection_start: sel_start + 1, selection_end: sel_start + 1 }

  // Type-over: the closer the user is typing is already there (we or they put it
  // there), so walk past it instead of doubling it.
  const closes = CLOSER_TO_OPENER[typed] !== undefined || QUOTES.has(typed)
  if (next_char === typed && closes) return { text: state.text, ...advanced }

  const closer = OPENER_TO_CLOSER[typed] ?? (QUOTES.has(typed) ? typed : undefined)
  if (closer === undefined) return null
  // Auto-closing in front of a word swallows the word inside the pair (`|foo` + `(`
  // should not become `()foo`), so bail out.
  if (next_char !== `` && WORD_CHAR_RE.test(next_char)) return null
  // Apostrophes: `don|` + `'` must stay `don't`, and `''` must not become `'''`.
  // Only quotes need this. `foo(` is a normal call.
  if (QUOTES.has(typed) && (prev_char === typed || WORD_CHAR_RE.test(prev_char))) {
    return null
  }

  return {
    text: state.text.slice(0, sel_start) + typed + closer + state.text.slice(sel_start),
    ...advanced,
  }
}

// Row height for both the editor and the diff view, in whole pixels. Integer rather
// than a unitless multiplier because the editor stacks a transparent textarea on a
// token overlay: a fractional line height rounds differently in the two layers and
// drifts them apart by whole lines over a few thousand rows. Shared so an editor and a
// diff rendered side by side cannot pick multipliers that agree at one font size and
// differ by a pixel at every other, making rows jump when switching between them.
export const editor_line_height = (font_size: number): number => {
  // Zero and negative sizes fall back rather than clamping: they are as unusable as
  // NaN, and clamping would give 1px rows that make the virtualizer render everything.
  const size = Number.isFinite(font_size) && font_size > 0 ? font_size : 13
  return Math.max(1, Math.round(size * 1.5))
}

// Lines as the BACKEND counts them: CRLF and lone CR normalize to LF first, and a
// trailing newline terminates its line rather than opening an empty one. Shared so a
// count shown next to a diff cannot disagree with the `DiffResult` it describes.
export const split_text_lines = (text: string): string[] => {
  const lines = text.replaceAll(`\r\n`, `\n`).replaceAll(`\r`, `\n`).split(`\n`)
  if (lines.length > 1 && lines.at(-1) === ``) lines.pop()
  return lines
}

// Same convention, except empty text counts zero rather than one blank line. This is
// what `DiffResult.newLineCount` reports for it.
export const count_lines = (text: string): number =>
  text === `` ? 0 : split_text_lines(text).length

interface LineWindow {
  start: number // inclusive line index
  end: number // exclusive line index
}

const non_negative = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0

// Which line indices a virtualized viewport needs to render. `line_height` comes from
// `editor_line_height`, which is always at least 1, so there is no zero to guard: before
// the first layout pass the VIEWPORT is what measures 0, and that still yields the one
// partial row plus overscan the caller needs to render something worth measuring.
export const visible_line_window = (
  scroll_top: number,
  viewport_height: number,
  line_height: number,
  line_count: number,
  overscan = 0,
): LineWindow => {
  const count = Math.floor(non_negative(line_count))
  if (count === 0) return { start: 0, end: 0 }
  const rows = Math.floor(non_negative(overscan))
  const first_visible = Math.floor(non_negative(scroll_top) / line_height)
  // +1 because a viewport that is not an exact multiple of the line height shows a
  // partial row at the bottom.
  const visible_rows = Math.ceil(non_negative(viewport_height) / line_height) + 1
  const start = clamp(first_visible - rows, 0, count)
  return { start, end: clamp(first_visible + visible_rows + rows, start, count) }
}
