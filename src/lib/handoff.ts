/** Passing a result from one tool to the next, in memory only: a reload drops it, nothing is stored. */

/** Does a file match an `<input accept>` string? By extension, `type/*` wildcard, or exact MIME type. */
export function accepts(file: { name: string; type: string }, accept: string) {
  const name = file.name.toLowerCase()
  return accept.split(',').some((raw) => {
    const a = raw.trim().toLowerCase()
    if (a === '*/*') return true
    if (a.startsWith('.')) return name.endsWith(a)
    if (a.endsWith('/*')) return file.type.startsWith(a.slice(0, -1))
    return file.type === a
  })
}

// Only types every browser shows inline; anything else (ZIP, MKV, SVG…) is download-only.
const VIEWABLE: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
}

/** The MIME type a browser tab can preview this result as, or '' if it can't. Goes by extension: ffmpeg results carry no type. */
export function viewableType(name: string) {
  return VIEWABLE[name.toLowerCase().split('.').pop() ?? ''] ?? ''
}

let pending: File | null = null

/** Holds a result for the next tool's drop zone. */
export const handOff = (file: File) => void (pending = file)

/** The held result, once. */
export function takeHandoff() {
  const f = pending
  pending = null
  return f
}
