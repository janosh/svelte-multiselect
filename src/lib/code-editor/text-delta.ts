// Turns a textarea `input` event into a line splice for the Rust backend
// (ApplyEditArgs in types.ts) without re-splitting the document on every keystroke:
// splitting a 50k-line file per character is O(document) per keypress and reallocates
// it whole each time, which is what makes naive editors unusable on large files.
//
// THE INVARIANT: returning `null` is ALWAYS safe, returning a wrong splice NEVER is.
// `null` means "I cannot prove what changed, resend the whole document" and costs one
// full `editor_set_text` round trip; a wrong splice desynchronizes the backend's line
// buffer from what the user sees, so every later highlight paints the wrong tokens
// onto the wrong lines and nothing tells the user. Every ambiguous case below
// therefore bails out. The backend's cross-check is a safety net, not
// a substitute: see `expectedLineCount` in types.ts for why only the total length
// catches a mis-derived splice.
//
// Offsets are UTF-16 code units (what `selectionStart` reports). A textarea's `value`
// is always LF regardless of the file's real EOL, so CRLF handling belongs on the
// Rust side, not here.

import { clamp } from './edit-ops'

export interface LineIndex {
  lines: string[]
  // Absolute offset of each line's first character, plus a trailing total-length
  // entry, so a line's end is always `starts[idx] + lines[idx].length`.
  starts: number[]
}

export interface LineSplice {
  start_line: number
  removed_count: number
  inserted_lines: string[]
  expected_line_count: number
  // UTF-16 length of the value this splice was derived from, read straight off
  // `next_value` rather than computed from it. That independence is the point.
  expected_total_length: number
}

// A `beforeinput` event captured before the textarea's value changes. A snapshot
// rather than the event keeps this module DOM-free and every case below testable.
export interface BeforeInputSnapshot {
  selection_start: number
  selection_end: number
  input_type: string
  value_length: number
}

// Unchanged code units compared on each side of the edit. A full comparison would
// be O(document); 32 catches essentially every mis-derivation while staying O(1).
const CONTEXT_CHECK_CHARS = 32

// Which range of the OLD text an input type made the browser replace. Anything not
// listed derives to `null` on purpose: historyUndo/historyRedo restore an arbitrary
// earlier state, composition (IME) mutates text across several events, drag/drop and
// spellcheck replacements touch a range unrelated to the snapshotted selection, and
// unknown future input types are rare and user-initiated,
// so a full resync is affordable.
type ChangeShape = `replace_selection` | `delete_backward` | `delete_forward`

const INPUT_TYPE_SHAPES: Record<string, ChangeShape | undefined> = {
  insertText: `replace_selection`,
  insertFromPaste: `replace_selection`,
  insertFromPasteAsQuotation: `replace_selection`,
  insertFromYank: `replace_selection`,
  insertLineBreak: `replace_selection`,
  insertParagraph: `replace_selection`,
  // Cut and "delete the selection" replace exactly the selected range.
  deleteByCut: `replace_selection`,
  deleteContent: `replace_selection`,
  deleteContentBackward: `delete_backward`,
  deleteWordBackward: `delete_backward`,
  deleteSoftLineBackward: `delete_backward`,
  deleteHardLineBackward: `delete_backward`,
  deleteContentForward: `delete_forward`,
  deleteWordForward: `delete_forward`,
  deleteSoftLineForward: `delete_forward`,
  deleteHardLineForward: `delete_forward`,
}

const refresh_starts = (index: LineIndex, from_line: number): void => {
  const { lines, starts } = index
  const begin = clamp(Math.floor(from_line), 0, lines.length)
  // Lines before `begin` are untouched, so line `begin` still starts right after line
  // `begin - 1`, keeping a keystroke cheap. Deriving that offset from the
  // previous line rather than reading `starts[begin]` matters when `begin` is the end
  // of the array, where that entry is the total-length sentinel, not a line start.
  let offset = begin === 0 ? 0 : starts[begin - 1] + lines[begin - 1].length + 1
  starts.length = lines.length + 1
  for (let line_idx = begin; line_idx < lines.length; line_idx++) {
    starts[line_idx] = offset
    offset += lines[line_idx].length + 1 // +1 for the newline separator
  }
  starts[lines.length] = Math.max(0, offset - 1) // -1: no final separator exists
}

