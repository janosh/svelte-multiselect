import { files_from_data_transfer } from '$lib/file-drop'
import { expect, test, vi } from 'vite-plus/test'

// happy-dom has DataTransfer but no webkitGetAsEntry and no FileSystemEntry types at
// runtime, so drops are built from hand-rolled entries here. They implement the two
// callback APIs the real thing exposes - entry.file(cb, err) and reader.readEntries(cb,
// err) - including readEntries' batching, since draining it is the part most likely to
// be got wrong.

// `file` hands back a File named after the entry; the error and timing tests pass their
// own to drive the callback themselves.
const file_entry = (
  name: string,
  file: FileSystemFileEntry[`file`] = (on_file) => on_file(new File([name], name)),
): FileSystemFileEntry =>
  ({
    isFile: true,
    isDirectory: false,
    name,
    fullPath: `/${name}`,
    file,
  }) as unknown as FileSystemFileEntry

// `batch_size` mirrors the browser's cap: readEntries returns at most 100 per call and
// signals the end with an empty batch, so a single call is not enough.
const dir_entry = (
  name: string,
  children: FileSystemEntry[],
  batch_size = children.length,
): FileSystemDirectoryEntry => {
  let read_idx = 0
  const entry = {
    isFile: false,
    isDirectory: true,
    name,
    fullPath: `/${name}`,
    createReader: () => ({
      readEntries: (on_entries: (entries: FileSystemEntry[]) => void) => {
        const batch = children.slice(read_idx, read_idx + Math.max(batch_size, 1))
        read_idx += batch.length
        on_entries(batch)
      },
    }),
  }
  return entry as unknown as FileSystemDirectoryEntry
}

const drop = (entries: (FileSystemEntry | null)[], files: File[] = []): DataTransfer =>
  ({
    items: entries.map((entry) => ({ webkitGetAsEntry: () => entry })),
    files,
  }) as unknown as DataTransfer

const names = (files: File[]) => files.map((file) => file.name)

test(`plain files come back in drop order`, async () => {
  const dropped = drop([file_entry(`a.txt`), file_entry(`b.txt`)])

  expect(names(await files_from_data_transfer(dropped))).toEqual([`a.txt`, `b.txt`])
})

// The reason this helper exists: DataTransfer.files reports a dropped directory as one
// zero-byte File named after the directory, so its contents would be lost.
test(`directories are expanded depth-first, keeping their listed order`, async () => {
  const lib_dir = dir_entry(`lib`, [file_entry(`deep.ts`)])
  const src_dir = dir_entry(`src`, [file_entry(`index.ts`), lib_dir])
  const tree = dir_entry(`project`, [
    file_entry(`readme.md`),
    src_dir,
    file_entry(`package.json`),
  ])
  const dropped = drop([tree, file_entry(`loose.txt`)], [new File([``], `project`)])

  expect(names(await files_from_data_transfer(dropped))).toEqual([
    `readme.md`,
    `index.ts`,
    `deep.ts`,
    `package.json`,
    `loose.txt`,
  ])
})

test(`a directory larger than one readEntries batch is drained fully`, async () => {
  const children = Array.from({ length: 250 }, (_unused, idx) =>
    file_entry(`file-${idx}.txt`),
  )
  const dropped = drop([dir_entry(`big`, children, 100)])

  const files = await files_from_data_transfer(dropped)
  expect(files).toHaveLength(250) // three full batches then an empty one
  expect(names(files).slice(-1)).toEqual([`file-249.txt`])
})

test(`an empty directory contributes nothing`, async () => {
  const dropped = drop([dir_entry(`empty`, []), file_entry(`a.txt`)])

  expect(names(await files_from_data_transfer(dropped))).toEqual([`a.txt`])
})

// Entries are unreadable outside the drop event and absent on synthetic drops, where
// DataTransfer.files is all there is.
test.each([
  [`items yield no entries`, [null, null]],
  [`there are no items at all`, []],
])(`falls back to DataTransfer.files when %s`, async (_desc, entries) => {
  const dropped = drop(entries, [new File([`x`], `plain.txt`)])

  expect(names(await files_from_data_transfer(dropped))).toEqual([`plain.txt`])
})

test(`an item without webkitGetAsEntry is skipped, not fatal`, async () => {
  const dropped = {
    items: [{}, { webkitGetAsEntry: () => file_entry(`kept.txt`) }],
    files: [],
  } as unknown as DataTransfer

  expect(names(await files_from_data_transfer(dropped))).toEqual([`kept.txt`])
})

test(`a rejected entry.file call rejects the whole expansion`, async () => {
  const failure = new DOMException(`NotFoundError`)
  const broken = file_entry(`broken.txt`, (_on_file, on_error) => on_error?.(failure))

  await expect(files_from_data_transfer(drop([broken]))).rejects.toThrow(failure)
})

test(`entries are read in parallel rather than one after another`, async () => {
  const started: string[] = []
  const slow_entry = (name: string, delay_ms: number) =>
    file_entry(name, (on_file) => {
      started.push(name)
      setTimeout(() => on_file(new File([name], name)), delay_ms)
    })

  vi.useFakeTimers()
  try {
    const pending = files_from_data_transfer(
      drop([slow_entry(`slow.txt`, 50), slow_entry(`fast.txt`, 1)]),
    )
    expect(started).toEqual([`slow.txt`, `fast.txt`]) // both in flight before either lands
    await vi.advanceTimersByTimeAsync(50)
    expect(names(await pending)).toEqual([`slow.txt`, `fast.txt`]) // order still preserved
  } finally {
    vi.useRealTimers()
  }
})
