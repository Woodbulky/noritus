import { sanitizeFilename } from './sanitize'

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Saves a blob through a temporary object URL and an `<a download>`. */
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Some browsers read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** File name without its last extension. */
export const stem = (name: string) => name.replace(/\.[^.]+$/, '') || name
export const pdfBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: 'application/pdf' })

/** A safe output name derived from an input: ("My scan.pdf", "-merged", "pdf") → "My scan-merged.pdf". */
export const outName = (source: string, suffix: string, ext: string) => `${sanitizeFilename(stem(source), 'file')}${suffix}.${ext}`
