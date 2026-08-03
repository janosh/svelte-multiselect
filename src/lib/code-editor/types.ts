// Data shapes the editor and diff renderers consume, and the two backend
// contracts that produce them.
//
// Neither component computes anything expensive itself: syntax spans and diffs
// come from a backend the host supplies. That keeps the engine free — a native
// process over IPC, a WASM module, a web worker, a server route — while the
// components stay pure rendering.
//
// CASING: every field below is a payload crossing a process or worker boundary,
// so these mirror a wire format rather than following the codebase's snake_case
// convention for code we author. camelCase is what Tauri, JSON-RPC and most HTTP
// APIs produce, so a host adapter can forward these objects untouched instead of
// rebuilding each one field by field. Method names stay snake_case: those are
// this library's own API.

// Semantic token classes. The index is the wire value and the string is the
// `--tok-<name>` CSS variable suffix, so the renderer needs no other lookup.
export const TOKEN_CLASS_NAMES = [
  `plain`,
  `comment`,
  `string`,
  `escape`,
  `number`,
  `constant`,
  `keyword`,
  `operator`,
  `function`,
  `type`,
  `parameter`,
  `variable`,
  `tag`,
  `attribute`,
  `punctuation`,
  `invalid`,
] as const

export type TokenClassName = (typeof TOKEN_CLASS_NAMES)[number]

// Bit 7 of a packed span marks an intra-line diff change, leaving the low 7 bits
// for the class. Editor tokens never set it.
export const EMPHASIS_BIT = 0x80
export const CLASS_MASK = 0x7f

// A contiguous tiling of one line as flat `[start, packed, start, packed, ...]` pairs,
// each span running until the next `start` or the end of the line, so no end offset is
// transmitted. `start` is a UTF-16 code unit offset, so it indexes a JS string
// directly. An empty list means the whole line is unstyled.
export type SpanList = number[]

export type Eol = `lf` | `crlf`

export interface OpenDocResult {
  language: string
  lineCount: number
  eol: Eol
  hadBom: boolean
  // False past the backend's highlight size limit: the document is still
  // editable, it just renders as plain text.
  highlightable: boolean
  // False past the backend's edit size limit, so open read-only. The backend
  // decides both gates so the thresholds cannot drift from what they guard.
  editable: boolean
}

export type RowKind = `equal` | `delete` | `insert` | `replace`

export interface DiffLine {
  lineNo: number // 1-based, on its own side
  text: string
  spans: SpanList
}

// Side-by-side renders `old` on the left and `new` on the right, substituting a spacer
// where a side is absent; a `replace` row carries both sides with emphasis spans on
// each. Unified walks the same rows but must NOT emit both sides of an `equal` row
// (same text on both) or every context line doubles: emit one line showing both line
// numbers, and split only `delete`, `insert` and `replace`.
export interface DiffRow {
  kind: RowKind
  old: DiffLine | null
  new: DiffLine | null
}

export interface DiffHunk {
  // 1-BASED, matching DiffLine.lineNo. Expanding the elided run above a hunk derives
  // its first line as `oldStart - skippedBefore`, so a switch to 0-based would
  // silently show neighbouring lines rather than fail.
  oldStart: number
  newStart: number
  // Unchanged lines elided before this hunk, for the "N unchanged lines" expander.
  skippedBefore: number
  rows: DiffRow[]
}

export interface DiffResult {
  hunks: DiffHunk[]
  added: number
  removed: number
  language: string
  oldLineCount: number
  newLineCount: number
  // Unchanged lines elided after the last hunk, counted on the new side in the
  // same convention as newLineCount so the trailing separator never mixes the
  // two. Applies to both sides: the run is unchanged, so each elides the same.
  skippedAfter: number
  // Without these, a change that only adds or removes the final newline renders
  // as a row whose two columns show identical text with no emphasis. Mark the
  // side that lacks one, as git does.
  oldEndsWithNewline: boolean
  newEndsWithNewline: boolean
  // A guard fired (diff deadline, or lines too long to word-diff). The result is
  // still valid, just coarser.
  truncated: boolean
}

export type DiffLayout = `side-by-side` | `unified`

// Presentation knobs both components read. A host with a settings store maps it
// onto this once rather than handing the whole store to a widget.
export interface DiffViewOptions {
  font_size: number
  // Unchanged lines kept around each change. Changing it re-runs the diff.
  context_lines: number
  // Seeds the layout toggle; the toggle owns it from then on.
  layout: DiffLayout
}

export const to_error = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

// === Backend contracts ===

export interface OpenDocArgs {
  // Unique per open editor: two views of one file must NOT share an id, or
  // closing either drops the other's backend document.
  docId: string
  filename: string
  // The document as it sits on disk, before newline/BOM normalization, so the
  // backend can report the EOL style and BOM to reproduce on save.
  text: string
}

export interface HighlightLinesArgs {
  docId: string
  startLine: number
  endLine: number
}

export interface ApplyEditArgs {
  docId: string
  startLine: number
  removedCount: number
  insertedLines: string[]
  // The frontend's predicted line count after the splice, and NOT a check on the
  // derivation: both sides compute `their_line_count - removedCount +
  // insertedLines.length`, so those terms cancel and the comparison reduces to "did
  // the two buffers already agree on their line count". Detecting a desynchronized
  // buffer is worth having, but a wrong splice with the right line count passes
  // unnoticed. expectedTotalLength catches that.
  expectedLineCount: number
  // UTF-16 length of the textarea value the splice was derived from, read off the
  // value itself rather than recomputed from the splice. The one field that can
  // disagree with a bad derivation, so the one that actually guards it.
  expectedTotalLength: number
}

export interface SetTextArgs {
  docId: string
  text: string
}

export interface CloseDocArgs {
  docId: string
}

export interface DiffTextArgs {
  oldText: string
  newText: string
  filename: string
  // Unchanged lines kept around each change. Everything beyond them reaches the
  // renderer as a `skippedBefore` / `skippedAfter` count instead of a row.
  contextLines: number
}

// A stateful syntax-highlighting engine. `open_doc` registers a buffer the
// remaining calls address by id, so the engine can highlight incrementally
// instead of re-parsing the document on every keystroke.
export interface EditorBackend {
  open_doc: (args: OpenDocArgs) => Promise<OpenDocResult>
  // Spans for `[startLine, endLine)`, one entry per line.
  highlight_lines: (args: HighlightLinesArgs) => Promise<SpanList[]>
  // Rejecting is how a backend reports that the two buffers have diverged; the
  // client answers with a full `set_text`. Resolves to the new line count.
  apply_edit: (args: ApplyEditArgs) => Promise<number>
  set_text: (args: SetTextArgs) => Promise<number>
  close_doc: (args: CloseDocArgs) => Promise<void>
}

export interface DiffBackend {
  diff_text: (args: DiffTextArgs) => Promise<DiffResult>
}

// === Default backends ===
//
// DiffView accepts a `backend` override, but an app normally has one diff engine and
// would otherwise thread it through every call site. Register it once at startup and
// keep the override for tests or exceptional views.

let default_diff_backend: DiffBackend | null = null

export const set_diff_backend = (backend: DiffBackend | null): void => {
  default_diff_backend = backend
}

export const resolve_diff_backend = (override?: DiffBackend): DiffBackend => {
  const backend = override ?? default_diff_backend
  if (!backend) {
    throw new Error(
      `No DiffBackend available: pass a \`backend\` prop or call set_diff_backend() once at startup`,
    )
  }
  return backend
}
