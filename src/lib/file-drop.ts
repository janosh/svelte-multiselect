// Flatten a drop into the files it actually carries.
//
// DataTransfer.files stops at the top level: drop a directory and it reports one
// zero-byte File named after the directory. webkitGetAsEntry is the only way to see
// inside, and it is only readable during the drop event itself.

const is_file_entry = (entry: FileSystemEntry): entry is FileSystemFileEntry =>
  entry.isFile

const is_directory_entry = (entry: FileSystemEntry): entry is FileSystemDirectoryEntry =>
  entry.isDirectory

const read_all_entries = async (
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> => {
  const entries: FileSystemEntry[] = []
  // readEntries hands back at most 100 per call and signals the end with an empty batch,
  // so one call is only enough for a small directory
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    )
    if (batch.length === 0) return entries
    entries.push(...batch)
  }
}

const files_from_entry = async (entry: FileSystemEntry): Promise<File[]> => {
  if (is_file_entry(entry)) {
    return [await new Promise<File>((resolve, reject) => entry.file(resolve, reject))]
  }
  if (!is_directory_entry(entry)) return []
  const entries = await read_all_entries(entry.createReader())
  return (await Promise.all(entries.map(files_from_entry))).flat()
}

// Every file in a drop, with dropped directories expanded depth-first and in the order
// the browser lists them. Falls back to the flat DataTransfer.files list when the entry
// API yields nothing, which is what a paste or a synthetic drop event gives.
export const files_from_data_transfer = async (
  data_transfer: DataTransfer,
): Promise<File[]> => {
  const entries = Array.from(data_transfer.items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry) => entry !== null && entry !== undefined)
  return entries.length > 0
    ? (await Promise.all(entries.map(files_from_entry))).flat()
    : Array.from(data_transfer.files)
}
