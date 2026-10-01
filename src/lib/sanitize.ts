/** Characters Windows and macOS reject in file names. */
const ILLEGAL = /[/\\:*?"<>|]/g
/** Control characters, which are illegal in file names on every platform. */
const CONTROL = /\p{Cc}/gu

export type FilenamePattern = '{name}' | '{index}_{name}' | '{name}_{event}'

export const FILENAME_PATTERNS: { id: FilenamePattern; label: string }[] = [
  { id: '{name}', label: 'Aarav Sharma.pdf' },
  { id: '{index}_{name}', label: '001_Aarav Sharma.pdf' },
  { id: '{name}_{event}', label: 'Aarav Sharma_TechFest.pdf' },
]

/** File stem with reserved characters removed. Spaces are kept. */
export function sanitizeFilename(name: string, fallback = 'certificate') {
  const cleaned = name.replace(ILLEGAL, '').replace(CONTROL, '').replace(/^\.+/, '').trim()
  return cleaned || fallback
}

/** Builds one stem from the chosen pattern (no extension, not yet unique). */
export function applyPattern(
  pattern: FilenamePattern,
  name: string,
  index: number,
  total: number,
  event: string,
) {
  const pad = String(total).length
  const stem = pattern
    .replace('{name}', name)
    .replace('{index}', String(index + 1).padStart(Math.max(2, pad), '0'))
    .replace('{event}', sanitizeFilename(event) || 'event')
  return sanitizeFilename(stem)
}

/** Appends " (2)", " (3)" … so every stem in the list is unique. */
export function uniqueStems(stems: string[]) {
  const seen = new Map<string, number>()
  return stems.map((stem) => {
    const key = stem.toLowerCase()
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    return n === 1 ? stem : `${stem} (${n})`
  })
}

/** Final, unique, pattern-applied stems for a batch. */
export function filenames(
  names: string[],
  pattern: FilenamePattern = '{name}',
  event = '',
): string[] {
  return uniqueStems(names.map((n, i) => applyPattern(pattern, n, i, names.length, event)))
}

/** Indices of names that appear more than once (case-insensitive). */
export function duplicateIndices(names: string[]) {
  const counts = new Map<string, number>()
  for (const n of names) {
    const k = n.trim().toLowerCase()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const out = new Set<number>()
  names.forEach((n, i) => {
    if ((counts.get(n.trim().toLowerCase()) ?? 0) > 1) out.add(i)
  })
  return out
}