export const BOM = `\uFEFF`

// The shape a textarea hands text back in: LF endings and no BOM. The editor
// buffer, the line index behind it and the agent's file tools all have to agree
// on this. When they disagreed, saving a CRLF file silently rewrote every line.
export const editor_text = (raw: string): string =>
  (raw.startsWith(BOM) ? raw.slice(BOM.length) : raw).replaceAll(/\r\n?/g, `\n`)

// Line endings are normalized here rather than trusted to the caller: an index built
// straight from file text would be longer than the always-LF textarea by one unit per
// CRLF, `value_length` would never match, and every keystroke of the whole session
// would fall back to a full resync. A Windows-authored INCAR would never use the
// incremental path at all. Lone CRs too, as the textarea normalizes those as well.
export const build_line_index = (text: string): LineIndex => {
  const index: LineIndex = { lines: editor_text(text).split(`\n`), starts: [] }
  refresh_starts(index, 0)
  return index
}

export const line_index_text = (index: LineIndex): string => index.lines.join(`\n`)

export const line_index_length = (index: LineIndex): number =>
  index.starts[index.lines.length] ?? 0

// Index of the line containing `offset`. An offset sitting on a newline belongs to
// the line the newline terminates; offsets outside the document clamp to its ends.
export const line_at_offset = (index: LineIndex, offset: number): number => {
  const target = clamp(
    Number.isFinite(offset) ? Math.floor(offset) : 0,
    0,
    line_index_length(index),
  )
  let low = 0
  let high = index.lines.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (index.starts[mid] <= target) low = mid
    else high = mid - 1
  }
  return low
}

// Read `[from, to)` of the indexed text without materializing the document.
const read_range = (index: LineIndex, from: number, to: number): string => {
  if (to <= from) return ``
  const last_line = index.lines.length - 1
  let out = ``
  for (let line_idx = line_at_offset(index, from); line_idx <= last_line; line_idx++) {
    const line_start = index.starts[line_idx]
    if (line_start >= to) break
    const line = index.lines[line_idx]
    const chunk = line_idx < last_line ? `${line}\n` : line
    out += chunk.slice(
      Math.max(0, from - line_start),
      Math.min(chunk.length, to - line_start),
    )
  }
  return out
}

// Cheap sanity check that the text immediately around the edit is untouched. It
// cannot prove the derivation correct, but it catches the realistic failure mode: a
// stale index, or an input type whose edit did not land where the snapshotted
// selection said. The suffix sits `delta` further along in the new value.
const context_matches = (
  index: LineIndex,
  next_value: string,
  region_start: number,
  region_end: number,
  delta: number,
): boolean => {
  const unchanged = (from: number, to: number, shift: number): boolean =>
    read_range(index, from, to) === next_value.slice(from + shift, to + shift)
  const prefix_from = Math.max(0, region_start - CONTEXT_CHECK_CHARS)
  const suffix_to = Math.min(line_index_length(index), region_end + CONTEXT_CHECK_CHARS)
  return (
    unchanged(prefix_from, region_start, 0) && unchanged(region_end, suffix_to, delta)
  )
}

