/** Pure page maths shared by the PDF tools. No pdf-lib, no DOM. */

/**
 * Parses "1-3, 5, 8-" into groups of 0-based page indices, one group per
 * comma-separated part. "8-" runs to the last page, "-3" starts at the first.
 * Throws a plain-words Error for anything out of range or unreadable.
 */
export function parseRanges(input: string, pageCount: number): number[][] {
  const parts = input.split(',').map((s) => s.trim()).filter(Boolean)
  if (!parts.length) throw new Error('Type the pages you want, for example 1-3, 5.')
  return parts.map((part) => {
    const m = part.match(/^(\d*)\s*(?:[-–]\s*(\d*))?$/)
    if (!m || (!m[1] && !m[2])) throw new Error(`“${part}” is not a page or a range like 2-5.`)
    const from = m[1] ? Number(m[1]) : 1
    const to = m[2] !== undefined ? (m[2] ? Number(m[2]) : pageCount) : from
    for (const n of [from, to]) {
      if (n < 1 || n > pageCount) throw new Error(`Page ${n} doesn’t exist. This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.`)
    }
    const step = from <= to ? 1 : -1
    return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from - 1 + i * step)
  })
}

export const normalizeAngle = (a: number) => ((Math.round(a / 90) * 90) % 360 + 360) % 360

export type Box = { x: number; y: number; width: number; height: number }

/** Width and height as the page is displayed, after its /Rotate. */
export const visualSize = (box: Box, rotation: number) =>
  rotation % 180 ? { w: box.height, h: box.width } : { w: box.width, h: box.height }

/**
 * Maps a point in displayed-page coordinates (origin bottom-left, y up) to
 * PDF user space for a page with the given /Rotate (clockwise, 0/90/180/270).
 * Drawing at the mapped point with `rotate = angle + rotation` looks upright.
 */
export function toUser(box: Box, rotation: number, vx: number, vy: number) {
  const { x, y, width: w, height: h } = box
  switch (normalizeAngle(rotation)) {
    case 90:
      return { x: x + w - vy, y: y + vx }
    case 180:
      return { x: x + w - vx, y: y + h - vy }
    case 270:
      return { x: x + vy, y: y + h - vx }
    default:
      return { x: x + vx, y: y + vy }
  }
}

/** Bottom-left origin that centres a w×h box on (cx, cy) when rotated by `deg`. */
export function centredOrigin(cx: number, cy: number, w: number, h: number, deg: number) {
  const r = (deg * Math.PI) / 180
  return {
    x: cx - (w / 2) * Math.cos(r) + (h / 2) * Math.sin(r),
    y: cy - (w / 2) * Math.sin(r) - (h / 2) * Math.cos(r),
  }
}

export type NumberFormat = 'n' | 'n-of-total' | 'page-n-of-total'

export const NUMBER_FORMATS: [NumberFormat, string][] = [
  ['n', '1'],
  ['n-of-total', '1 / 9'],
  ['page-n-of-total', 'Page 1 of 9'],
]

export function pageLabel(format: NumberFormat, n: number, total: number) {
  if (format === 'n-of-total') return `${n} / ${total}`
  if (format === 'page-n-of-total') return `Page ${n} of ${total}`
  return String(n)
}

/** JPEG EXIF orientation (1–8), or 1 when absent. Only the first APP1 segment is read. */
export function jpegOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1
  let i = 2
  while (i + 4 < b.length && b[i] === 0xff) {
    const marker = b[i + 1]
    const len = (b[i + 2] << 8) | b[i + 3]
    if (marker === 0xe1 && String.fromCharCode(...b.subarray(i + 4, i + 8)) === 'Exif') {
      const t = i + 10 // TIFF header
      const le = b[t] === 0x49
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1])
      const u32 = (o: number) => (le ? u16(o) | (u16(o + 2) << 16) : (u16(o) << 16) | u16(o + 2))
      const ifd = t + u32(t + 4)
      for (let e = 0, n = u16(ifd); e < n; e++) {
        const entry = ifd + 2 + e * 12
        if (u16(entry) === 0x0112) return u16(entry + 8) || 1
      }
      return 1
    }
    if (marker === 0xda) break // image data starts; no EXIF ahead
    i += 2 + len
  }
  return 1
}