const is_offset = (value: number, limit: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= limit

// Derive the line splice that turns the indexed text into `next_value`, or `null`
// when it cannot be derived with certainty (see the invariant on top). The index
// is NOT updated; call `apply_splice` once the backend has accepted.
export const derive_line_splice = (
  index: LineIndex,
  before: BeforeInputSnapshot,
  next_value: string,
): LineSplice | null => {
  const shape = INPUT_TYPE_SHAPES[before.input_type]
  if (shape === undefined) return null

  const old_length = line_index_length(index)
  // A length mismatch means the index describes a different document than the
  // textarea did at `beforeinput`, indicating a missed event or programmatic write.
  if (before.value_length !== old_length) return null
  if (
    !is_offset(before.selection_start, old_length) ||
    !is_offset(before.selection_end, old_length) ||
    before.selection_start > before.selection_end
  )
    return null

  const sel_start = before.selection_start
  const sel_end = before.selection_end
  const delta = next_value.length - old_length

  // With a non-empty selection every delete variant just removes the selection;
  // only a collapsed caret makes Backspace/Delete reach outside it, and how far it
  // reached follows from the length delta (which is what makes deleteWordBackward
  // and friends work without knowing word rules).
  let region_start = sel_start
  let region_end = sel_end
  if (sel_start === sel_end && shape !== `replace_selection`) {
    if (delta > 0) return null // a "delete" that grew the document: give up
    if (shape === `delete_backward`) region_start = sel_end + delta
    else region_end = sel_start - delta
  }
  if (region_start < 0 || region_end > old_length || region_start > region_end) {
    return null
  }
  // The replacement run cannot be shorter than nothing.
  if (region_end - region_start + delta < 0) return null

  // Widen to whole lines: the backend's unit of edit is a line.
  const start_line = line_at_offset(index, region_start)
  const end_line = line_at_offset(index, region_end)
  const block_start = index.starts[start_line]
  const new_block_end = index.starts[end_line] + index.lines[end_line].length + delta
  if (new_block_end < block_start || new_block_end > next_value.length) return null
  // Both ends of the rewritten block must still be line boundaries in the new
  // value; if they are not, the arithmetic drifted from reality and the splice
  // would shift every following line.
  if (block_start > 0 && next_value[block_start - 1] !== `\n`) return null
  if (new_block_end < next_value.length && next_value[new_block_end] !== `\n`) {
    return null
  }
  if (!context_matches(index, next_value, region_start, region_end, delta)) return null

  // Slice only the affected range of the new value, so this module never touches the
  // other 50k lines.
  const inserted_lines = next_value.slice(block_start, new_block_end).split(`\n`)
  const removed_count = end_line - start_line + 1
  return {
    start_line,
    removed_count,
    inserted_lines,
    // Predicted from the index rather than from `next_value.split('\n')`, which
    // would reintroduce the O(document) cost this module avoids.
    expected_line_count: index.lines.length - removed_count + inserted_lines.length,
    expected_total_length: next_value.length,
  }
}

// Splicing more than this many items at once via `Array.prototype.splice` would pass
// them as function arguments and can overflow the call stack, so rebuild the array
// instead. Only a huge paste gets here.
const SPLICE_SPREAD_LIMIT = 10_000

// Splices in place when that is safe and by rebuilding when it is not, so the caller
// always assigns the result back. Shared with the token array the editor keeps
// alongside the line index: the two must splice identically, and a second copy of
// this threshold could drift from it silently.
export const splice_within_limits = <Item>(
  target: Item[],
  start: number,
  removed_count: number,
  items: Item[],
): Item[] => {
  if (items.length <= SPLICE_SPREAD_LIMIT) {
    target.splice(start, removed_count, ...items)
    return target
  }
  return [...target.slice(0, start), ...items, ...target.slice(start + removed_count)]
}

// Apply a splice to the index IN PLACE (returned for chaining). Only the offsets from
// the splice point on are recomputed and no string is re-split, so the cost is the
// tail of the document in cheap integer work, not the whole document in allocations.
export const apply_splice = (index: LineIndex, splice: LineSplice): LineIndex => {
  const start_line = clamp(Math.floor(splice.start_line), 0, index.lines.length)
  const removed_count = clamp(
    Math.floor(splice.removed_count),
    0,
    index.lines.length - start_line,
  )
  index.lines = splice_within_limits(
    index.lines,
    start_line,
    removed_count,
    splice.inserted_lines,
  )
  // `''.split('\n')` is `['']`, so a document always has at least one line;
  // preserve that even if a caller hands us a splice that empties the array.
  if (index.lines.length === 0) index.lines.push(``)
  refresh_starts(index, start_line)
  return index
}
